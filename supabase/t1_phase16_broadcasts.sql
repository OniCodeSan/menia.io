-- =====================================================================
-- Phase 16 — Broadcasts: messaggi 1-to-many dal creator ai suoi follower.
-- Il fan-out scrive righe in `notifications` (tabella esistente).
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.broadcasts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  body            text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  recipient_count integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS broadcasts_sender_idx
  ON public.broadcasts(sender_id, created_at DESC);

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "broadcasts_select_own" ON public.broadcasts;
CREATE POLICY "broadcasts_select_own" ON public.broadcasts
  FOR SELECT USING (sender_id = auth.uid());

-- UNIQUE su follows (anti duplicati)
ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_unique;
ALTER TABLE public.follows ADD CONSTRAINT follows_unique UNIQUE (fan_id, creator_id);

-- Index per cursor pagination del fan-out
CREATE INDEX IF NOT EXISTS follows_creator_fan_idx
  ON public.follows(creator_id, fan_id);
