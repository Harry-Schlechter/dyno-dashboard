-- Universal notes table — written by user (dashboard, cockpit, new-tab quick-note)
-- AND by agents (trainer drops a "try RDLs Tuesday" note, etc.).
-- Agents read recent + pinned notes as context when they boot.

CREATE TABLE IF NOT EXISTS notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  title       text,                                -- can be empty; UI will infer from first line of body
  body        text NOT NULL DEFAULT '',            -- markdown
  tags        text[] NOT NULL DEFAULT '{}',
  pinned      boolean NOT NULL DEFAULT false,

  -- Provenance: who wrote this note. NULL/user = harry typed it.
  author_kind text NOT NULL DEFAULT 'user'
              CHECK (author_kind IN ('user', 'agent')),
  author_agent text,                               -- e.g. 'trainer', set when author_kind='agent'

  archived_at timestamptz,                         -- soft-delete; null = active

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notes_user_active
  ON notes (user_id, updated_at DESC) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notes_user_pinned
  ON notes (user_id, pinned DESC, updated_at DESC) WHERE archived_at IS NULL;

-- Auto-update updated_at on every write.
CREATE OR REPLACE FUNCTION notes_set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notes_updated_at ON notes;
CREATE TRIGGER trg_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION notes_set_updated_at();

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notes owner all" ON notes;
CREATE POLICY "notes owner all" ON notes
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
