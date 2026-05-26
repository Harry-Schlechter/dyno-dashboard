-- Reverse channel: agents push items here for the user to review in the extension's Queue.
-- Trainer can drop a YouTube link, personal-assistant can drop an article, etc.
-- The extension polls this table (or subscribes via realtime) and renders it in the Capture & Focus tab.

CREATE TABLE IF NOT EXISTS agent_queue (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  agent_id     text NOT NULL,    -- which persona pushed this (trainer, financial-advisor, etc.)
  title        text NOT NULL,    -- short label, shown as the queue row
  body         text,             -- optional context / reason / TL;DR
  url          text,             -- optional link to open (article, video, PR, etc.)
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,  -- favicon, image, source, etc.

  -- Lifecycle
  status       text NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'opened', 'completed', 'dismissed')),
  opened_at    timestamptz,
  completed_at timestamptz,
  dismissed_at timestamptz,

  -- Optional: link back to the capture that triggered this (for "you asked X, here's the result")
  trigger_capture_id uuid REFERENCES captures(id) ON DELETE SET NULL,

  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_queue_user_pending
  ON agent_queue (user_id, created_at DESC) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_agent_queue_user_status
  ON agent_queue (user_id, status, created_at DESC);

ALTER TABLE agent_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_queue owner all" ON agent_queue;
CREATE POLICY "agent_queue owner all" ON agent_queue
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
