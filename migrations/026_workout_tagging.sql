-- ═══════════════════════════════════════════════════════════════════════════════
-- Workout tagging + Fitbit-derived sessions
-- Created: 2026-07-06
--
-- The Google Health API has NO discrete workout-session data type, so the daily
-- health sync DERIVES workout candidates from contiguous active-minute blocks and
-- inserts them as `needs_review` rows. The agent then asks "what was this session?",
-- tags it (name + activity_type), and confirms it — merging into a same-day manual
-- workout if one exists.
--
-- This migration adds the columns that machinery needs. Fully additive + idempotent.
-- Existing rows are backfilled to source='manual', review_status='confirmed' so all
-- history stays exactly as-is.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Provenance ────────────────────────────────────────────────────────────────
ALTER TABLE workouts
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'google_health', 'agent'));

-- ── Structured activity type (for correlations) + free-text tags ──────────────
ALTER TABLE workouts
  ADD COLUMN IF NOT EXISTS activity_type text;   -- normalized: 'basketball','run','lift','bike','walk','hike','swim','other'
ALTER TABLE workouts
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- ── Review lifecycle ──────────────────────────────────────────────────────────
ALTER TABLE workouts
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'confirmed'
    CHECK (review_status IN ('needs_review', 'confirmed'));

-- ── Cardio enrichment (populated for Fitbit-derived sessions) ─────────────────
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS avg_hr int;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS max_hr int;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS active_calories int;

-- ── Session timing (from the detected active block; local time) ───────────────
-- Lets the agent say "your 4:16pm session" and lets same-day merges match by time.
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS session_start timestamptz;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS session_end   timestamptz;

-- ── Dedup key for the sync: at most one derived session per (user, date) ──────
-- Partial unique index so re-running the sync UPSERTs the same derived row
-- instead of piling up duplicates. Manual rows are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS workouts_user_date_health_unique
  ON workouts (user_id, date)
  WHERE source = 'google_health';

-- ── Review queue lookup (agent scans this) ────────────────────────────────────
CREATE INDEX IF NOT EXISTS workouts_user_needs_review
  ON workouts (user_id, date DESC)
  WHERE review_status = 'needs_review';

CREATE INDEX IF NOT EXISTS workouts_user_activity_type
  ON workouts (user_id, activity_type, date DESC)
  WHERE activity_type IS NOT NULL;

-- ── Backfill existing rows: everything currently there is a confirmed manual log ─
UPDATE workouts
   SET source = 'manual',
       review_status = 'confirmed'
 WHERE source IS NULL
    OR review_status IS NULL;

COMMENT ON COLUMN workouts.source IS
  'Provenance: manual (Harry logged it), google_health (derived from Fitbit active blocks), agent.';
COMMENT ON COLUMN workouts.activity_type IS
  'Normalized activity for correlations: basketball/run/lift/bike/walk/hike/swim/other. NULL until tagged.';
COMMENT ON COLUMN workouts.review_status IS
  'needs_review = auto-derived, waiting for Harry to tell the agent what it was; confirmed = named/verified.';
COMMENT ON COLUMN workouts.session_start IS
  'Local-time start of the detected active block (Fitbit-derived sessions). NULL for manual logs.';
