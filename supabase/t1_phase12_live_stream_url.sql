-- =====================================================================
-- Phase 12 — Live: stream_url for "Go live" flow.
-- Stores the external meeting/stream URL (Zoom, Meet, StreamYard, RTMP...)
-- that the creator opens when transitioning the live to status='live'.
-- =====================================================================

ALTER TABLE public.live_events
  ADD COLUMN IF NOT EXISTS stream_url text;
