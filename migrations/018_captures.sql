-- Universal capture stream from the Dyno Cockpit extension.
-- Every "send to Dyno" action (text, page, selection, ask) lands here as provenance.
-- After insert, an agent-routing step decides which persona(s) get it and posts to Telegram.

CREATE TABLE IF NOT EXISTS captures (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- What the user actually wrote/captured
  content         text NOT NULL,
  ask             text,           -- optional question/instruction attached to the capture

  -- Browser tab context (auto-attached when captured from a webpage)
  page_url        text,
  page_title      text,
  page_selection  text,           -- highlighted text, if any
  page_metadata   jsonb NOT NULL DEFAULT '{}'::jsonb,  -- og:image, favicon, site name, etc.

  -- Where it came from inside the extension
  source          text NOT NULL DEFAULT 'capture-box'
                  CHECK (source IN ('capture-box', 'selection-bar', 'omnibox', 'context-menu', 'site-suggestion')),

  -- Focus session active at time of capture (for agent context)
  focus_session_id uuid REFERENCES focus_sessions(id) ON DELETE SET NULL,

  -- Routing
  forced_agent    text,           -- if user pinned an agent; NULL = auto-route
  routed_agents   text[] NOT NULL DEFAULT '{}',  -- which agents actually received it
  routing_status  text NOT NULL DEFAULT 'pending'
                  CHECK (routing_status IN ('pending', 'routed', 'failed', 'skipped')),
  routing_notes   text,

  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_captures_user_created
  ON captures (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_captures_routing_status
  ON captures (routing_status) WHERE routing_status = 'pending';

ALTER TABLE captures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "captures owner all" ON captures;
CREATE POLICY "captures owner all" ON captures
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
