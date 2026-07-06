-- ═══════════════════════════════════════════════════════════════════════════════
-- Recovery scores — a Whoop-style daily recovery index
-- Created: 2026-07-06
--
-- Computed nightly by bin/compute-recovery.py from daily_vitals + sleep, as a
-- weighted composite vs the user's own 30-day rolling baselines:
--   HRV (~50%) + resting HR (~25%) + respiratory rate (~10%) + sleep (~15%),
-- with SpO2 / skin-temp anomaly flags. Each score carries a confidence level so
-- the UI/agent never implies precision when inputs are missing.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS recovery_scores (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date          date NOT NULL,

  -- 0-100 composite. NULL if not enough signal to score at all.
  score         int CHECK (score IS NULL OR (score BETWEEN 0 AND 100)),
  band          text CHECK (band IN ('green', 'yellow', 'red')),   -- >=67 green, 34-66 yellow, <34 red
  confidence    text NOT NULL DEFAULT 'low'
                CHECK (confidence IN ('high', 'medium', 'low')),

  -- Per-driver z-scores vs 30d baseline (signed: + = better than baseline).
  hrv_z         numeric,
  rhr_z         numeric,
  resp_z        numeric,
  sleep_score   int,          -- 0-100 sleep-performance sub-score

  -- The raw inputs used, for transparency + the driver breakdown UI.
  hrv_rmssd     numeric,
  hrv_baseline  numeric,
  resting_hr    int,
  rhr_baseline  numeric,
  resp_rate     numeric,
  sleep_hours   numeric,
  sleep_eff     int,
  deep_min      int,
  rem_min       int,

  -- Flags + prose the agent/dashboard can surface directly.
  flags         text[] NOT NULL DEFAULT '{}',   -- e.g. {'elevated_skin_temp','low_spo2','poor_sleep'}
  drivers       jsonb,                            -- [{name, contribution, note}] ranked
  summary       text,                             -- one-line plain-English readout

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS recovery_scores_user_date
  ON recovery_scores (user_id, date);
CREATE INDEX IF NOT EXISTS recovery_scores_user_date_desc
  ON recovery_scores (user_id, date DESC);

ALTER TABLE recovery_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own recovery_scores select" ON recovery_scores;
DROP POLICY IF EXISTS "own recovery_scores insert" ON recovery_scores;
DROP POLICY IF EXISTS "own recovery_scores update" ON recovery_scores;
CREATE POLICY "own recovery_scores select" ON recovery_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own recovery_scores insert" ON recovery_scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own recovery_scores update" ON recovery_scores FOR UPDATE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION recovery_scores_set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_recovery_scores_updated_at ON recovery_scores;
CREATE TRIGGER trg_recovery_scores_updated_at
  BEFORE UPDATE ON recovery_scores
  FOR EACH ROW EXECUTE FUNCTION recovery_scores_set_updated_at();
