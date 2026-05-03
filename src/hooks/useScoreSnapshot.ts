import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { supabase, USER_ID } from '../lib/supabase';
import { GoalScore } from '../lib/goalScoring';

interface SnapshotInput {
  score: number | null;
  goalScores: GoalScore[];
}

/**
 * Writes a daily life_score_snapshots row once per session, idempotent on
 * (user_id, date, period) thanks to the unique index in migration 002.
 *
 * We don't try to win a race — if anything goes wrong, just skip silently.
 * The cron / next session will catch up.
 */
export const useScoreSnapshot = (daily: SnapshotInput) => {
  const written = useRef(false);

  useEffect(() => {
    if (written.current) return;
    if (daily.score == null) return;
    if (daily.goalScores.length === 0) return;

    written.current = true;

    const today = format(new Date(), 'yyyy-MM-dd');

    const slim = daily.goalScores.map(gs => ({
      goal_key: gs.goal.key,
      score: gs.score,
      actual: gs.actual,
      target: gs.goal.target_value,
      target_max: gs.goal.target_max,
      target_type: gs.goal.target_type,
      weight: gs.goal.weight ?? 1,
      absolved_by: gs.absolvedBy ?? null,
    }));

    void supabase
      .from('life_score_snapshots')
      .upsert(
        {
          user_id: USER_ID,
          date: today,
          period: 'daily',
          total_score: daily.score,
          goal_scores: slim,
        },
        { onConflict: 'user_id,date,period' }
      )
      .then(({ error }) => {
        if (error) console.warn('life_score_snapshot upsert failed', error.message);
      });
  }, [daily.score, daily.goalScores.length]);
};
