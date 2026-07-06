-- ═══════════════════════════════════════════════════════════════════════════════
-- Surface daily_vitals to the dashboard + add active-minutes total
-- Created: 2026-07-06
--
-- daily_vitals is written by the VPS google-health-sync.py but the dashboard never
-- read it. This adds the one missing column the sync now populates and a convenience
-- view of recovery-focused metrics for the home page.
-- Additive + idempotent.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Total daily active minutes (sum of Fitbit active-minutes datapoints).
ALTER TABLE daily_vitals ADD COLUMN IF NOT EXISTS active_minutes_total int;

COMMENT ON COLUMN daily_vitals.active_minutes_total IS
  'Sum of Fitbit per-minute active minutes for the day (light+moderate+very).';

-- ── recent_vitals — last 30 days of recovery/wellness signals for the dashboard ─
-- Recovery-focused: the metrics that actually drive "train hard vs rest today".
CREATE OR REPLACE VIEW recent_vitals AS
SELECT
  user_id,
  date,
  resting_hr,
  hrv_rmssd,
  spo2_avg,
  spo2_min,
  breathing_rate_avg,
  skin_temp_deviation,
  steps,
  active_minutes_total,
  very_active_min,
  hr_zone_cardio_min,
  hr_zone_peak_min,
  calories_active,
  calories_total,
  -- 7-day rolling averages for the noisy recovery signals (trend > single night)
  round(avg(resting_hr) OVER w, 1) AS resting_hr_7d_avg,
  round(avg(hrv_rmssd)  OVER w, 1) AS hrv_rmssd_7d_avg
FROM daily_vitals
WHERE date >= current_date - INTERVAL '30 days'
WINDOW w AS (
  PARTITION BY user_id
  ORDER BY date
  ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
);
