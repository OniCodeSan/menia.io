#!/usr/bin/env bash
# =============================================================================
# Menia.io smoke test — verifica disponibilità endpoint critici post-deploy.
# Usage:
#   ./scripts/smoke.sh                  # default: production (https://menia.io)
#   ./scripts/smoke.sh http://localhost:5173   # dev
#
# Ritorna exit 0 se tutto OK, 1 al primo fallimento.
# Niente dipendenze oltre a curl. Pensato per CI semplice o post-deploy hook.
# =============================================================================
set -euo pipefail

BASE="${1:-https://menia.io}"
FAIL=0
PASS=0

# Colori solo se TTY (CI no)
if [ -t 1 ]; then
  G=$'\e[32m'; R=$'\e[31m'; Y=$'\e[33m'; N=$'\e[0m'
else
  G=""; R=""; Y=""; N=""
fi

check() {
  local name="$1" url="$2" expected="$3"
  local actual
  actual=$(curl -s -o /dev/null -w "%{http_code}" -L --max-time 8 "$url" || echo "000")
  if [ "$actual" = "$expected" ]; then
    printf "%s ✓ %s%s  %s → %s\n" "$G" "$name" "$N" "$url" "$actual"
    PASS=$((PASS+1))
  else
    printf "%s ✗ %s%s  %s → %s (atteso %s)\n" "$R" "$name" "$N" "$url" "$actual" "$expected"
    FAIL=$((FAIL+1))
  fi
}

contains() {
  local name="$1" url="$2" needle="$3"
  local body
  body=$(curl -s -L --max-time 8 "$url" || echo "")
  if echo "$body" | grep -q -F "$needle"; then
    printf "%s ✓ %s%s  contiene '%s'\n" "$G" "$name" "$N" "$needle"
    PASS=$((PASS+1))
  else
    printf "%s ✗ %s%s  '%s' non trovato\n" "$R" "$name" "$N" "$needle"
    FAIL=$((FAIL+1))
  fi
}

echo "${Y}=== Menia smoke test → $BASE${N}"

# Pagine pubbliche (statiche, SPA fallback su index.html)
check "home"             "$BASE/"                 200
check "courses"          "$BASE/courses"          200
check "pricing"          "$BASE/pricing"          200
check "trainer"          "$BASE/trainer"          200
check "student-login"    "$BASE/student-login"    200
check "trainer-login"    "$BASE/trainer-login"    200
check "terms"            "$BASE/terms"            200
check "privacy"          "$BASE/privacy"          200
check "cookie-policy"    "$BASE/cookie-policy"    200

# SPA: ogni rotta sconosciuta deve servire index.html (200), non 404
check "deeplink-route"   "$BASE/student-dashboard" 200

# Brand sanity
contains "title-Menia"   "$BASE/"                 "Menia.io"

# API: un endpoint che NON richiede auth deve rispondere
# /api/plans è pubblico (lista piani formatori)
check "api-plans"        "$BASE/api/plans"         200

# /api/billing/me/subscription è auth-required → 401 senza token
check "api-billing-401"  "$BASE/api/billing/me/subscription" 401

# Live feature disabilitata → redirect (302) o 200 se SPA
check "live-redirect"    "$BASE/live/abc"          200

echo ""
if [ "$FAIL" -eq 0 ]; then
  printf "%s%d/%d passed%s\n" "$G" "$PASS" "$((PASS+FAIL))" "$N"
  exit 0
else
  printf "%s%d/%d passed — %d failed%s\n" "$R" "$PASS" "$((PASS+FAIL))" "$FAIL" "$N"
  exit 1
fi
