-- =====================================================================
-- Tokaro.fans — Input validation e race condition fixes
-- =====================================================================

-- Post: limiti di lunghezza
alter table public.posts
  add constraint posts_title_length check (length(title) <= 300);

alter table public.posts
  add constraint posts_description_length check (length(description) <= 5000);

alter table public.posts
  add constraint posts_price_positive check (price is null or price >= 0);

-- Commenti: limite lunghezza body
alter table public.post_comments
  add constraint comments_body_length check (length(body) <= 2000);

-- Like: upsert atomico — il UNIQUE INDEX esiste già (post_likes_unique),
-- quindi un INSERT con ON CONFLICT è sufficiente per prevenire race condition.
-- Il toggle va gestito lato applicazione con DELETE + fallback INSERT.
