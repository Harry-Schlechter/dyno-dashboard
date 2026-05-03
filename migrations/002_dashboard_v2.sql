-- ═══════════════════════════════════════════════════════════════════════════════
-- Dyno Dashboard v2 — agent-as-author + insight engine
-- Created: 2026-05-03
--
-- Adds:
--   • agent_observations  — agent-authored insights / patterns / anomalies
--   • agent_messages      — opt-in transcript log (which persona, when, summary)
--   • commitments         — mirror of OpenClaw's inferred commitments
--   • life_score_snapshots— daily score history for trend charts
--   • weight_logs         — body comp tracking (separate from daily_logs.weight_lbs)
--   • mental_health_events— therapy / med-taken / panic / etc.
--   • media_consumed      — books, articles, podcasts
--   • observation_feedback— two-way street: dashboard reactions back to agents
--
-- Plus views: personal_records, recent_observations
-- Runs idempotently. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- agent_observations — agent-authored insights, patterns, anomalies
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists agent_observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,

  -- Who observed this
  agent_id text not null,                 -- 'trainer' | 'nutritionist' | 'mental-health' | 'maintenance' | …
  source text not null default 'agent',   -- 'agent' | 'stats' | 'cron'

  -- What they observed
  kind text not null check (kind in (
    'insight',      -- positive observation worth keeping
    'pattern',      -- recurring pattern (3+ instances)
    'anomaly',      -- statistical outlier
    'recommendation', -- agent's suggested action
    'milestone',    -- PR / streak / achievement
    'warning',      -- something to watch
    'forecast'      -- projection / trend extrapolation
  )),
  severity text not null default 'info' check (severity in ('info','low','medium','high')),

  -- Content
  title text not null,                    -- one-line summary (shown in feed)
  body text,                              -- longer prose (markdown OK)
  data jsonb,                             -- structured backing data: {metric, value, baseline, period, ...}

  -- Cross-domain links
  related_agents text[] not null default '{}',  -- e.g. ['trainer','mental-health'] for sleep ↔ recovery insight
  related_table text,                     -- 'meals' | 'workouts' | 'sleep' | …
  related_ids uuid[] not null default '{}',

  -- Time scoping
  observed_for_date date,                 -- which day this is about (null = general)
  expires_at timestamptz,                 -- auto-hide after this time (null = persistent)

  -- Lifecycle
  status text not null default 'active' check (status in ('active','dismissed','archived')),
  dismissed_at timestamptz,
  dismissed_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_observations_user_created
  on agent_observations(user_id, created_at desc);
create index if not exists agent_observations_user_status_date
  on agent_observations(user_id, status, observed_for_date desc);
create index if not exists agent_observations_user_agent
  on agent_observations(user_id, agent_id, created_at desc);
create index if not exists agent_observations_user_kind
  on agent_observations(user_id, kind, created_at desc);

alter table agent_observations enable row level security;

drop policy if exists "Users can view their own observations" on agent_observations;
drop policy if exists "Users can insert their own observations" on agent_observations;
drop policy if exists "Users can update their own observations" on agent_observations;
drop policy if exists "Users can delete their own observations" on agent_observations;

create policy "Users can view their own observations"
  on agent_observations for select using (auth.uid() = user_id);
create policy "Users can insert their own observations"
  on agent_observations for insert with check (auth.uid() = user_id);
create policy "Users can update their own observations"
  on agent_observations for update using (auth.uid() = user_id);
create policy "Users can delete their own observations"
  on agent_observations for delete using (auth.uid() = user_id);

drop trigger if exists agent_observations_updated_at on agent_observations;
create trigger agent_observations_updated_at before update on agent_observations
  for each row execute function set_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- observation_feedback — two-way street, user reactions feed back to agents
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists observation_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  observation_id uuid not null references agent_observations(id) on delete cascade,

  reaction text not null check (reaction in (
    'useful',       -- thumbs up
    'not_useful',   -- thumbs down — agent should weight similar lower
    'wrong',        -- factually incorrect
    'acted_on',     -- I did the suggested action
    'snooze',       -- not now, surface later
    'starred'       -- save / pin
  )),
  note text,

  created_at timestamptz not null default now()
);

create index if not exists observation_feedback_user_obs
  on observation_feedback(user_id, observation_id);
create index if not exists observation_feedback_user_reaction
  on observation_feedback(user_id, reaction, created_at desc);

alter table observation_feedback enable row level security;

drop policy if exists "Users can view their own feedback" on observation_feedback;
drop policy if exists "Users can insert their own feedback" on observation_feedback;
drop policy if exists "Users can delete their own feedback" on observation_feedback;

create policy "Users can view their own feedback"
  on observation_feedback for select using (auth.uid() = user_id);
create policy "Users can insert their own feedback"
  on observation_feedback for insert with check (auth.uid() = user_id);
create policy "Users can delete their own feedback"
  on observation_feedback for delete using (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- agent_messages — light transcript log so dashboard can show "who Harry talked to"
-- (Not the full conversation. Just the metadata + a one-line summary.)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists agent_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,

  agent_id text not null,
  channel text,                            -- 'telegram' | 'webchat' | 'cron' | …
  topic_id text,                           -- telegram thread id, etc.

  message_at timestamptz not null default now(),
  intent text,                             -- 'log_meal' | 'ask_question' | 'plan' | 'vent' | …
  summary text,                            -- agent's one-line take on what happened
  sentiment text check (sentiment is null or sentiment in ('positive','neutral','negative','mixed')),
  action_taken text,                       -- 'logged_meal' | 'created_observation' | 'no_action' | …

  -- Optional structured signals
  data jsonb,

  created_at timestamptz not null default now()
);

create index if not exists agent_messages_user_at
  on agent_messages(user_id, message_at desc);
create index if not exists agent_messages_user_agent_at
  on agent_messages(user_id, agent_id, message_at desc);

alter table agent_messages enable row level security;

drop policy if exists "Users can view their own agent_messages" on agent_messages;
drop policy if exists "Users can insert their own agent_messages" on agent_messages;
drop policy if exists "Users can update their own agent_messages" on agent_messages;

create policy "Users can view their own agent_messages"
  on agent_messages for select using (auth.uid() = user_id);
create policy "Users can insert their own agent_messages"
  on agent_messages for insert with check (auth.uid() = user_id);
create policy "Users can update their own agent_messages"
  on agent_messages for update using (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- commitments — mirror of OpenClaw's inferred follow-ups
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,

  -- Source
  agent_id text not null,
  external_id text,                        -- OpenClaw commitment id (for sync)
  source_session text,                     -- session that inferred it

  -- Content
  title text not null,                     -- "Talk to Rayan about Camber timing"
  description text,
  detected_from text,                      -- snippet of conversation that triggered it

  -- Timing
  due_at timestamptz,
  remind_at timestamptz,                   -- when to surface as a reminder
  confidence numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),

  -- Lifecycle
  status text not null default 'pending' check (status in (
    'pending','sent','dismissed','snoozed','expired','done'
  )),
  completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists commitments_external_unique
  on commitments(user_id, external_id) where external_id is not null;
create index if not exists commitments_user_status_due
  on commitments(user_id, status, due_at);
create index if not exists commitments_user_remind
  on commitments(user_id, remind_at) where status = 'pending';

alter table commitments enable row level security;

drop policy if exists "Users can view their own commitments" on commitments;
drop policy if exists "Users can insert their own commitments" on commitments;
drop policy if exists "Users can update their own commitments" on commitments;
drop policy if exists "Users can delete their own commitments" on commitments;

create policy "Users can view their own commitments"
  on commitments for select using (auth.uid() = user_id);
create policy "Users can insert their own commitments"
  on commitments for insert with check (auth.uid() = user_id);
create policy "Users can update their own commitments"
  on commitments for update using (auth.uid() = user_id);
create policy "Users can delete their own commitments"
  on commitments for delete using (auth.uid() = user_id);

drop trigger if exists commitments_updated_at on commitments;
create trigger commitments_updated_at before update on commitments
  for each row execute function set_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- life_score_snapshots — daily score history for trend charts
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists life_score_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  date date not null,

  -- Composite + per-domain scores (0–110 with bonus)
  total_score numeric,
  health_score numeric,
  fitness_score numeric,
  finance_score numeric,
  mind_score numeric,
  experience_score numeric,

  -- Goal-by-goal breakdown for full audit trail
  goal_scores jsonb,                       -- [{goal_key, score, actual, target, weight, absolved_by}]

  -- Period context
  period text not null default 'daily' check (period in ('daily','weekly','monthly','yearly')),

  created_at timestamptz not null default now()
);

create unique index if not exists life_score_snapshots_user_date_period
  on life_score_snapshots(user_id, date, period);
create index if not exists life_score_snapshots_user_date
  on life_score_snapshots(user_id, date desc);

alter table life_score_snapshots enable row level security;

drop policy if exists "Users can view their own life_score_snapshots" on life_score_snapshots;
drop policy if exists "Users can insert their own life_score_snapshots" on life_score_snapshots;
drop policy if exists "Users can update their own life_score_snapshots" on life_score_snapshots;

create policy "Users can view their own life_score_snapshots"
  on life_score_snapshots for select using (auth.uid() = user_id);
create policy "Users can insert their own life_score_snapshots"
  on life_score_snapshots for insert with check (auth.uid() = user_id);
create policy "Users can update their own life_score_snapshots"
  on life_score_snapshots for update using (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- weight_logs — body comp tracking with full provenance
-- (daily_logs.weight_lbs stays — this is the canonical timeline.)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  date date not null,

  weight_lbs numeric not null,
  body_fat_pct numeric,
  lean_mass_lbs numeric,
  fat_mass_lbs numeric,
  visceral_fat_lbs numeric,                -- DEXA only
  bone_mineral_content_lbs numeric,        -- DEXA only

  source text not null default 'scale' check (source in (
    'scale','dexa','bod_pod','manual','estimated'
  )),
  notes text,

  created_at timestamptz not null default now()
);

create unique index if not exists weight_logs_user_date_source
  on weight_logs(user_id, date, source);
create index if not exists weight_logs_user_date
  on weight_logs(user_id, date desc);

alter table weight_logs enable row level security;

drop policy if exists "Users can view their own weight_logs" on weight_logs;
drop policy if exists "Users can insert their own weight_logs" on weight_logs;
drop policy if exists "Users can update their own weight_logs" on weight_logs;
drop policy if exists "Users can delete their own weight_logs" on weight_logs;

create policy "Users can view their own weight_logs"
  on weight_logs for select using (auth.uid() = user_id);
create policy "Users can insert their own weight_logs"
  on weight_logs for insert with check (auth.uid() = user_id);
create policy "Users can update their own weight_logs"
  on weight_logs for update using (auth.uid() = user_id);
create policy "Users can delete their own weight_logs"
  on weight_logs for delete using (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- mental_health_events — therapy / med-taken / panic / etc.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists mental_health_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,

  occurred_at timestamptz not null default now(),
  date date not null,

  event_type text not null check (event_type in (
    'therapy_session',
    'psychiatrist_session',
    'med_taken',
    'med_skipped',
    'panic',
    'spiral',
    'breakthrough',
    'check_in',           -- agent-initiated wellness check
    'other'
  )),

  -- Content
  notes text,
  intensity int check (intensity is null or (intensity between 1 and 10)),
  duration_min int,
  triggers text[] not null default '{}',
  resolution text,                         -- how it ended / what helped

  -- Optional med-specific fields
  med_name text,
  med_dose text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mental_health_events_user_date
  on mental_health_events(user_id, date desc);
create index if not exists mental_health_events_user_type_date
  on mental_health_events(user_id, event_type, date desc);

alter table mental_health_events enable row level security;

drop policy if exists "Users can view their own mh_events" on mental_health_events;
drop policy if exists "Users can insert their own mh_events" on mental_health_events;
drop policy if exists "Users can update their own mh_events" on mental_health_events;
drop policy if exists "Users can delete their own mh_events" on mental_health_events;

create policy "Users can view their own mh_events"
  on mental_health_events for select using (auth.uid() = user_id);
create policy "Users can insert their own mh_events"
  on mental_health_events for insert with check (auth.uid() = user_id);
create policy "Users can update their own mh_events"
  on mental_health_events for update using (auth.uid() = user_id);
create policy "Users can delete their own mh_events"
  on mental_health_events for delete using (auth.uid() = user_id);

drop trigger if exists mental_health_events_updated_at on mental_health_events;
create trigger mental_health_events_updated_at before update on mental_health_events
  for each row execute function set_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- media_consumed — books, articles, podcasts, talks
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists media_consumed (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,

  consumed_at timestamptz not null default now(),
  date date not null,

  media_type text not null check (media_type in (
    'book','article','podcast','video','talk','course','other'
  )),
  title text not null,
  author text,
  source text,                             -- url, podcast app, library, etc.
  duration_min int,

  -- Engagement
  status text not null default 'in_progress' check (status in (
    'queued','in_progress','finished','abandoned'
  )),
  rating int check (rating is null or (rating between 1 and 5)),
  notes text,
  key_takeaways text[] not null default '{}',
  tags text[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists media_consumed_user_date
  on media_consumed(user_id, date desc);
create index if not exists media_consumed_user_status
  on media_consumed(user_id, status, updated_at desc);
create index if not exists media_consumed_user_type
  on media_consumed(user_id, media_type, date desc);

alter table media_consumed enable row level security;

drop policy if exists "Users can view their own media_consumed" on media_consumed;
drop policy if exists "Users can insert their own media_consumed" on media_consumed;
drop policy if exists "Users can update their own media_consumed" on media_consumed;
drop policy if exists "Users can delete their own media_consumed" on media_consumed;

create policy "Users can view their own media_consumed"
  on media_consumed for select using (auth.uid() = user_id);
create policy "Users can insert their own media_consumed"
  on media_consumed for insert with check (auth.uid() = user_id);
create policy "Users can update their own media_consumed"
  on media_consumed for update using (auth.uid() = user_id);
create policy "Users can delete their own media_consumed"
  on media_consumed for delete using (auth.uid() = user_id);

drop trigger if exists media_consumed_updated_at on media_consumed;
create trigger media_consumed_updated_at before update on media_consumed
  for each row execute function set_updated_at();


-- ═══════════════════════════════════════════════════════════════════════════════
-- VIEWS — convenience reads for the dashboard
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- personal_records — flat timeline of every PR across exercises
-- ─────────────────────────────────────────────────────────────────────────────

create or replace view personal_records as
select
  w.user_id,
  w.date,
  w.id as workout_id,
  we.id as exercise_id,
  we.exercise_name,
  we.weight_lbs,
  we.reps,
  we.rpe,
  we.notes,
  w.name as workout_name
from workout_exercises we
join workouts w on w.id = we.workout_id
where we.is_pr = true
order by w.date desc, we.exercise_name;


-- ─────────────────────────────────────────────────────────────────────────────
-- recent_observations — last 30 days of active observations, agent-friendly
-- ─────────────────────────────────────────────────────────────────────────────

create or replace view recent_observations as
select
  o.*,
  -- Aggregate user feedback
  (select count(*) from observation_feedback f
    where f.observation_id = o.id and f.reaction = 'useful')        as useful_count,
  (select count(*) from observation_feedback f
    where f.observation_id = o.id and f.reaction = 'not_useful')    as not_useful_count,
  (select count(*) from observation_feedback f
    where f.observation_id = o.id and f.reaction = 'acted_on')      as acted_on_count,
  (select count(*) from observation_feedback f
    where f.observation_id = o.id and f.reaction = 'starred') > 0   as is_starred
from agent_observations o
where o.status = 'active'
  and o.created_at >= now() - interval '30 days';


-- ─────────────────────────────────────────────────────────────────────────────
-- daily_score_trend — last 90 days of life score for charts
-- ─────────────────────────────────────────────────────────────────────────────

create or replace view daily_score_trend as
select
  user_id,
  date,
  total_score,
  health_score,
  fitness_score,
  finance_score,
  mind_score,
  experience_score
from life_score_snapshots
where period = 'daily'
  and date >= current_date - interval '90 days'
order by date;


-- ─────────────────────────────────────────────────────────────────────────────
-- weight_trend — recent weight measurements with rolling average
-- ─────────────────────────────────────────────────────────────────────────────

create or replace view weight_trend as
select
  user_id,
  date,
  weight_lbs,
  body_fat_pct,
  source,
  -- 7-day rolling average for noise smoothing
  avg(weight_lbs) over (
    partition by user_id
    order by date
    rows between 6 preceding and current row
  ) as weight_lbs_7d_avg
from weight_logs
where date >= current_date - interval '180 days'
order by date;


-- ─────────────────────────────────────────────────────────────────────────────
-- agent_activity_today — quick summary per persona for the activity strip
-- ─────────────────────────────────────────────────────────────────────────────

create or replace view agent_activity_today as
select
  user_id,
  agent_id,
  count(*)                                                      as message_count,
  max(message_at)                                               as last_message_at,
  count(*) filter (where action_taken is not null)              as actions_taken,
  array_agg(distinct intent) filter (where intent is not null)  as intents
from agent_messages
where message_at >= current_date
group by user_id, agent_id;


-- ═══════════════════════════════════════════════════════════════════════════════
-- BACKFILL — copy existing weight data from daily_logs into weight_logs (idempotent)
-- ═══════════════════════════════════════════════════════════════════════════════

insert into weight_logs (user_id, date, weight_lbs, body_fat_pct, source)
select
  user_id, date, weight_lbs, body_fat_pct, 'manual'
from daily_logs
where weight_lbs is not null
on conflict (user_id, date, source) do nothing;


-- ═══════════════════════════════════════════════════════════════════════════════
-- DONE
-- Next: agents start writing to agent_observations during their daily work,
-- maintenance writes life_score_snapshots nightly, and the dashboard reads
-- recent_observations + daily_score_trend on the home page.
-- ═══════════════════════════════════════════════════════════════════════════════
