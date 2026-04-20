-- =====================================================================
-- Tokaro.fans — Moderation: reports + user status
-- Idempotente. Eseguire dopo schema.sql e admin.sql.
-- =====================================================================

-- ---------- profiles.status ----------------------------------------------
alter table public.profiles
  add column if not exists status text not null default 'active'
  check (status in ('active','warned','suspended','banned'));

-- ---------- user_reports --------------------------------------------------
create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  target_role text not null check (target_role in ('fan','creator','admin')),
  reason text not null check (reason in ('spam','harassment','scam','inappropriate','impersonation','other')),
  description text,
  context_type text,
  context_id text,
  status text not null default 'pending' check (status in ('pending','resolved','dismissed')),
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  action_taken text,
  created_at timestamptz not null default now()
);

create index if not exists user_reports_status_idx on public.user_reports(status, created_at desc);
create index if not exists user_reports_target_idx on public.user_reports(target_id);
create index if not exists user_reports_reporter_idx on public.user_reports(reporter_id);

alter table public.user_reports enable row level security;

-- Chi segnala vede solo i propri report
drop policy if exists "user_reports_owner_read" on public.user_reports;
create policy "user_reports_owner_read" on public.user_reports
  for select using (reporter_id = auth.uid());

-- Chiunque autenticato può creare un report (ma solo per sé stesso come reporter)
drop policy if exists "user_reports_insert" on public.user_reports;
create policy "user_reports_insert" on public.user_reports
  for insert with check (reporter_id = auth.uid());

-- Admin vede tutto
drop policy if exists "user_reports_admin_read" on public.user_reports;
create policy "user_reports_admin_read" on public.user_reports
  for select using (public.is_admin());

-- Admin può aggiornare (risolvere/dismiss)
drop policy if exists "user_reports_admin_update" on public.user_reports;
create policy "user_reports_admin_update" on public.user_reports
  for update using (public.is_admin()) with check (public.is_admin());

-- Admin può aggiornare status utenti tramite profiles (già coperto dalla policy esistente se c'è; altrimenti aggiungo)
drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());
