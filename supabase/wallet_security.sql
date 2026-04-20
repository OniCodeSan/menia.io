-- =====================================================================
-- Tokaro.fans — Wallet security hardening
-- Stored procedures per topUp/spend + RLS blindatura
-- =====================================================================

-- Assicura RLS su token_wallets
alter table public.token_wallets enable row level security;

-- Policy: utente vede solo il proprio wallet
drop policy if exists "wallets_select_own" on public.token_wallets;
create policy "wallets_select_own" on public.token_wallets
  for select using (auth.uid() = user_id);

-- Policy: utente può creare solo il proprio wallet
drop policy if exists "wallets_insert_own" on public.token_wallets;
create policy "wallets_insert_own" on public.token_wallets
  for insert with check (auth.uid() = user_id);

-- BLOCCA update/delete diretti dal client
drop policy if exists "wallets_no_direct_update" on public.token_wallets;
-- Nessuna policy UPDATE = nessun update consentito via anon key

-- wallet_spend, wallet_topup, and wallet_request_payout are now defined
-- in monetization_system.sql with the correct signature and payout rate (0.10).
-- DO NOT redefine them here — monetization_system.sql is the source of truth.

-- RLS su token_transactions
alter table public.token_transactions enable row level security;

drop policy if exists "tx_select_own" on public.token_transactions;
create policy "tx_select_own" on public.token_transactions
  for select using (auth.uid() = user_id);

drop policy if exists "tx_no_direct_insert" on public.token_transactions;
-- Nessuna policy INSERT = nessun insert diretto dal client (solo via stored procedures)

-- RLS su payout_requests
alter table public.payout_requests enable row level security;

drop policy if exists "payouts_select_own" on public.payout_requests;
create policy "payouts_select_own" on public.payout_requests
  for select using (auth.uid() = creator_id);

-- Nessuna policy INSERT/UPDATE diretta — solo via stored procedure
