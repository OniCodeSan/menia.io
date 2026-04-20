-- =====================================================================
-- Tokaro.fans — schema Supabase
-- Eseguire nell'SQL Editor del progetto Supabase (idempotente).
-- Richiede estensione pgcrypto per gen_random_uuid (già abilitata).
--
-- NOTE DI SICUREZZA:
-- - Le policy wallet/payout permettono all'owner di modificare il balance
--   direttamente lato client. È accettabile per una demo, NON per produzione:
--   in prod topup e payout devono passare da una edge function che usa
--   service_role (vedi webhook Stripe + funzione approvePayout).
-- - La sezione storage.buckets e le policy su storage.objects richiedono
--   service_role per essere eseguite: se il SQL Editor le rifiuta, crea
--   il bucket "media" dalla dashboard (Storage → New bucket, Public: ON).
-- =====================================================================

-- ---------- Profili utente ------------------------------------------------
-- auth.users (gestita da Supabase) → 1:1 con public.profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  handle text unique,
  bio text,
  avatar_url text,
  cover_url text,
  role text not null default 'fan' check (role in ('fan','creator','admin')),
  plan text not null default 'free',
  onboarding_complete boolean not null default false,
  notification_prefs jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);

-- ---------- Wallet token (utente + creator) ------------------------------
create table if not exists public.token_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_type text not null check (wallet_type in ('user','creator')),
  balance integer not null default 0,
  total_earned integer not null default 0,
  total_spent integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, wallet_type)
);

-- ---------- Movimenti token ----------------------------------------------
create table if not exists public.token_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_type text not null check (wallet_type in ('user','creator')),
  type text not null check (type in ('topup','spend','earn','refund','payout')),
  amount integer not null,
  description text,
  ref_id text,
  created_at timestamptz not null default now()
);

create index if not exists token_transactions_user_idx
  on public.token_transactions(user_id, wallet_type, created_at desc);

-- ---------- Richieste payout ---------------------------------------------
create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  token_amount integer not null,
  euro_amount numeric(10,2) not null,
  status text not null default 'pending'
    check (status in ('pending','processing','paid','rejected')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payout_requests_creator_idx
  on public.payout_requests(creator_id, created_at desc);

-- ---------- Segmentazione feed -------------------------------------------
create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  user_email text,
  segment text,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_behaviors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  creator_id text not null,
  views integer not null default 0,
  likes integer not null default 0,
  dwell_ms integer not null default 0,
  last_seen timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, creator_id)
);

create index if not exists content_behaviors_user_idx
  on public.content_behaviors(user_id);

-- ---------- Score creator -------------------------------------------------
create table if not exists public.creator_scores (
  id uuid primary key default gen_random_uuid(),
  creator_id text unique not null,
  display_name text,
  global_conversion_rate numeric(6,4) not null default 0,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists creator_scores_conv_idx
  on public.creator_scores(global_conversion_rate desc);

-- =====================================================================
-- Trigger: tocca updated_at su ogni UPDATE
-- =====================================================================
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  for t in select unnest(array[
    'profiles','token_wallets','payout_requests','user_profiles','content_behaviors'
  ]) loop
    execute format('drop trigger if exists touch_%I on public.%I', t, t);
    execute format('create trigger touch_%I before update on public.%I
                    for each row execute procedure public.touch_updated_at()', t, t);
  end loop;
end $$;

-- =====================================================================
-- Trigger: quando un utente si registra, crea profilo + wallet user
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, onboarding_complete)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'role','fan'),
    coalesce((new.raw_user_meta_data->>'role') = 'fan', true)
  )
  on conflict (id) do nothing;

  insert into public.token_wallets (user_id, wallet_type, balance, total_earned, total_spent)
  values (new.id, 'user', 0, 0, 0)
  on conflict (user_id, wallet_type) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles            enable row level security;
alter table public.token_wallets       enable row level security;
alter table public.token_transactions  enable row level security;
alter table public.payout_requests     enable row level security;
alter table public.user_profiles       enable row level security;
alter table public.content_behaviors   enable row level security;
alter table public.creator_scores      enable row level security;

-- profiles: lettura pubblica (serve per pagina creator), update solo il proprietario
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- wallet: solo il proprietario legge/scrive (topUp reale dovrà passare dal webhook)
drop policy if exists "wallets_owner_all" on public.token_wallets;
create policy "wallets_owner_all" on public.token_wallets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- transactions: solo il proprietario
drop policy if exists "tx_owner_all" on public.token_transactions;
create policy "tx_owner_all" on public.token_transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- payout: solo il creator proprietario
drop policy if exists "payouts_owner_all" on public.payout_requests;
create policy "payouts_owner_all" on public.payout_requests
  for all using (auth.uid() = creator_id) with check (auth.uid() = creator_id);

-- user_profiles / content_behaviors: solo il proprietario
drop policy if exists "user_profiles_owner_all" on public.user_profiles;
create policy "user_profiles_owner_all" on public.user_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "behaviors_owner_all" on public.content_behaviors;
create policy "behaviors_owner_all" on public.content_behaviors
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- creator_scores: lettura pubblica (feed), scrittura solo service_role
drop policy if exists "creator_scores_read" on public.creator_scores;
create policy "creator_scores_read" on public.creator_scores
  for select using (true);

-- =====================================================================
-- Storage buckets
-- =====================================================================
-- Eseguire dall'UI Storage oppure:
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- policy: chiunque autenticato può caricare in media/<uid>/...
drop policy if exists "media_owner_insert" on storage.objects;
create policy "media_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "media_owner_update" on storage.objects;
create policy "media_owner_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "media_public_read" on storage.objects;
create policy "media_public_read" on storage.objects
  for select using (bucket_id = 'media');
