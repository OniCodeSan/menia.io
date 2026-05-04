-- Follows table: fan follows creator (free, no tokens)
create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  fan_id uuid not null references auth.users(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint follows_unique unique (fan_id, creator_id),
  constraint follows_no_self check (fan_id <> creator_id)
);

alter table public.follows enable row level security;

create policy "Users can see their own follows"
  on public.follows for select
  using (auth.uid() = fan_id);

create policy "Creators can see their followers"
  on public.follows for select
  using (auth.uid() = creator_id);

create policy "Users can follow creators"
  on public.follows for insert
  with check (auth.uid() = fan_id);

create policy "Users can unfollow"
  on public.follows for delete
  using (auth.uid() = fan_id);

create index follows_fan_idx on public.follows(fan_id);
create index follows_creator_idx on public.follows(creator_id);
