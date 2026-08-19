// Shared config for the extension.
// Anon key is safe to embed — RLS enforces ownership on every table.

export const SUPABASE_URL = 'https://mrgeucdjjnxexcqcmhgr.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yZ2V1Y2Rqam54ZXhjcWNtaGdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MjYzMDksImV4cCI6MjA4ODQwMjMwOX0.0YaBMvjyi690WuHeL_EJvDKq1DiKZ_-wfsqSCKB257M';

export const VOICE_API_URL = 'http://100.85.165.117:9090';
export const DASHBOARD_URL = 'https://dyno.harryschlechter.com';

// Public backend URL for extension pairing (mints an independent session).
// Uses the public tunnel host so it works off the tailnet.
export const PAIR_API_URL = 'https://voice.harryschlechter.com';
