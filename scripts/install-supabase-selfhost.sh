#!/usr/bin/env bash
# =============================================================================
# Installa Supabase self-hosted su Ubuntu 24.04 (testato su Hetzner cx33).
#
# Uso:
#   1. Copia sul server:  scp scripts/install-supabase-selfhost.sh root@IP:/root/
#   2. Connettiti:        ssh root@IP
#   3. Esegui:            bash /root/install-supabase-selfhost.sh
#
# ATTENZIONE: senza HTTPS le credenziali viaggiano in chiaro.
# Usare SOLO per test finché non viene aggiunto un reverse proxy con TLS
# (Caddy/Traefik). Protezione networking: configurare Hetzner Cloud Firewall
# per consentire solo le porte 22 e 8000.
# =============================================================================
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Eseguire come root (sudo)." >&2
  exit 1
fi

SUPABASE_DIR="/opt/supabase"
SECRETS_FILE="/root/supabase-secrets.txt"
PUBLIC_IP="${PUBLIC_IP:-$(curl -fsSL https://ifconfig.me 2>/dev/null || echo 127.0.0.1)}"

if [[ -f "$SECRETS_FILE" ]]; then
  echo "ERRORE: $SECRETS_FILE esiste già — lo stack sembra già installato." >&2
  echo "Per rifare da zero:" >&2
  echo "  cd $SUPABASE_DIR/supabase/docker && docker compose down -v" >&2
  echo "  rm -rf $SUPABASE_DIR $SECRETS_FILE" >&2
  exit 1
fi

echo "[1/6] Installo prerequisiti..."
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq git python3 curl openssl

if ! command -v docker >/dev/null; then
  echo "ERRORE: docker non trovato. Installalo prima di eseguire lo script." >&2
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "ERRORE: 'docker compose' plugin non disponibile. Installa docker-compose-plugin." >&2
  exit 1
fi

echo "[2/6] Clono supabase/supabase in $SUPABASE_DIR..."
mkdir -p "$SUPABASE_DIR"
if [[ ! -d "$SUPABASE_DIR/supabase" ]]; then
  git clone --depth 1 https://github.com/supabase/supabase.git "$SUPABASE_DIR/supabase"
fi
cd "$SUPABASE_DIR/supabase/docker"
cp -n .env.example .env

echo "[3/6] Genero credenziali..."
JWT_SECRET=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -hex 24)
DASHBOARD_PASSWORD=$(openssl rand -hex 16)
SECRET_KEY_BASE=$(openssl rand -hex 32)
VAULT_ENC_KEY=$(openssl rand -hex 16)

gen_jwt() {
  local role="$1"
  python3 - "$JWT_SECRET" "$role" <<'PY'
import sys, hmac, hashlib, json, base64, time
secret, role = sys.argv[1].encode(), sys.argv[2]
def b64(x):
    return base64.urlsafe_b64encode(json.dumps(x, separators=(",", ":")).encode()).rstrip(b"=").decode()
header = {"alg": "HS256", "typ": "JWT"}
now = int(time.time())
payload = {"role": role, "iss": "supabase", "iat": now, "exp": now + 10 * 365 * 24 * 3600}
msg = b64(header) + "." + b64(payload)
sig = base64.urlsafe_b64encode(hmac.new(secret, msg.encode(), hashlib.sha256).digest()).rstrip(b"=").decode()
print(msg + "." + sig)
PY
}

ANON_KEY=$(gen_jwt anon)
SERVICE_ROLE_KEY=$(gen_jwt service_role)

echo "[4/6] Configuro .env..."
set_env() {
  local key="$1" value="$2"
  if grep -q "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${value}|" .env
  else
    echo "${key}=${value}" >> .env
  fi
}

set_env POSTGRES_PASSWORD        "$POSTGRES_PASSWORD"
set_env JWT_SECRET               "$JWT_SECRET"
set_env ANON_KEY                 "$ANON_KEY"
set_env SERVICE_ROLE_KEY         "$SERVICE_ROLE_KEY"
set_env DASHBOARD_USERNAME       "tokaro"
set_env DASHBOARD_PASSWORD       "$DASHBOARD_PASSWORD"
set_env SECRET_KEY_BASE          "$SECRET_KEY_BASE"
set_env VAULT_ENC_KEY            "$VAULT_ENC_KEY"
set_env API_EXTERNAL_URL         "http://${PUBLIC_IP}:8000"
set_env SUPABASE_PUBLIC_URL      "http://${PUBLIC_IP}:8000"
set_env SITE_URL                 "http://localhost:5173"
set_env ENABLE_EMAIL_SIGNUP      "true"
set_env ENABLE_EMAIL_AUTOCONFIRM "true"

# Override: non esporre Postgres né il pooler sulle interfacce pubbliche.
cat > docker-compose.override.yml <<'YML'
services:
  db:
    ports: []
  supavisor:
    ports: []
YML

echo "[5/6] docker compose pull && up -d (può richiedere alcuni minuti)..."
docker compose pull --quiet
docker compose up -d

echo "[6/6] Attendo boot servizi..."
for i in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:8000/rest/v1/" -H "apikey: ${ANON_KEY}" -o /dev/null 2>&1; then
    break
  fi
  sleep 3
done

docker compose ps

# Configura ufw se attivo
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
  ufw allow 22/tcp   || true
  ufw allow 8000/tcp || true
fi

# Salva credenziali in file protetto
umask 077
cat > "$SECRETS_FILE" <<EOF
Supabase self-hosted — $(date -Iseconds)
================================================================

URL API (Kong):    http://${PUBLIC_IP}:8000
Studio dashboard:  http://${PUBLIC_IP}:8000
  username:        tokaro
  password:        ${DASHBOARD_PASSWORD}

ANON_KEY (pubblica, usata dal frontend):
${ANON_KEY}

SERVICE_ROLE_KEY (SEGRETA — NON condividere, bypassa RLS):
${SERVICE_ROLE_KEY}

JWT_SECRET (SEGRETA — usata per firmare i JWT):
${JWT_SECRET}

POSTGRES_PASSWORD (SEGRETA):
${POSTGRES_PASSWORD}

================================================================
Per eseguire lo schema Tokaro (dopo aver caricato il file sul server):
  cd ${SUPABASE_DIR}/supabase/docker
  docker compose exec -T db psql -U postgres -d postgres < /root/tokaro-schema.sql

Per aggiornare lo stack:
  cd ${SUPABASE_DIR}/supabase/docker
  docker compose pull && docker compose up -d

Per vedere i log:
  cd ${SUPABASE_DIR}/supabase/docker
  docker compose logs -f

Per fermare tutto:
  cd ${SUPABASE_DIR}/supabase/docker
  docker compose down
EOF

chmod 600 "$SECRETS_FILE"

echo
echo "================================================================"
echo "INSTALLAZIONE COMPLETATA"
echo "Credenziali salvate in: $SECRETS_FILE  (chmod 600)"
echo
echo "PROSSIMI PASSI:"
echo "  1. Configura Hetzner Cloud Firewall per consentire SOLO 22 e 8000"
echo "  2. Carica lo schema Tokaro sul server e applicalo (vedi istruzioni in $SECRETS_FILE)"
echo "  3. Condividi con lo sviluppatore frontend SOLO:"
echo "       - URL API:  http://${PUBLIC_IP}:8000"
echo "       - ANON_KEY (la prima chiave nel file)"
echo "     NON condividere SERVICE_ROLE_KEY / JWT_SECRET / POSTGRES_PASSWORD."
echo "================================================================"
