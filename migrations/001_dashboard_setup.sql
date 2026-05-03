-- ═══════════════════════════════════════════════════════════════════════════════
-- Dyno Dashboard — full schema setup
-- Created: 2026-05-01
--
-- Runs idempotently. Safe to re-run if you add new tables / columns later.
-- Order matters: shared trigger fn → goals → life_events → calendar_events
--                → exercise normalization → seed goals (commented out).
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- Shared updated_at trigger function
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;


-- ─────────────────────────────────────────────────────────────────────────────
-- goals — Life Score system. Owned by the user's AI agent.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,

  -- Identity / display
  key text not null,                    -- 'sleep_hours', 'protein_g', 'monthly_spend'
  label text not null,                  -- 'Sleep hours' (display name)
  category text,                        -- 'health' | 'finance' | 'fitness' | 'mind' | 'experience' | 'context'

  -- How to fetch the actual value
  metric_source text not null,          -- e.g. 'sleep.hours', 'meals.protein_g_sum', 'transactions.real_spend'

  -- Scoring rules
  period text not null check (period in ('daily','weekly','monthly','yearly')),
  target_type text not null check (target_type in ('min','max','band','steps','trajectory')),
  target_value numeric not null,        -- min: floor; max: ceiling; band: lower bound; trajectory: tolerance for maintaining
  target_max numeric,                   -- band: upper bound (null otherwise)

  -- v2 scoring extensions
  target_steps jsonb,                   -- For 'steps': [{"min":0,"score":0}, {"min":4,"score":20}, ...] sorted ascending
  allow_bonus boolean not null default false,   -- 'min' goals: allows score to exceed 100 (capped at 110)
  phase text check (phase is null or phase in ('cutting','bulking','maintaining')),  -- trajectory direction
  target_change numeric,                -- expected delta per period (negative for cutting, etc.)

  -- Absolution: goals that, when scored ≥ threshold, drop this goal from the avg
  absolved_by_goals text[] not null default '{}',
  absolution_threshold int not null default 80 check (absolution_threshold between 1 and 110),
  score_only_for_absolution boolean not null default false,
    -- If true, scored for absolution purposes but does NOT contribute to weighted average.
    -- Use for context goals (sick_days, injury_days, work_crunch_days).

  weight int not null default 5 check (weight between 1 and 10),
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists goals_user_key_period
  on goals(user_id, key, period) where is_active;

create index if not exists goals_user_active_period
  on goals(user_id, is_active, period);

alter table goals enable row level security;

drop policy if exists "Users can view their own goals" on goals;
drop policy if exists "Users can insert their own goals" on goals;
drop policy if exists "Users can update their own goals" on goals;
drop policy if exists "Users can delete their own goals" on goals;

create policy "Users can view their own goals"
  on goals for select using (auth.uid() = user_id);
create policy "Users can insert their own goals"
  on goals for insert with check (auth.uid() = user_id);
create policy "Users can update their own goals"
  on goals for update using (auth.uid() = user_id);
create policy "Users can delete their own goals"
  on goals for delete using (auth.uid() = user_id);

drop trigger if exists goals_updated_at on goals;
create trigger goals_updated_at before update on goals
  for each row execute function set_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- life_events — contextual flags (sick / travel / social / etc.) the agent records
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists life_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,

  event_type text not null check (event_type in (
    'travel','sick','social','work_crunch','office','networking','injury','other'
  )),
  start_date date not null,
  end_date date not null,
  notes text,
  source text not null default 'agent',  -- 'agent' | 'manual' | 'calendar'
  metadata jsonb,                        -- e.g. {"destination": "Bali", "intensity": "high"}

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint life_events_dates check (end_date >= start_date)
);

create index if not exists life_events_user_dates on life_events(user_id, start_date, end_date);
create index if not exists life_events_user_type  on life_events(user_id, event_type);

alter table life_events enable row level security;

drop policy if exists "Users can view their own life_events"   on life_events;
drop policy if exists "Users can insert their own life_events" on life_events;
drop policy if exists "Users can update their own life_events" on life_events;
drop policy if exists "Users can delete their own life_events" on life_events;

create policy "Users can view their own life_events"
  on life_events for select using (auth.uid() = user_id);
create policy "Users can insert their own life_events"
  on life_events for insert with check (auth.uid() = user_id);
create policy "Users can update their own life_events"
  on life_events for update using (auth.uid() = user_id);
create policy "Users can delete their own life_events"
  on life_events for delete using (auth.uid() = user_id);

drop trigger if exists life_events_updated_at on life_events;
create trigger life_events_updated_at before update on life_events
  for each row execute function set_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- calendar_events — Google Calendar sync target.
-- Agent upserts events here; dashboard reads for the Calendar page.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,

  -- Source identity (idempotent upsert key)
  source text not null default 'google',  -- 'google' | 'manual' | 'apple' | etc.
  source_event_id text not null,          -- Google's event ID
  source_calendar_id text,                -- Which calendar (primary, work, etc.)
  source_calendar_name text,              -- Human-readable calendar name

  -- Event data
  title text not null,
  description text,
  location text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  all_day boolean not null default false,
  timezone text,

  -- Categorization (drives coloring + life_events mirroring)
  category text,                          -- 'work' | 'personal' | 'fitness' | 'social' | 'travel' | 'medical' | 'networking' | etc.
  color text,                             -- hex code, optional explicit override

  -- Attendees / status
  attendee_count int,
  is_organizer boolean,
  status text,                            -- 'confirmed' | 'tentative' | 'cancelled'

  metadata jsonb,                         -- raw event payload, for the agent's reference

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint calendar_events_dates_check check (end_time >= start_time)
);

create unique index if not exists calendar_events_source_unique
  on calendar_events(user_id, source, source_event_id);
create index if not exists calendar_events_user_start    on calendar_events(user_id, start_time);
create index if not exists calendar_events_user_category on calendar_events(user_id, category);

alter table calendar_events enable row level security;

drop policy if exists "Users can view their own calendar_events"   on calendar_events;
drop policy if exists "Users can insert their own calendar_events" on calendar_events;
drop policy if exists "Users can update their own calendar_events" on calendar_events;
drop policy if exists "Users can delete their own calendar_events" on calendar_events;

create policy "Users can view their own calendar_events"
  on calendar_events for select using (auth.uid() = user_id);
create policy "Users can insert their own calendar_events"
  on calendar_events for insert with check (auth.uid() = user_id);
create policy "Users can update their own calendar_events"
  on calendar_events for update using (auth.uid() = user_id);
create policy "Users can delete their own calendar_events"
  on calendar_events for delete using (auth.uid() = user_id);

drop trigger if exists calendar_events_updated_at on calendar_events;
create trigger calendar_events_updated_at before update on calendar_events
  for each row execute function set_updated_at();

-- Sync notes for the agent:
--   - Upsert key is (user_id, source, source_event_id) — re-syncing safe
--   - Cancelled events should set status='cancelled' rather than DELETE — keeps history
--   - Recurring events: store each instance as a separate row with its own source_event_id
--   - If an event is also a life_event (e.g. travel), agent can mirror into life_events
--     so it absolves goals correctly.


-- ─────────────────────────────────────────────────────────────────────────────
-- Exercise name normalization — fix typos / variants so PR detection works.
-- Idempotent (re-running is a no-op once cleaned).
-- ─────────────────────────────────────────────────────────────────────────────

update workout_exercises set exercise_name = 'Pull-ups'
 where exercise_name in ('Pull Ups', 'Pull-ups (Overhand)', 'Pull-ups (Red Band Assist)', 'Band Pull Ups (Purple)');

update workout_exercises set exercise_name = 'DB Lateral Raise'
 where exercise_name in ('DB Lateral Raises', 'Lateral Raises');

update workout_exercises set exercise_name = 'Single-Leg Calf Raise'
 where exercise_name in ('Single Leg Calf Raises', 'Single-Leg Calf Raises');

update workout_exercises set exercise_name = 'Calf Raise'
 where exercise_name in ('Calf Raises');

update workout_exercises set exercise_name = 'Chest Supported Row'
 where exercise_name in ('Chest Supported Rows');


-- ═══════════════════════════════════════════════════════════════════════════════
-- SEED GOALS — pre-filled with user_id ea8f4579-3ac6-4945-b64d-9daedeb63870.
-- Conventions:
--   target_type='steps'       → use target_steps JSON, target_value can be 0
--   target_type='trajectory'  → set phase + target_change; target_value = ± tolerance for maintaining
--   allow_bonus=true          → score can exceed 100 (capped at 110)
--   absolved_by_goals         → list of goal `key`s; if any score ≥ threshold, this goal drops out of avg
--   score_only_for_absolution → goal scores but doesn't add to average (sick/injury/etc.)
-- ═══════════════════════════════════════════════════════════════════════════════

insert into goals (
  user_id, key, label, category, metric_source, period, target_type, target_value, target_max,
  target_steps, allow_bonus, phase, target_change, weight,
  absolved_by_goals, absolution_threshold, score_only_for_absolution
) values

-- Sleep consistency (avg std dev of bedtime+waketime in min — LOWER is better)
('ea8f4579-3ac6-4945-b64d-9daedeb63870', 'sleep_consistency', 'Sleep consistency', 'health',
 'sleep.consistency_score', 'weekly', 'steps', 0, null,
 '[
   {"min": 0,    "score": 100},
   {"min": 15,   "score": 90},
   {"min": 30,   "score": 75},
   {"min": 60,   "score": 55},
   {"min": 90,   "score": 35},
   {"min": 120,  "score": 15}
 ]'::jsonb,
 false, null, null, 7,
 array['travel_days','work_crunch_days']::text[], 80, false),

-- Sleep hours (your piecewise step function)
('ea8f4579-3ac6-4945-b64d-9daedeb63870', 'sleep_hours', 'Sleep hours', 'health',
 'sleep.hours', 'daily', 'steps', 0, null,
 '[
   {"min": 0,   "score": 0},
   {"min": 4,   "score": 20},
   {"min": 5,   "score": 40},
   {"min": 6,   "score": 55},
   {"min": 6.5, "score": 65},
   {"min": 7,   "score": 80},
   {"min": 7.5, "score": 90},
   {"min": 8,   "score": 100}
 ]'::jsonb,
 false, null, null, 9,
 array['travel_days','work_crunch_days']::text[], 80, false),

-- Nutrition
('ea8f4579-3ac6-4945-b64d-9daedeb63870', 'protein_daily', 'Protein', 'health',
 'meals.protein_g_sum', 'daily', 'min', 170, null,
 null, true, null, null, 6,
 array['sick_days','injury_days']::text[], 80, false),

('ea8f4579-3ac6-4945-b64d-9daedeb63870', 'calories_daily', 'Calories', 'health',
 'meals.calories_sum', 'daily', 'max', 2400, null,
 null, false, null, null, 4,
 array['travel_days','social_week','sick_days']::text[], 80, false),

-- Body / weight
('ea8f4579-3ac6-4945-b64d-9daedeb63870', 'weight_static', 'Weight (under 175)', 'health',
 'weight_lbs', 'daily', 'max', 175, null,
 null, false, null, null, 5,
 array[]::text[], 80, false),

('ea8f4579-3ac6-4945-b64d-9daedeb63870', 'weight_trajectory', 'Weight trajectory', 'health',
 'weight_lbs.weekly_change', 'weekly', 'trajectory', 0.5, null,
 null, false, 'maintaining', 0, 7,
 array['travel_days','sick_days']::text[], 80, false),

-- Finance
('ea8f4579-3ac6-4945-b64d-9daedeb63870', 'monthly_savings', 'Monthly savings', 'finance',
 'transactions.savings', 'monthly', 'min', 4000, null,
 null, true, null, null, 9,
 array['travel_spend_quarterly']::text[], 80, false),

('ea8f4579-3ac6-4945-b64d-9daedeb63870', 'dining_monthly', 'Dining spend', 'finance',
 'transactions.dining_spend', 'monthly', 'max', 600, null,
 null, false, null, null, 3,
 array['travel_days','social_week']::text[], 80, false),

-- Travel: positive goal AND absolver
('ea8f4579-3ac6-4945-b64d-9daedeb63870', 'travel_days', 'Travel days', 'experience',
 'life.travel_days', 'yearly', 'min', 30, null,
 null, true, null, null, 5,
 array[]::text[], 80, false),

('ea8f4579-3ac6-4945-b64d-9daedeb63870', 'travel_spend_quarterly', 'Travel spend', 'experience',
 'transactions.travel_spend', 'monthly', 'min', 500, null,
 null, true, null, null, 4,
 array[]::text[], 80, false),

-- Social / context goals (positive, rate-limited per week)
('ea8f4579-3ac6-4945-b64d-9daedeb63870', 'social_week', 'Social week', 'experience',
 'life.social_days', 'weekly', 'min', 1, null,
 null, true, null, null, 4,
 array[]::text[], 80, false),

('ea8f4579-3ac6-4945-b64d-9daedeb63870', 'office_week', 'Office days', 'experience',
 'life.office_days', 'weekly', 'min', 3, null,
 null, true, null, null, 2,
 array[]::text[], 80, false),

('ea8f4579-3ac6-4945-b64d-9daedeb63870', 'networking_week', 'Networking', 'experience',
 'life.networking_count', 'weekly', 'min', 1, null,
 null, true, null, null, 2,
 array[]::text[], 80, false),

-- Pure-context goals (don't add points; only absolve other goals)
('ea8f4579-3ac6-4945-b64d-9daedeb63870', 'sick_days', 'Sick days', 'context',
 'life.sick_days', 'weekly', 'min', 1, null,
 null, false, null, null, 1,
 array[]::text[], 80, true),

('ea8f4579-3ac6-4945-b64d-9daedeb63870', 'work_crunch_days', 'Work crunch', 'context',
 'life.work_crunch_days', 'weekly', 'min', 1, null,
 null, false, null, null, 1,
 array[]::text[], 80, true),

('ea8f4579-3ac6-4945-b64d-9daedeb63870', 'injury_days', 'Injury', 'context',
 'life.injury_days', 'weekly', 'min', 1, null,
 null, false, null, null, 1,
 array[]::text[], 80, true);


-- Workout goals — uncomment + set targets when ready:
--
-- insert into goals (user_id, key, label, category, metric_source, period, target_type, target_value, weight,
--   absolved_by_goals, absolution_threshold, score_only_for_absolution
-- ) values
-- ('ea8f4579-3ac6-4945-b64d-9daedeb63870', 'basketball_week', 'Basketball', 'fitness',
--  'workouts.basketball_count', 'weekly', 'min', 4, 6,
--  array['travel_days','sick_days','injury_days']::text[], 80, false),
-- ('ea8f4579-3ac6-4945-b64d-9daedeb63870', 'climbing_week', 'Climbing', 'fitness',
--  'workouts.climbing_count', 'weekly', 'min', 2, 6,
--  array['travel_days','sick_days','injury_days']::text[], 80, false),
-- ('ea8f4579-3ac6-4945-b64d-9daedeb63870', 'lifting_week', 'Lifting', 'fitness',
--  'workouts.lifting_count', 'weekly', 'min', 3, 6,
--  array['travel_days','sick_days','injury_days']::text[], 80, false);
