-- =====================================================================
-- Phase 14 — Live chat room (pattern Tokaro originale).
-- La live è una stanza di chat in real-time, niente video, niente URL
-- esterni. Il creator clicca "Vai live", la stanza si apre, gli studenti
-- entrano e chattano. Donation rimosse (T1: niente token).
-- =====================================================================

-- Campi runtime sulla live_events
ALTER TABLE public.live_events
  ADD COLUMN IF NOT EXISTS viewer_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS started_at  timestamptz,
  ADD COLUMN IF NOT EXISTS ended_at    timestamptz;

-- Messaggi di chat
CREATE TABLE IF NOT EXISTS public.live_chat_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  live_id     uuid NOT NULL REFERENCES public.live_events(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message     text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 1000),
  type        text NOT NULL DEFAULT 'chat' CHECK (type IN ('chat','system')),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS live_chat_live_idx ON public.live_chat_messages(live_id, created_at);

ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;

-- Lettura: chiunque abbia accesso alla live può leggere la chat.
-- Accesso = creator OR ha riga in live_access OR la live è gratuita+pubblicata.
DROP POLICY IF EXISTS "live_chat_select_with_access" ON public.live_chat_messages;
CREATE POLICY "live_chat_select_with_access" ON public.live_chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.live_events e
      WHERE e.id = live_id
        AND (
             e.creator_id = auth.uid()
          OR EXISTS (
               SELECT 1 FROM public.live_access la
               WHERE la.live_event_id = e.id AND la.user_id = auth.uid()
             )
          OR (e.is_published = true AND COALESCE(e.price, 0) = 0)
        )
    )
  );

-- Inserimento: l'utente autenticato può inserire SOLO un messaggio per
-- proprio conto (user_id = auth.uid()) e SOLO se ha accesso alla live.
-- type='system' è riservato al server (service-role bypassa la policy).
DROP POLICY IF EXISTS "live_chat_insert_own_with_access" ON public.live_chat_messages;
CREATE POLICY "live_chat_insert_own_with_access" ON public.live_chat_messages
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND type = 'chat'
    AND EXISTS (
      SELECT 1 FROM public.live_events e
      WHERE e.id = live_id
        AND e.status = 'live'
        AND (
             e.creator_id = auth.uid()
          OR EXISTS (
               SELECT 1 FROM public.live_access la
               WHERE la.live_event_id = e.id AND la.user_id = auth.uid()
             )
          OR (e.is_published = true AND COALESCE(e.price, 0) = 0)
        )
    )
  );

-- Realtime: pubblica live_chat_messages così supabase-js può sottoscriversi
-- a INSERT in tempo reale. Su Supabase il publication è già attivo per le
-- nuove tabelle se "supabase_realtime" esiste; aggiungiamo esplicitamente.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_messages';
    EXCEPTION WHEN duplicate_object THEN
      -- already in publication
      NULL;
    END;
  END IF;
END $$;
