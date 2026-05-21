-- ═══════════════════════════════════════════════════════════════════════════════
-- 011 — agent_briefings
--
-- Agents post structured briefings (morning, evening, weekly, etc.) here. The
-- dashboard reads this table and renders a Briefing card on Home. Agents only
-- write their EDITORIAL layer (focus, asks, wins/missed observations, weather,
-- etc.) — facts already in the DB (meals, workouts, sleep, weight, txns, events,
-- tasks) are sourced from their own tables and NOT duplicated here.
--
-- Auto-cleanup: rows older than 7 days are deleted by the daily insight cron.
-- ═══════════════════════════════════════════════════════════════════════════════

create table if not exists agent_briefings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null,
  agent_id      text not null,                -- 'personal-assistant', 'financial-advisor', etc.
  kind          text not null,                -- 'morning' | 'evening' | 'weekly' | free string
  for_date      date not null,                -- the day this briefing is ABOUT
  generated_at  timestamptz not null default now(),
  headline      text not null,                -- ≤80 chars, also sent to Telegram
  body          jsonb,                        -- { sections: [{ kind, label, items }, ...] }
  raw_text      text,                         -- optional prose fallback
  created_at    timestamptz not null default now()
);

create index if not exists agent_briefings_user_recent
  on agent_briefings(user_id, generated_at desc);

create index if not exists agent_briefings_for_date
  on agent_briefings(user_id, for_date desc, kind);

alter table agent_briefings enable row level security;

drop policy if exists "Users can view their own briefings" on agent_briefings;
drop policy if exists "Users can insert their own briefings" on agent_briefings;
drop policy if exists "Users can delete their own briefings" on agent_briefings;

create policy "Users can view their own briefings"
  on agent_briefings for select using (auth.uid() = user_id);
create policy "Users can insert their own briefings"
  on agent_briefings for insert with check (auth.uid() = user_id);
create policy "Users can delete their own briefings"
  on agent_briefings for delete using (auth.uid() = user_id);
