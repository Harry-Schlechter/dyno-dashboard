-- Move dashboard auth onto Supabase Auth.
-- Drop the old custom users table; add a profiles table keyed by auth.users.id.

DROP TABLE IF EXISTS dashboard_users;

CREATE TABLE IF NOT EXISTS profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           text NOT NULL,
  role            text NOT NULL CHECK (role IN ('owner', 'guest')),
  allowed_spaces  text[] NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Anyone signed in can read their own profile.
DROP POLICY IF EXISTS "profiles self-read" ON profiles;
CREATE POLICY "profiles self-read" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Owner role can read all profiles (used for sharing UIs etc.).
DROP POLICY IF EXISTS "profiles owner-read-all" ON profiles;
CREATE POLICY "profiles owner-read-all" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'owner')
  );

-- Helper: current user's role
CREATE OR REPLACE FUNCTION public.current_role_safe() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;
