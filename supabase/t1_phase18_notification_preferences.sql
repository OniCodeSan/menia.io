-- =====================================================================
-- Phase 18 — Notification preferences + mute creator
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id uuid,
  type text NOT NULL,
  muted boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, creator_id, type)
);

CREATE INDEX IF NOT EXISTS notif_pref_user_idx
  ON public.notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS notif_pref_creator_idx
  ON public.notification_preferences(creator_id);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "np_select_own" ON public.notification_preferences;
CREATE POLICY "np_select_own" ON public.notification_preferences
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "np_insert_own" ON public.notification_preferences;
CREATE POLICY "np_insert_own" ON public.notification_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "np_update_own" ON public.notification_preferences;
CREATE POLICY "np_update_own" ON public.notification_preferences
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "np_delete_own" ON public.notification_preferences;
CREATE POLICY "np_delete_own" ON public.notification_preferences
  FOR DELETE USING (user_id = auth.uid());
