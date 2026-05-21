-- ═══════════════════════════════════════════════════════════════════════════════
-- 012 — agent_task_queue
--
-- Two-tier voice architecture: the `general` agent answers in <2s with a Haiku
-- model, then dispatches actual work (DB writes, lookups) to specialist agents
-- via this queue. A background worker polls the queue every few seconds and
-- spawns the assignee agent to run the task.
--
-- Auto-cleanup: rows older than 7 days are deleted by the daily insight cron.
-- ═══════════════════════════════════════════════════════════════════════════════

create table if not exists agent_task_queue (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null,

  requesting_agent text not null,           -- 'general' (almost always)
  assignee_agent   text not null,           -- 'nutritionist' | 'trainer' | 'financial-advisor' | etc.
  intent           text not null,           -- 'log' | 'query' | 'action' (for the followup voice differentiator)
  prompt           text not null,           -- the actual instruction the assignee runs

  -- conversation linkage so we can attach results to the right session
  conversation_id  text,                    -- e.g. 'voice:2026-05-08T17:42:00'
  related_message  text,                    -- the user's verbatim transcript that triggered this

  status           text not null default 'pending'
                   check (status in ('pending','running','done','failed')),
  result           text,                    -- assignee's reply text (for the followup spoken to Harry)
  result_summary   text,                    -- short version for logging
  error            text,
  attempts         int not null default 0,

  -- followup delivery: has the voice page already played the result back?
  delivered_to_voice boolean not null default false,
  delivered_at     timestamptz,

  created_at       timestamptz not null default now(),
  started_at       timestamptz,
  completed_at     timestamptz
);

create index if not exists agent_task_queue_pending
  on agent_task_queue(status, created_at) where status in ('pending','running');

create index if not exists agent_task_queue_undelivered
  on agent_task_queue(user_id, completed_at desc) where status = 'done' and delivered_to_voice = false;

create index if not exists agent_task_queue_user_recent
  on agent_task_queue(user_id, created_at desc);

alter table agent_task_queue enable row level security;

drop policy if exists "Users can view their own tasks" on agent_task_queue;
drop policy if exists "Users can insert their own tasks" on agent_task_queue;
drop policy if exists "Users can update their own tasks" on agent_task_queue;
drop policy if exists "Users can delete their own tasks" on agent_task_queue;

create policy "Users can view their own tasks"
  on agent_task_queue for select using (auth.uid() = user_id);
create policy "Users can insert their own tasks"
  on agent_task_queue for insert with check (auth.uid() = user_id);
create policy "Users can update their own tasks"
  on agent_task_queue for update using (auth.uid() = user_id);
create policy "Users can delete their own tasks"
  on agent_task_queue for delete using (auth.uid() = user_id);
