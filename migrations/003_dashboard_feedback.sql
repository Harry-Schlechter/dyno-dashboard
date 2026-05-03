-- ═══════════════════════════════════════════════════════════════════════════════
-- 003 — dashboard_feedback: edit-back channel from UI → agent memory
--
-- The VPS runs bin/sync-feedback.py on a cron. That script reads unsynced rows,
-- appends them to the relevant persona's memory/<YYYY-MM-DD>.md file, then sets
-- synced_at. The dashboard never touches files; the VPS never touches the UI.
-- The single table is the message bus.
--
-- Adds:
--   • dashboard_feedback   — every signal Harry sends from the UI
--   • feedback_unsynced    — convenience view (synced_at IS NULL)
--
-- Idempotent. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════════

create table if not exists dashboard_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,

  -- Routing
  agent_id text not null,                   -- which persona should hear this
  source text not null default 'ui',        -- 'ui' (typed by Harry), 'reaction' (mirrored from observation_feedback)

  -- What kind of signal this is
  kind text not null check (kind in (
    'note',           -- free-form text from Harry
    'correction',     -- "you got this wrong" — pointer + correction
    'praise',         -- "this was useful, do more of this"
    'redirect',       -- "stop doing X, start doing Y"
    'reaction'        -- mirrored thumbs/star/dismiss from observation_feedback
  )),

  -- Content
  body text not null,
  context jsonb,                            -- {observation_id?, page?, value?, reaction?}

  -- Lifecycle
  synced_at timestamptz,                    -- set by VPS poller after appending to persona memory
  sync_attempts int not null default 0,
  sync_error text,

  created_at timestamptz not null default now()
);

create index if not exists dashboard_feedback_unsynced
  on dashboard_feedback(agent_id, created_at) where synced_at is null;
create index if not exists dashboard_feedback_user_created
  on dashboard_feedback(user_id, created_at desc);

alter table dashboard_feedback enable row level security;

drop policy if exists "Users can view their own dashboard_feedback" on dashboard_feedback;
drop policy if exists "Users can insert their own dashboard_feedback" on dashboard_feedback;
drop policy if exists "Service role can update dashboard_feedback" on dashboard_feedback;

create policy "Users can view their own dashboard_feedback"
  on dashboard_feedback for select using (auth.uid() = user_id);
create policy "Users can insert their own dashboard_feedback"
  on dashboard_feedback for insert with check (auth.uid() = user_id);
-- Service role (the VPS poller) bypasses RLS entirely; no policy needed for updates from there.
-- A user-side update policy would be a foot-gun, so we don't define one.


create or replace view feedback_unsynced as
select * from dashboard_feedback
where synced_at is null
order by created_at;


-- ═══════════════════════════════════════════════════════════════════════════════
-- DONE
-- ═══════════════════════════════════════════════════════════════════════════════
