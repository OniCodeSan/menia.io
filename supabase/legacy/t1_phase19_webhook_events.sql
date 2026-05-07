CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_type text NOT NULL,
  event_id text NOT NULL UNIQUE,
  payload jsonb,
  status text NOT NULL DEFAULT 'processed',
  processed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS webhook_events_event_id_idx ON public.webhook_events(event_id);
CREATE INDEX IF NOT EXISTS webhook_events_created_at_idx ON public.webhook_events(created_at DESC);
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
-- service_role bypasses RLS — no public policies needed (idempotency dedup is server-side only)

CREATE INDEX IF NOT EXISTS course_access_user_idx ON public.course_access(user_id);
