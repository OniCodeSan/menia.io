-- =====================================================================
-- Tokaro.fans — post_likes + post_comments
-- Idempotente. Eseguire dopo posts.sql.
-- =====================================================================

-- LIKES
create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists post_likes_unique
  on public.post_likes(post_id, user_id);

create index if not exists post_likes_post_idx
  on public.post_likes(post_id);

alter table public.post_likes enable row level security;

drop policy if exists "likes_select_all" on public.post_likes;
create policy "likes_select_all" on public.post_likes
  for select using (true);

drop policy if exists "likes_insert_own" on public.post_likes;
create policy "likes_insert_own" on public.post_likes
  for insert with check (auth.uid() = user_id);

drop policy if exists "likes_delete_own" on public.post_likes;
create policy "likes_delete_own" on public.post_likes
  for delete using (auth.uid() = user_id);

-- COMMENTS
create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists post_comments_post_idx
  on public.post_comments(post_id, created_at asc);

drop trigger if exists touch_post_comments on public.post_comments;
create trigger touch_post_comments before update on public.post_comments
  for each row execute procedure public.touch_updated_at();

alter table public.post_comments enable row level security;

drop policy if exists "comments_select_all" on public.post_comments;
create policy "comments_select_all" on public.post_comments
  for select using (true);

drop policy if exists "comments_insert_own" on public.post_comments;
create policy "comments_insert_own" on public.post_comments
  for insert with check (auth.uid() = user_id);

drop policy if exists "comments_update_own" on public.post_comments;
create policy "comments_update_own" on public.post_comments
  for update using (auth.uid() = user_id);

drop policy if exists "comments_delete_own" on public.post_comments;
create policy "comments_delete_own" on public.post_comments
  for delete using (auth.uid() = user_id);

-- Contatori denormalizzati su posts per performance feed
alter table public.posts add column if not exists likes_count integer not null default 0;
alter table public.posts add column if not exists comments_count integer not null default 0;

-- Trigger: aggiorna likes_count su insert/delete
create or replace function public.update_post_likes_count()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set likes_count = likes_count + 1 where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.posts set likes_count = greatest(likes_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_post_likes_count on public.post_likes;
create trigger trg_post_likes_count
  after insert or delete on public.post_likes
  for each row execute procedure public.update_post_likes_count();

-- Trigger: aggiorna comments_count su insert/delete
create or replace function public.update_post_comments_count()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comments_count = comments_count + 1 where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.posts set comments_count = greatest(comments_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_post_comments_count on public.post_comments;
create trigger trg_post_comments_count
  after insert or delete on public.post_comments
  for each row execute procedure public.update_post_comments_count();
