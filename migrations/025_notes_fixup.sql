-- 025_notes_fixup — bring existing notes table up to 024_notes.sql shape.
--
-- 024_notes.sql uses CREATE TABLE IF NOT EXISTS, which is a no-op if an older
-- notes table already exists. This migration adds any missing columns, the
-- check constraint, indexes, trigger, and RLS policy. Idempotent.

ALTER TABLE notes ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS body text NOT NULL DEFAULT '';
ALTER TABLE notes ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE notes ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS author_kind text NOT NULL DEFAULT 'user';
ALTER TABLE notes ADD COLUMN IF NOT EXISTS author_agent text;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE notes ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$ BEGIN
  ALTER TABLE notes ADD CONSTRAINT notes_author_kind_check
    CHECK (author_kind IN ('user','agent'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_notes_user_active
  ON notes (user_id, updated_at DESC) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notes_user_pinned
  ON notes (user_id, pinned DESC, updated_at DESC) WHERE archived_at IS NULL;

CREATE OR REPLACE FUNCTION notes_set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_notes_updated_at ON notes;
CREATE TRIGGER trg_notes_updated_at
  BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION notes_set_updated_at();

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notes owner all" ON notes;
CREATE POLICY "notes owner all" ON notes
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
