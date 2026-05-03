// ─────────────────────────────────────────────────────────────────────────────
// Goal scoring — single source of truth for Life Score math.
// ─────────────────────────────────────────────────────────────────────────────

export type GoalPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type TargetType = 'min' | 'max' | 'band' | 'steps' | 'trajectory';
export type Phase = 'cutting' | 'bulking' | 'maintaining';

export interface StepBand { min: number; score: number; }

export interface Goal {
  id: string;
  user_id: string;
  key: string;
  label: string;
  category: string | null;
  metric_source: string;
  period: GoalPeriod;
  target_type: TargetType;
  target_value: number;
  target_max: number | null;
  weight: number;
  is_active: boolean;
  // v2 additions
  target_steps?: StepBand[] | null;
  allow_bonus?: boolean;
  phase?: Phase | null;
  target_change?: number | null;
  absolved_by_goals?: string[];
  absolution_threshold?: number;
  score_only_for_absolution?: boolean;
}

export interface GoalScore {
  goal: Goal;
  actual: number | null;     // null = no data, exclude from average
  score: number | null;      // 0-110, or null if no data
  met: boolean;
  absolvedBy?: string[];     // goal keys that absolved this one in the current period
}

const BONUS_CAP = 110;

/** Score a single goal given its actual measurement. Returns null if no data. */
export const scoreGoal = (goal: Goal, actual: number | null): number | null => {
  if (actual === null || actual === undefined || Number.isNaN(actual)) return null;

  switch (goal.target_type) {
    case 'min': {
      if (goal.target_value <= 0) return 100;
      const ratio = actual / goal.target_value;
      if (ratio >= 1) {
        if (!goal.allow_bonus) return 100;
        // +1 score per 5% over target, capped at +10
        const overPct = (ratio - 1) * 100;
        return Math.min(BONUS_CAP, 100 + Math.min(10, overPct / 5));
      }
      return Math.max(0, ratio * 100);
    }

    case 'max': {
      if (actual <= goal.target_value) return 100;
      // Softened from 2× to 1× — overshooting drops linearly with size of overage relative to target.
      const overage = actual - goal.target_value;
      return Math.max(0, 100 - (overage / goal.target_value) * 100);
    }

    case 'band': {
      const lo = goal.target_value;
      const hi = goal.target_max ?? lo;
      if (actual >= lo && actual <= hi) return 100;
      const distance = actual < lo ? lo - actual : actual - hi;
      const scale = Math.max(hi - lo, lo) || 1;
      return Math.max(0, 100 - (distance / scale) * 100);
    }

    case 'steps': {
      const steps = goal.target_steps;
      if (!steps || steps.length === 0) return null;
      const sorted = [...steps].sort((a, b) => a.min - b.min);
      let score = sorted[0].score;
      for (const s of sorted) {
        if (actual >= s.min) score = s.score;
        else break;
      }
      return score;
    }

    case 'trajectory': {
      // actual = observed delta over the period. target_change = expected delta.
      // phase determines whether positive or negative deltas are "good."
      const phase = goal.phase ?? 'maintaining';
      const target = goal.target_change ?? 0;

      if (phase === 'cutting') {
        // Negative target. More negative = better. Less negative or positive = worse.
        if (actual <= target) return 100;
        // Linear from 100 (at target) → 0 (at +|target|, i.e. moving in wrong direction by target's magnitude)
        const range = Math.max(Math.abs(target), 1);
        const distance = actual - target; // positive = bad
        return Math.max(0, 100 - (distance / (range * 2)) * 100);
      }

      if (phase === 'bulking') {
        if (actual >= target) return 100;
        const range = Math.max(Math.abs(target), 1);
        const distance = target - actual; // positive = bad
        return Math.max(0, 100 - (distance / (range * 2)) * 100);
      }

      // maintaining: target is typically 0; tolerance is target_value treated as ± band width
      const tolerance = goal.target_value || 0.5;
      const distance = Math.abs(actual - target);
      if (distance <= tolerance) return 100;
      const scale = tolerance * 2 || 1;
      return Math.max(0, 100 - ((distance - tolerance) / scale) * 100);
    }
  }
};

/**
 * Apply absolution: any goal whose `absolved_by_goals` contains a key that scored
 * ≥ its absolution_threshold gets dropped from the aggregation pool.
 * Returns the same array with `.absolvedBy` annotated and a separate `eligible` list.
 */
export const applyAbsolution = (goalScores: GoalScore[]): {
  annotated: GoalScore[];
  eligible: GoalScore[];
} => {
  // Map of goal_key -> score (only consider goals that actually scored, including 110 bonuses)
  const scoreByKey = new Map<string, number>();
  for (const gs of goalScores) {
    if (gs.score !== null) scoreByKey.set(gs.goal.key, gs.score);
  }

  const annotated: GoalScore[] = goalScores.map(gs => {
    const absolvers = gs.goal.absolved_by_goals ?? [];
    const threshold = gs.goal.absolution_threshold ?? 80;
    const triggered = absolvers.filter(key => {
      const s = scoreByKey.get(key);
      return s !== undefined && s >= threshold;
    });
    return triggered.length > 0 ? { ...gs, absolvedBy: triggered } : gs;
  });

  const eligible = annotated.filter(gs => {
    if (gs.absolvedBy && gs.absolvedBy.length > 0) return false;
    if (gs.goal.score_only_for_absolution) return false;
    return true;
  });

  return { annotated, eligible };
};

/** Weighted average of an array of GoalScores. Null scores are excluded. Caps at 100. */
export const aggregateScore = (goalScores: GoalScore[]): { score: number | null; counted: number; total: number } => {
  const counted = goalScores.filter(g => g.score !== null);
  if (counted.length === 0) return { score: null, counted: 0, total: goalScores.length };

  let weightSum = 0;
  let weighted = 0;
  for (const g of counted) {
    weightSum += g.goal.weight;
    weighted += (g.score as number) * g.goal.weight;
  }
  const raw = weightSum > 0 ? weighted / weightSum : null;
  // Even though individual goals can hit 110, the aggregate caps at 100 for clean semantics
  return {
    score: raw === null ? null : Math.min(100, raw),
    counted: counted.length,
    total: goalScores.length,
  };
};

/** Determine if a goal "met" based on its score (≥80% threshold). */
export const isGoalMet = (score: number | null): boolean => score !== null && score >= 80;

/** Group goal scores by category, returning weighted avg per category. */
export const scoresByCategory = (goalScores: GoalScore[]): { category: string; score: number | null }[] => {
  const map = new Map<string, GoalScore[]>();
  for (const gs of goalScores) {
    const cat = gs.goal.category || 'other';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(gs);
  }
  return [...map.entries()].map(([category, list]) => ({
    category,
    score: aggregateScore(list).score,
  }));
};

/** Top wins (highest scoring goals) and top drags (lowest scoring) for surfacing on the UI. */
export const topWinsAndDrags = (goalScores: GoalScore[], n = 2) => {
  const scored = goalScores.filter(g => g.score !== null) as Array<GoalScore & { score: number }>;
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const wins = sorted.filter(g => g.score >= 80).slice(0, n);
  const drags = [...sorted].reverse().filter(g => g.score < 60).slice(0, n);
  return { wins, drags };
};
