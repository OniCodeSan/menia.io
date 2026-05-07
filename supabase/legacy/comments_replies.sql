ALTER TABLE public.post_comments ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.post_comments(parent_id);
