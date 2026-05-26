-- Active "what I'm working on right now" sessions for the Dyno Cockpit extension.
-- One row per focus session. The currently-active session is the one with ended_at IS NULL.
-- Agents read this to understand the user's current focus when responding.

CREATE TABLE IF NOT EXISTS focus_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  started_at  timestamptz NOT NULL DEFAULT now(),
  ended_at    timestamptz,
  notes       jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_active
  ON focus_sessions (user_id) WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_started
  ON focus_sessions (user_id, started_at DESC);

ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "focus_sessions owner all" ON focus_sessions;
CREATE POLICY "focus_sessions owner all" ON focus_sessions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
