# Menia.io

Piattaforma di formazione online italiana: corsi pratici, community e formatori indipendenti.
Modello: studenti pagano €0,99/mese platform-wide; formatori pagano un piano tier (Base €4,99 / Starter €14,90 / Grow €29,90 / Master custom).

Production: https://menia.io
API: https://menia.io/api (proxy nginx → 127.0.0.1:3001)

---

## Stack

**Frontend** (`src/`, `index.html`, `vite.config.js`)
- React 18 + Vite + React Router (rotte lazy)
- Tailwind CSS, Radix UI primitives, lucide-react
- React Query per cache su `/api/billing/me/subscription`
- Sentry, react-helmet-async, framer-motion

**Backend** (`server/`)
- Express, Supabase service-role
- Stripe (subscription billing + webhook idempotency)
- Resend (email transazionali)
- node-cron (GDPR retention, KPI snapshot, trial expiration)

**Database**
- Supabase Postgres con RLS
- Migration in `supabase/*.sql` (numerate per fase)

**Deploy**
- Hetzner CAX21 ARM64 (`178.104.218.61`) → `live.menia.io` per API, `menia.io` per frontend
- Systemd: `menia-api.service`
- Nginx: site `menia` (statico) + reverse-proxy `/api` → 3001
- Frontend statico in `/opt/menia-fans/html`, server Node in `/opt/menia-server/app`

---

## Setup locale

```bash
# 1. Clone + install
git clone <repo> menia
cd menia
npm install

# 2. Frontend env
cp .env.example .env.local
# riempi VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (Supabase Dashboard → API)

# 3. Server env
cp server/.env.example server/.env
# riempi SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_*, ADMIN_SECRET, RESEND_API_KEY

# 4. Avvio dev
npm run dev          # frontend Vite su http://localhost:5173
node server/index.js # API server su http://localhost:3001
```

Vite proxa automaticamente `/api/*` → `localhost:3001`.

---

## Comandi

| | |
|---|---|
| `npm run dev` | dev server con HMR |
| `npm run build` | build produzione in `dist/` |
| `npm run preview` | preview del build |
| `node server/index.js` | API server |

---

## Architettura — punti chiave

**Auth flow**: `src/lib/auth.js` + `AuthContext.jsx` — la session è letta sincrono da `localStorage["menia:sb"]` al primo render (lazy initializer in `useState`) per evitare la deadlock di `_recoverAndRefresh` che await-a tutti i listener `onAuthStateChange`. Vedi `readSyncSessionUser`.

**Subscription model**: due flow distinti gestiti dallo stesso webhook Stripe (`server/billing.js`):
- `metadata.kind === "platform"` → studente €0,99/mese
- `metadata.kind === "creator_plan"` → piano formatore

Webhook idempotente via tabella `webhook_events` (deduplica su `event.id`).

**Vendor chunking** (`vite.config.js`): `vendor-react`, `vendor-supabase`, `vendor-router`, `vendor-icons`, `vendor-query`, `vendor-helmet` sono pre-caricati. `vendor-motion` e `vendor-sentry` sono filtrati dal `modulePreload` per ridurre il critical path (~110KB risparmiati al cold start).

**Live feature**: attualmente disabilitata in UI. Codice (`server/live-events.js`, `LiveRoom.jsx`, `LiveSection.jsx`, ecc.) presente ma orfano — riattivabile riattivando le rotte in `src/App.jsx`.

---

## Variabili d'ambiente critiche

Vedi `.env.example` (frontend) e `server/.env.example` (backend). I valori più sensibili:

| Variabile | Dove | Cosa fa se manca |
|---|---|---|
| `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` | frontend | Build crash in produzione |
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | server | API risponde 500 a tutto |
| `STRIPE_SECRET_KEY` + `STRIPE_PRICE_ID` | server | Checkout in modalità mock (no addebiti reali) |
| `STRIPE_WEBHOOK_SECRET` | server | Webhook respinge tutti gli eventi |
| `ADMIN_SECRET` | server | Endpoint admin aperti a chiunque |
| `RESEND_API_KEY` | server | Niente email (signup welcome, password reset, ecc.) |
| `PRE_LAUNCH_MODE` | server | `true` blocca i pagamenti reali — in prod deve essere `false` |

---

## Database migrations

Le migration SQL stanno in `supabase/`. Sono numerate per fase (`t1_phase19_*`, `t1_phase20_*`, ecc.) e applicate manualmente via psql al pooler:

```bash
PGPASSWORD='...' psql -h aws-0-eu-west-1.pooler.supabase.com \
  -U postgres.tqtqrzhmyaxsosgttzoa -d postgres \
  -f supabase/t1_phaseXX_thing.sql
```

---

## Deploy

**Frontend**:
```bash
npm run build
rsync -rlt --delete --exclude='._*' \
  --chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r \
  -e "ssh -o StrictHostKeyChecking=no" \
  dist/ root@178.104.218.61:/opt/menia-fans/html/
ssh root@178.104.218.61 'chown -R www-data:www-data /opt/menia-fans/html'
```

**Backend**:
```bash
rsync -av --exclude='node_modules' --exclude='.env*' \
  server/ root@178.104.218.61:/opt/menia-server/app/
ssh root@178.104.218.61 'systemctl restart menia-api && journalctl -u menia-api -n 20'
```

**⚠️ Nota su rsync da macOS**: usa sempre `--exclude='._*'` per evitare i resource fork di macOS, e `--chmod=...` per evitare che i permessi locali (700) si propaghino al server (nginx leggerebbe 403).

---

## Memoria architetturale

Decisioni non ovvie documentate nei commenti del codice:
- `src/lib/auth.js` — perché `meFast()` legge localStorage direttamente
- `src/lib/auth.js` `onAuthChange` — perché `loadProfile` è dietro `setTimeout(0)` (deadlock fix)
- `src/components/messages/ConversationList.jsx` — perché 1 query globale invece di N+1
- `src/hooks/useAutosave.js` — perché `markDirty()` esplicito invece di euristica su `data`
- `src/lib/AuthContext.jsx` — perché `useState(readSyncSessionUser)` lazy initializer
- `vite.config.js` — perché `modulePreload.resolveDependencies` filtra motion+sentry
