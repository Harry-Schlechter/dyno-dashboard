-- One-time pairing codes for the Dyno Cockpit extension.
-- Flow:
--   1. User clicks "Pair extension" on dashboard → inserts row with a fresh 8-char code,
--      payload = current Supabase session (access + refresh tokens).
--   2. User pastes the code into the extension options page → extension SELECTs the row
--      by code, reads the session payload, then DELETEs the row.
--   3. Code expires after 10 minutes regardless.

CREATE TABLE IF NOT EXISTS extension_pairing (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code        text NOT NULL UNIQUE,    -- short, user-pasteable (e.g. 'A4F-9KP-2X')
  payload     jsonb NOT NULL,          -- { access_token, refresh_token, expires_at, user: {...} }
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  consumed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_extension_pairing_code ON extension_pairing (code);
CREATE INDEX IF NOT EXISTS idx_extension_pairing_user ON extension_pairing (user_id, created_at DESC);

ALTER TABLE extension_pairing ENABLE ROW LEVEL SECURITY;

-- Owner can read/write/delete only their own pairing codes.
DROP POLICY IF EXISTS "extension_pairing owner all" ON extension_pairing;
CREATE POLICY "extension_pairing owner all" ON extension_pairing
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
