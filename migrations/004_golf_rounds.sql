-- ═══════════════════════════════════════════════════════════════════════════════
-- Dyno Dashboard — golf tracking
-- Created: 2026-05-06
--
-- Adds:
--   1. golf_rounds table (one row per round OR practice session)
--   2. golf-scorecards storage bucket (public read; service role write)
--   3. RLS policy on the bucket
--
-- Runs idempotently. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- golf_rounds — one row per round or practice session
--
-- Linked back to workouts.id so a golf row counts as exercise activity in the
-- normal workouts queries (sessions, weekly trend, heatmaps). Practice sessions
-- (range, putting, short_game) have null scores but still get a workouts row.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists golf_rounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,

  -- Linkage back to the corresponding workouts row (so it counts as exercise).
  workout_id uuid references workouts(id) on delete cascade,

  -- When + where
  date date not null,
  course_name text not null,                  -- 'Bethpage Black', 'Pelham Bay', 'Range at Chelsea Piers'
  course_location text,                       -- 'Farmingdale, NY' (optional)

  -- What kind of session
  round_type text not null check (round_type in (
    'round',           -- played a real round (9 or 18)
    'driving_range',   -- range session
    'putting',         -- putting green only
    'short_game',      -- chipping / short-game practice
    'simulator'        -- indoor sim
  )),

  -- Round details (null for practice sessions)
  holes int check (holes is null or holes in (9, 18, 27, 36)),
  total_score int,
  total_par int,

  -- Stats (null when not tracked)
  fairways_hit int,
  fairways_total int,                         -- usually 14 on an 18-hole par-72 (par-3s excluded)
  greens_in_reg int,                          -- GIR
  putts int,
  three_putts int,
  birdies int,
  pars int,
  bogeys int,
  doubles_plus int,                           -- double bogey or worse

  -- Per-hole detail. Shape:
  --   [{"hole":1,"par":4,"score":5,"putts":2,"fairway_hit":true,"gir":false}, ...]
  scorecard_data jsonb,

  -- Image of the physical scorecard if uploaded.
  -- Stored in supabase storage bucket 'golf-scorecards'; this is the public URL.
  scorecard_url text,

  -- Context
  weather text,                               -- 'sunny 72F windy', free text
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at trigger (uses shared set_updated_at fn from migration 001)
drop trigger if exists golf_rounds_set_updated_at on golf_rounds;
create trigger golf_rounds_set_updated_at
  before update on golf_rounds
  for each row execute function set_updated_at();

-- Common query patterns: "rounds in date range", "latest rounds for user"
create index if not exists golf_rounds_user_date_idx on golf_rounds (user_id, date desc);
create index if not exists golf_rounds_workout_id_idx on golf_rounds (workout_id);
create index if not exists golf_rounds_round_type_idx on golf_rounds (user_id, round_type, date desc);


-- ─────────────────────────────────────────────────────────────────────────────
-- Storage bucket for scorecard images
--
-- Public read (so the dashboard can render <img src=...>) — this is Harry's
-- personal data only, not multi-tenant. Writes are service-role only via the
-- trainer agent's Supabase service key.
-- ─────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('golf-scorecards', 'golf-scorecards', true)
on conflict (id) do update set public = excluded.public;


-- ─────────────────────────────────────────────────────────────────────────────
-- Storage policies
-- Public read; only service role writes. (Anon key cannot upload.)
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "golf-scorecards public read" on storage.objects;
create policy "golf-scorecards public read"
  on storage.objects for select
  using (bucket_id = 'golf-scorecards');

-- Note: the service role key bypasses RLS entirely, so no insert/update/delete
-- policies are needed for the trainer agent's curl uploads. If you ever wire up
-- direct uploads from the dashboard with the anon key, add policies here.


-- ═══════════════════════════════════════════════════════════════════════════════
-- Done. To verify:
--   select * from golf_rounds limit 1;
--   select * from storage.buckets where id = 'golf-scorecards';
-- ═══════════════════════════════════════════════════════════════════════════════
