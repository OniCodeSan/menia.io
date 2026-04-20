-- =====================================================================
-- Tokaro.fans — tabella posts (contenuti pubblicati dai creator)
-- Eseguire dopo schema.sql. Idempotente.
-- =====================================================================

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('post','video','photo')),
  access text not null check (access in ('public','subscribers','premium')),
  title text not null,
  description text,
  media_url text,
  media_path text,
  price numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_creator_created_idx
  on public.posts(creator_id, created_at desc);

create index if not exists posts_access_created_idx
  on public.posts(access, created_at desc);

-- touch updated_at (ricreato inline per non dipendere dall'ordine con schema.sql)
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_posts on public.posts;
create trigger touch_posts before update on public.posts
  for each row execute procedure public.touch_updated_at();

-- RLS
alter table public.posts enable row level security;

-- lettura pubblica: il feed mostra tutto, il gating access è lato app
drop policy if exists "posts_select_all" on public.posts;
create policy "posts_select_all" on public.posts
  for select using (true);

-- insert: solo se il creator_id corrisponde all'utente autenticato
drop policy if exists "posts_insert_own" on public.posts;
create policy "posts_insert_own" on public.posts
  for insert with check (auth.uid() = creator_id);

-- update/delete: solo l'owner
drop policy if exists "posts_update_own" on public.posts;
create policy "posts_update_own" on public.posts
  for update using (auth.uid() = creator_id) with check (auth.uid() = creator_id);

drop policy if exists "posts_delete_own" on public.posts;
create policy "posts_delete_own" on public.posts
  for delete using (auth.uid() = creator_id);
