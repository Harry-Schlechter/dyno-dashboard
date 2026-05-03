// Strength-training analytics: Epley 1RM estimation, PR detection, volume.

export interface ExerciseSet {
  workout_id: string;
  exercise_name: string;
  set_number: number;
  reps: number | null;
  weight_lbs: number | null;
  rpe: number | null;
  is_pr: boolean | null;
}

export interface SetWithDate extends ExerciseSet {
  date: string; // joined from workouts.date
}

/** Epley estimated 1RM: w × (1 + r/30). Best for 1-12 reps; gets noisy past 15. */
export const epley1RM = (weight: number | null, reps: number | null): number | null => {
  if (weight == null || reps == null || weight <= 0 || reps <= 0) return null;
  if (reps > 15) return null; // formula breaks down for high reps
  return weight * (1 + reps / 30);
};

/** Best estimated 1RM across all sets in a session (workout). */
export const sessionBest1RM = (sets: ExerciseSet[]): number | null => {
  let best: number | null = null;
  for (const s of sets) {
    const e = epley1RM(s.weight_lbs, s.reps);
    if (e !== null && (best === null || e > best)) best = e;
  }
  return best;
};

export interface SessionPoint {
  date: string;
  workout_id: string;
  best1RM: number;       // est. 1RM, that session's high
  topWeight: number;     // heaviest weight × any reps that session
  topWeightReps: number; // reps at that top weight
  volume: number;        // Σ(reps × weight) across all sets that session
  sets: ExerciseSet[];
}

/** Roll up sets into per-session points for a given exercise. */
export const sessionsForExercise = (sets: SetWithDate[], exercise: string): SessionPoint[] => {
  const filtered = sets.filter(s => s.exercise_name === exercise);
  const byWorkout = new Map<string, SetWithDate[]>();
  for (const s of filtered) {
    if (!byWorkout.has(s.workout_id)) byWorkout.set(s.workout_id, []);
    byWorkout.get(s.workout_id)!.push(s);
  }
  const points: SessionPoint[] = [];
  for (const [workout_id, ws] of byWorkout) {
    const best1 = sessionBest1RM(ws);
    if (best1 === null) continue;
    let topW = 0, topReps = 0, volume = 0;
    for (const s of ws) {
      const w = s.weight_lbs ?? 0;
      const r = s.reps ?? 0;
      volume += w * r;
      if (w > topW) { topW = w; topReps = r; }
    }
    points.push({
      date: ws[0].date,
      workout_id,
      best1RM: best1,
      topWeight: topW,
      topWeightReps: topReps,
      volume,
      sets: ws,
    });
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
};

export interface DetectedPR {
  date: string;
  exercise: string;
  best1RM: number;
  topWeight: number;
  topWeightReps: number;
  prevBest1RM: number | null;
  improvementPct: number | null;
  flaggedManually: boolean; // whether is_pr was true on at least one set
}

/**
 * Auto-detect PRs by exercise: a session is a PR if its best-1RM exceeds the running max
 * across all prior sessions for that exercise. Also respects manually-flagged is_pr.
 */
export const detectPRs = (sets: SetWithDate[]): DetectedPR[] => {
  const byExercise = new Map<string, SetWithDate[]>();
  for (const s of sets) {
    if (!byExercise.has(s.exercise_name)) byExercise.set(s.exercise_name, []);
    byExercise.get(s.exercise_name)!.push(s);
  }
  const prs: DetectedPR[] = [];
  for (const [exercise, exSets] of byExercise) {
    const sessions = sessionsForExercise(exSets, exercise);
    let runningMax: number | null = null;
    for (const s of sessions) {
      const wasManualPR = s.sets.some(x => x.is_pr === true);
      if ((runningMax === null || s.best1RM > runningMax) || wasManualPR) {
        prs.push({
          date: s.date,
          exercise,
          best1RM: s.best1RM,
          topWeight: s.topWeight,
          topWeightReps: s.topWeightReps,
          prevBest1RM: runningMax,
          improvementPct: runningMax === null ? null : ((s.best1RM - runningMax) / runningMax) * 100,
          flaggedManually: wasManualPR,
        });
        if (runningMax === null || s.best1RM > runningMax) runningMax = s.best1RM;
      }
    }
  }
  return prs.sort((a, b) => b.date.localeCompare(a.date));
};

/** Top exercises by session count (for picking which to feature on the page). */
export const topExercisesByVolume = (sets: SetWithDate[], n = 6): { exercise: string; sessions: number; totalVolume: number }[] => {
  const byEx = new Map<string, { workouts: Set<string>; volume: number }>();
  for (const s of sets) {
    if (!byEx.has(s.exercise_name)) byEx.set(s.exercise_name, { workouts: new Set(), volume: 0 });
    const e = byEx.get(s.exercise_name)!;
    e.workouts.add(s.workout_id);
    e.volume += (s.weight_lbs ?? 0) * (s.reps ?? 0);
  }
  return [...byEx.entries()]
    .map(([exercise, v]) => ({ exercise, sessions: v.workouts.size, totalVolume: v.volume }))
    .sort((a, b) => b.sessions - a.sessions || b.totalVolume - a.totalVolume)
    .slice(0, n);
};
