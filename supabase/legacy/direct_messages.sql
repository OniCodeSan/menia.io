-- =====================================================================
-- Tokaro.fans — direct_messages (DM tra utenti)
-- Idempotente. Eseguire dopo schema.sql.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dm_sender ON public.direct_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_receiver ON public.direct_messages(receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_conversation ON public.direct_messages(
  LEAST(sender_id, receiver_id),
  GREATEST(sender_id, receiver_id),
  created_at DESC
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dm_select_own" ON public.direct_messages;
CREATE POLICY "dm_select_own" ON public.direct_messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "dm_insert_sender" ON public.direct_messages;
CREATE POLICY "dm_insert_sender" ON public.direct_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "dm_update_read" ON public.direct_messages;
CREATE POLICY "dm_update_read" ON public.direct_messages
  FOR UPDATE USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
