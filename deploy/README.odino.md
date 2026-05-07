# Odino — admin control center per Menia.io

Dashboard admin isolata su `odino.menia.io`, build separato dal frontend pubblico.

## Architettura

- **Frontend**: build Vite indipendente (`npm run build:admin` → `dist-admin/`)
- **Backend**: condivide il processo Node già attivo (`menia-api` su `127.0.0.1:3001`), espone `/api/admin/*`
- **Auth**: Supabase Auth (email+password o Google OAuth) + check `role=admin` lato backend
- **Whitelist email** (frontend): `VITE_ADMIN_ALLOWED_EMAILS`, `VITE_ADMIN_ALLOWED_DOMAINS`
- **Ingress**: nginx vhost dedicato `odino.menia.io` con TLS Let's Encrypt

## Endpoint backend dedicati

| Method | Path | Scopo |
|--------|------|-------|
| GET | `/api/admin/dashboard/business` | Iscritti, incassi (split per ruolo), pacchetti, abbonamenti chiusi |
| GET | `/api/admin/dashboard/courses-performance` | Top corsi, acquistati-non-aperti, zero performance |
| POST | `/api/admin/notifications/segment` | Broadcast a `target_role=fan/creator/all` o `target_user_ids[]` |
| GET | `/api/admin/system/resources` | CPU/RAM/disk/load + alert predittivi |
| GET | `/api/admin/system/load` | req/s, p50/p95/p99 latency, error rate (window 5 min) |
| GET | `/api/admin/health` | Health checks |
| GET | `/api/admin/metrics/signups` | Andamento iscrizioni |

Esistenti riusati: `/api/admin/users`, `/api/admin/audit-log`, `/api/admin/grant-*`, `/api/admin/revoke-*`.

## Deploy procedure

### Sul tuo dev box (locale)

```bash
cd /Volumes/Maxtor/Tokaro/unlockly
npm run build:admin
```

### Sul server menia (178.104.218.61)

**Pre-requisito**: SSH funzionante.

```bash
# 1. Crea directory
ssh root@178.104.218.61 'mkdir -p /var/www/odino.menia.io'

# 2. Copia bundle
rsync -av --delete dist-admin/ root@178.104.218.61:/var/www/odino.menia.io/

# 3. Nginx vhost
scp deploy/odino.menia.io.nginx.conf \
    root@178.104.218.61:/etc/nginx/sites-available/odino.menia.io

ssh root@178.104.218.61 '
  ln -sf /etc/nginx/sites-available/odino.menia.io /etc/nginx/sites-enabled/
  # Assicurati che la zona limit_req sia in /etc/nginx/nginx.conf:
  grep -q odino_zone /etc/nginx/nginx.conf || \
    sed -i "/http {/a\\    limit_req_zone \\$binary_remote_addr zone=odino_zone:10m rate=60r/m;" /etc/nginx/nginx.conf
  nginx -t && systemctl reload nginx
'

# 4. Certificato TLS (Let's Encrypt)
ssh root@178.104.218.61 'certbot --nginx -d odino.menia.io --redirect --hsts --staple-ocsp -n --agree-tos -m cotugnomariano@gmail.com'
```

### Variabili ambiente build

Crea `.env.admin` (build-time, non runtime):

```
VITE_API_BASE=/api
VITE_ADMIN_ALLOWED_EMAILS=cotugnomariano@gmail.com
VITE_ADMIN_ALLOWED_DOMAINS=menia.io
```

Poi: `npx vite build --config vite.admin.config.js --mode admin` se vuoi caricarle.

## Sicurezza

| Layer | Stato |
|-------|-------|
| HTTPS only + HSTS preload | ✅ via nginx config |
| CSP enforced (no unsafe-inline JS) | ✅ in `index.admin.html` |
| `X-Robots-Tag: noindex` | ✅ |
| `X-Frame-Options: DENY` | ✅ |
| Rate limit 60 req/min | ✅ via nginx `limit_req` |
| IP allowlist | ⏸️ commentato — abilitare dopo se serve |
| Audit log automatico | ✅ ogni POST critico |
| Auth: email+pwd | ✅ |
| Auth: Google OAuth | ⏸️ richiede attivazione provider su Supabase Dashboard |
| 2FA TOTP enforcement | ⏸️ TODO |
| Role check `admin` | ✅ frontend + backend (`requireAdminJWT`) |

## TODO post-deploy

1. **Google OAuth**: abilita provider su Supabase Dashboard → Authentication → Providers → Google
   - Authorized redirect URI: `https://tqtqrzhmyaxsosgttzoa.supabase.co/auth/v1/callback`
   - Client ID/Secret da Google Cloud Console
   - Dopo l'attivazione, il bottone "Accedi con Google" funziona out-of-the-box
2. **2FA TOTP**: abilita su Supabase + enforcement frontend
3. **CSP report-only** lato backend (Express) per il dominio principale menia.io
