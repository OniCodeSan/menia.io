-- =====================================================================
-- Tokaro.fans — tabella subscriptions (abbonamenti fan→creator)
-- Idempotente. Eseguire dopo schema.sql.
-- =====================================================================

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  fan_id uuid not null references auth.users(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  tier text not null default 'base' check (tier in ('base','premium')),
  status text not null default 'active' check (status in ('active','cancelled','expired')),
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists subscriptions_fan_creator_idx
  on public.subscriptions(fan_id, creator_id) where status = 'active';

create index if not exists subscriptions_creator_idx
  on public.subscriptions(creator_id, status);

-- touch updated_at
drop trigger if exists touch_subscriptions on public.subscriptions;
create trigger touch_subscriptions before update on public.subscriptions
  for each row execute procedure public.touch_updated_at();

-- RLS
alter table public.subscriptions enable row level security;

drop policy if exists "subs_select_own" on public.subscriptions;
create policy "subs_select_own" on public.subscriptions
  for select using (auth.uid() = fan_id or auth.uid() = creator_id);

drop policy if exists "subs_insert_fan" on public.subscriptions;
create policy "subs_insert_fan" on public.subscriptions
  for insert with check (auth.uid() = fan_id);

drop policy if exists "subs_update_own" on public.subscriptions;
create policy "subs_update_own" on public.subscriptions
  for update using (auth.uid() = fan_id or auth.uid() = creator_id);

-- =====================================================================
-- Aggiorna la policy di lettura posts per rispettare access gating
-- =====================================================================

drop policy if exists "posts_select_all" on public.posts;
create policy "posts_select_gated" on public.posts
  for select using (
    access = 'public'
    or auth.uid() = creator_id
    or (
      access = 'subscribers'
      and exists (
        select 1 from public.subscriptions s
        where s.fan_id = auth.uid()
          and s.creator_id = posts.creator_id
          and s.status = 'active'
      )
    )
    or (
      access = 'premium'
      and exists (
        select 1 from public.subscriptions s
        where s.fan_id = auth.uid()
          and s.creator_id = posts.creator_id
          and s.status = 'active'
          and s.tier = 'premium'
      )
    )
  );
