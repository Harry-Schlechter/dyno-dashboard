-- User-curated quick links for the Dyno Cockpit new-tab page.
-- Separate from Chrome bookmarks: explicitly pinned, ordered, syncs across devices.

CREATE TABLE IF NOT EXISTS cockpit_links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  url         text NOT NULL,
  emoji       text,                       -- optional, e.g. '🐙' for github
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cockpit_links_user_sort
  ON cockpit_links (user_id, sort_order ASC, created_at ASC);

ALTER TABLE cockpit_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cockpit_links owner all" ON cockpit_links;
CREATE POLICY "cockpit_links owner all" ON cockpit_links
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
