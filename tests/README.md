# Menia E2E Tests

3 test critici Playwright. Se passano → puoi lanciare in produzione.

## Setup (one-time)

```bash
npm install
npx playwright install chromium
```

## Variabili d'ambiente richieste

I test creano fixtures via Supabase admin API. Servono:

```bash
export SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJ..."   # da server/.env
export SUPABASE_ANON_KEY="eyJ..."           # da .env.local (per login flow)
```

Opzionali:

```bash
export BASE_URL="https://menia.io"          # default: produzione
export API_URL="https://menia.io/api"       # default: derivato da BASE_URL
export STRIPE_WEBHOOK_SECRET="whsec_..."    # se settato, firma il webhook test;
                                            # senza, il server deve essere in mock mode
```

## Run

```bash
# Tutti i test
npx playwright test

# Singolo file
npx playwright test tests/auth.spec.ts

# Visualizza in browser headed
npx playwright test --headed

# Debug mode con inspector
npx playwright test --debug
```

## Cosa testano

### `auth.spec.ts` — Signup → Dashboard
1. Signup UI completo: form `/student-login?mode=register` → arriva in `/student-dashboard` con JWT in localStorage
2. Login con utente esistente (admin-provisioned) → dashboard

**Skip se** Supabase ha "Confirm email" ON (signup richiede conferma manuale).

### `checkout.spec.ts` — Webhook + idempotenza
1. POST `/api/billing/webhook` con event `checkout.session.completed` → `platform_subscriptions` diventa `active`
2. Replay dello stesso `event_id` → response `{deduped: true}`, no row duplicate in `webhook_events`

### `access.spec.ts` — FREE vs PAID gating
1. Utente FREE chiede `/api/courses/:id` → `has_access=false`, lezioni locked hanno `body: null`
2. Utente con `platform_subscriptions.status=active` → `has_access=true`, lezioni accessibili con `body` pieno

## Pulizia

I test creano utenti `e2e-*@menia.test` e li cancellano in `afterEach`/`afterAll`.
Se un test crasha a metà, controlla che non restino utenti orfani:

```sql
-- Su Supabase SQL editor
SELECT id, email FROM auth.users WHERE email LIKE 'e2e-%@menia.test' OR email LIKE 'signup-%@menia.test' OR email LIKE 'fan-%@menia.test';
DELETE FROM auth.users WHERE email LIKE '%@menia.test';
```

## Regola

> Se questi 3 test passano → puoi lanciare senza paura reale.
> Se uno fallisce → non sei pronto, punto.
