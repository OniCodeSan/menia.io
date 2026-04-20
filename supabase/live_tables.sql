-- Live sessions table
CREATE TABLE IF NOT EXISTS live_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES profiles(id),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'Talk',
  sub_only boolean NOT NULL DEFAULT false,
  donations_enabled boolean NOT NULL DEFAULT true,
  min_donation integer NOT NULL DEFAULT 2,
  status text NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'ended')),
  viewer_count integer NOT NULL DEFAULT 0,
  total_donations integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

-- Live chat messages table
CREATE TABLE IF NOT EXISTS live_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  live_id uuid NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id),
  message text NOT NULL,
  type text NOT NULL DEFAULT 'chat' CHECK (type IN ('chat', 'donation', 'system')),
  donation_amount integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_live_sessions_creator ON live_sessions(creator_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_status ON live_sessions(status);
CREATE INDEX IF NOT EXISTS idx_live_chat_live_id ON live_chat_messages(live_id, created_at);

-- RLS
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_chat_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can view live sessions
CREATE POLICY "live_sessions_select" ON live_sessions FOR SELECT USING (true);
-- Only creator can insert/update their own sessions
CREATE POLICY "live_sessions_insert" ON live_sessions FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "live_sessions_update" ON live_sessions FOR UPDATE USING (auth.uid() = creator_id);

-- Anyone authenticated can read chat messages
CREATE POLICY "live_chat_select" ON live_chat_messages FOR SELECT USING (true);
-- Authenticated users can send messages
CREATE POLICY "live_chat_insert" ON live_chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE live_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE live_sessions;
