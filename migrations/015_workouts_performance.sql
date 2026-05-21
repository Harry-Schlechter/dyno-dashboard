-- Add a generic 1-10 performance rating to workouts.
-- Applies across all workout types (basketball, lifts, runs, etc.) so
-- correlations like "sleep vs basketball performance" work via a single column.

ALTER TABLE workouts
  ADD COLUMN IF NOT EXISTS performance int
  CHECK (performance IS NULL OR (performance >= 1 AND performance <= 10));

COMMENT ON COLUMN workouts.performance IS
  'Subjective performance rating 1-10. Optional. Used for correlating workout quality with sleep, nutrition, etc. Same scale across all sports.';
