-- =====================================================================
-- Phase 17 — Index per query notifiche (badge + lista paginata).
-- =====================================================================

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications(user_id, read)
  WHERE read = false;
