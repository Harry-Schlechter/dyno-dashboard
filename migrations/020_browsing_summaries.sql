-- Daily browsing summary fed to agents for context-aware morning briefs and observations.
-- The extension's background script collects per-tab time + URLs through the day, then once
-- per day (end of day, local time) generates one summary row.
-- URLs are stored — this is the user's own DB and they opted in.

CREATE TABLE IF NOT EXISTS browsing_summaries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  for_date    date NOT NULL,    -- the local-time day this summary covers

  -- Aggregate signal for quick agent consumption
  themes      text[] NOT NULL DEFAULT '{}',  -- e.g. ["AI research", "apartment listings", "basketball stats"]
  headline    text,                          -- one-line TL;DR

  -- Per-domain time totals (seconds) — keys are bare hostnames
  domain_seconds jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Raw page log (optional but useful) — array of {url, title, seconds, opened_at}
  pages       jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Top captures of the day, denormalized for fast brief generation
  capture_count int NOT NULL DEFAULT 0,
  capture_agents text[] NOT NULL DEFAULT '{}',  -- which agents got hit today

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, for_date)
);

CREATE INDEX IF NOT EXISTS idx_browsing_summaries_user_date
  ON browsing_summaries (user_id, for_date DESC);

ALTER TABLE browsing_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "browsing_summaries owner all" ON browsing_summaries;
CREATE POLICY "browsing_summaries owner all" ON browsing_summaries
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
