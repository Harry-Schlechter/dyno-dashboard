-- ═══════════════════════════════════════════════════════════════════════════════
-- Journal entries — structured mirror of the agent's markdown journal files
-- Created: 2026-07-13
--
-- Capture flow is unchanged: Harry voice-journals → agent writes
-- /root/openclaw/shared/journal/<date>.md. journal-sync.py reads those files,
-- uses the claude CLI to extract structured fields, and upserts here so the
-- dashboard can do "on this day", streaks, mood arcs, and recurrence insights.
--
-- IMPORTANT framing: the journal is PARTIAL (gaps, not every day). So everything
-- derived is scoped to "within your journal" — mention COUNTS and recurrence, never
-- "first appeared" / life-origin claims, which would be false precision.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS journal_entries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date         date NOT NULL,

  raw_text     text NOT NULL,
  word_count   int,

  -- Extracted per-entry (each describes THIS entry only — no chronology claims).
  mood         int CHECK (mood IS NULL OR (mood BETWEEN 1 AND 5)),
  energy       int CHECK (energy IS NULL OR (energy BETWEEN 1 AND 5)),
  sentiment    text CHECK (sentiment IS NULL OR sentiment IN ('positive','neutral','negative','mixed')),

  topics       text[] NOT NULL DEFAULT '{}',   -- recurring themes: 'training','work','family','injury'…
  people       text[] NOT NULL DEFAULT '{}',   -- names mentioned in the entry
  highlights   text[] NOT NULL DEFAULT '{}',   -- standout moments as written (not "life milestones")

  one_liner    text,                            -- agent's ≤100-char summary of the day

  source_file  text,                            -- provenance: the .md filename
  extracted_at timestamptz,                     -- when the LLM extraction ran (null = not yet)

  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS journal_entries_user_date ON journal_entries (user_id, date);
CREATE INDEX IF NOT EXISTS journal_entries_user_date_desc ON journal_entries (user_id, date DESC);
-- GIN indexes for recurrence queries over topics/people.
CREATE INDEX IF NOT EXISTS journal_entries_topics ON journal_entries USING gin (topics);
CREATE INDEX IF NOT EXISTS journal_entries_people ON journal_entries USING gin (people);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own journal_entries" ON journal_entries;
CREATE POLICY "own journal_entries" ON journal_entries FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION journal_entries_set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_journal_entries_updated_at ON journal_entries;
CREATE TRIGGER trg_journal_entries_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION journal_entries_set_updated_at();

-- ── on_this_day: entries sharing today's month/day from any prior period ───────
-- Safe by construction: it only says "you wrote this on this date", no life claims.
CREATE OR REPLACE VIEW journal_on_this_day AS
SELECT user_id, date, one_liner, mood, sentiment, topics, people, highlights,
       (current_date - date) AS days_ago
FROM journal_entries
WHERE to_char(date, 'MM-DD') = to_char(current_date, 'MM-DD')
  AND date < current_date;
