-- =====================================================================
-- Tokaro.fans — Admin role + policy di lettura globale
-- Eseguire DOPO schema.sql dall'SQL Editor di Supabase.
-- Idempotente: può essere rieseguito senza effetti collaterali.
-- =====================================================================

-- ---------- Helper: is_admin() -------------------------------------------
-- Restituisce true se l'utente passato (default auth.uid()) ha role='admin'
-- in profiles. Security definer + search_path fisso per evitare bypass via
-- profile temporanei.
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = uid),
    false
  );
$$;

grant execute on function public.is_admin(uuid) to authenticated, anon;

-- ---------- Policy admin-read su tutte le tabelle ------------------------
-- I proprietari continuano ad avere accesso grazie alle policy esistenti.
-- Queste policy aggiuntive permettono agli admin di leggere tutto.

drop policy if exists "wallets_admin_read" on public.token_wallets;
create policy "wallets_admin_read" on public.token_wallets
  for select using (public.is_admin());

drop policy if exists "tx_admin_read" on public.token_transactions;
create policy "tx_admin_read" on public.token_transactions
  for select using (public.is_admin());

drop policy if exists "payouts_admin_read" on public.payout_requests;
create policy "payouts_admin_read" on public.payout_requests
  for select using (public.is_admin());

drop policy if exists "user_profiles_admin_read" on public.user_profiles;
create policy "user_profiles_admin_read" on public.user_profiles
  for select using (public.is_admin());

drop policy if exists "behaviors_admin_read" on public.content_behaviors;
create policy "behaviors_admin_read" on public.content_behaviors
  for select using (public.is_admin());

-- creator_scores è già lettura pubblica (feed), nessuna policy aggiuntiva.
-- profiles è già lettura pubblica, nessuna policy aggiuntiva.

-- ---------- Come promuovere un utente ad admin ---------------------------
-- 1. L'utente deve prima registrarsi normalmente (via /fan-login o signup).
-- 2. Dall'SQL Editor con service_role esegui:
--
--    update public.profiles
--    set role = 'admin', updated_at = now()
--    where email = 'TUO_EMAIL_QUI';
--
-- 3. Al prossimo login il client caricherà role='admin' e AuthGuard
--    sbloccherà /admin-console.
