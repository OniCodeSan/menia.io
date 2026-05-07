-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  ref_id text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_own" ON public.notifications;
CREATE POLICY "notifications_own" ON public.notifications
  FOR ALL USING (auth.uid() = user_id);

-- Reshares table
CREATE TABLE IF NOT EXISTS public.reshares (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_reshares_user ON public.reshares(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reshares_post ON public.reshares(post_id);

ALTER TABLE public.reshares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reshares_read" ON public.reshares;
CREATE POLICY "reshares_read" ON public.reshares
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "reshares_own_write" ON public.reshares;
CREATE POLICY "reshares_own_write" ON public.reshares
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reshares_own_delete" ON public.reshares;
CREATE POLICY "reshares_own_delete" ON public.reshares
  FOR DELETE USING (auth.uid() = user_id);
