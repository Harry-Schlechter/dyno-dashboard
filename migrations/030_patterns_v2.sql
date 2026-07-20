-- ═══════════════════════════════════════════════════════════════════════════════
-- Patterns v2 — acknowledge/pin loop + forecasting with self-scoring
-- Created: 2026-07-15
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Acknowledge / Pin on observations ─────────────────────────────────────────
-- Solves "obvious patterns nag repeatedly": you acknowledge one → engine won't
-- resurface it unless the underlying number MATERIALLY changes. Pin keeps it visible.
ALTER TABLE agent_observations ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz;
ALTER TABLE agent_observations ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;
-- A stable fingerprint of WHAT the pattern is about (kind+subject), independent of the
-- exact numbers, so the engine can tell "same pattern, changed magnitude" from "new pattern".
ALTER TABLE agent_observations ADD COLUMN IF NOT EXISTS pattern_key text;
-- The headline magnitude when last shown (e.g. effect size / % delta) — lets the engine
-- detect a material change vs an acknowledged baseline.
ALTER TABLE agent_observations ADD COLUMN IF NOT EXISTS magnitude numeric;
-- Surprise score 0-1 (deviation from base rates) for ranking.
ALTER TABLE agent_observations ADD COLUMN IF NOT EXISTS surprise numeric;

CREATE INDEX IF NOT EXISTS agent_observations_pattern_key
  ON agent_observations (user_id, pattern_key) WHERE pattern_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS agent_observations_pinned
  ON agent_observations (user_id, pinned) WHERE pinned = true;

-- ── Predictions — the self-scoring forecaster ─────────────────────────────────
CREATE TABLE IF NOT EXISTS predictions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  made_on      date NOT NULL,                 -- when the forecast was generated
  target_date  date NOT NULL,                 -- the day it's about (usually made_on + 1)

  -- What's being predicted.
  metric       text NOT NULL,                 -- 'recovery_band' | 'workout_performance' | 'sleep_hours' | 'mood' | 'spend' …
  predicted    text NOT NULL,                 -- human-readable predicted value ('red', '≈6.5h', 'below avg')
  predicted_num numeric,                       -- numeric form when applicable (for error calc)
  band         text,                           -- optional coarse bucket: 'low'|'mid'|'high' / 'red'|'yellow'|'green'
  confidence   numeric CHECK (confidence IS NULL OR (confidence BETWEEN 0 AND 1)),
  rationale    text NOT NULL,                 -- the reasoning ("2 nights short sleep + hard workout")
  basis        jsonb,                          -- structured inputs the forecast used

  -- Filled in by the daily scorer once target_date has data.
  actual       text,
  actual_num   numeric,
  correct      boolean,                        -- did it land? (band match or within tolerance)
  error        numeric,                        -- |predicted_num - actual_num| when numeric
  scored_at    timestamptz,

  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS predictions_user_target_metric
  ON predictions (user_id, target_date, metric);
CREATE INDEX IF NOT EXISTS predictions_user_made
  ON predictions (user_id, made_on DESC);
CREATE INDEX IF NOT EXISTS predictions_unscored
  ON predictions (user_id, target_date) WHERE scored_at IS NULL;

ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own predictions" ON predictions;
CREATE POLICY "own predictions" ON predictions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── forecast_accuracy: rolling hit-rate per metric (dashboard reads this) ──────
CREATE OR REPLACE VIEW forecast_accuracy AS
SELECT
  user_id,
  metric,
  count(*) FILTER (WHERE scored_at IS NOT NULL)                    AS scored,
  count(*) FILTER (WHERE correct)                                  AS hits,
  round(
    100.0 * count(*) FILTER (WHERE correct)
    / NULLIF(count(*) FILTER (WHERE scored_at IS NOT NULL), 0), 0) AS hit_rate_pct,
  avg(error) FILTER (WHERE error IS NOT NULL)                      AS avg_error
FROM predictions
WHERE made_on >= current_date - INTERVAL '90 days'
GROUP BY user_id, metric;
