import { useMemo } from 'react';
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns';
import { useGoals } from './useGoals';
import { useSupabase } from './useSupabase';
import { useFinances } from './useFinances';
import {
  Goal, GoalScore, scoreGoal, aggregateScore, applyAbsolution, GoalPeriod,
} from '../lib/goalScoring';
import { resolveMetric, MetricBundle, DateRange, LifeEvent } from '../lib/metricResolver';

export interface PeriodResult {
  label: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
  range: DateRange;
  score: number | null;
  counted: number;        // # of goals contributing to the average
  total: number;          // # of goals applicable to this period
  goalScores: GoalScore[]; // annotated with absolvedBy
}

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

export const useLifeScore = (today = new Date()) => {
  const goals = useGoals();
  const sleep = useSupabase<{ date: string; hours: number | null; quality: number | null }>({
    table: 'sleep',
    order: { column: 'date', ascending: false },
    limit: 500,
  });
  const meals = useSupabase<{ date: string; calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null }>({
    table: 'meals',
    order: { column: 'date', ascending: false },
    limit: 1000,
  });
  const workouts = useSupabase<{ date: string; name: string | null; duration_min: number | null }>({
    table: 'workouts',
    order: { column: 'date', ascending: false },
    limit: 500,
  });
  const dailyLogs = useSupabase<{ date: string; mood: number | null; energy: number | null; stress: number | null; weight_lbs: number | null }>({
    table: 'daily_logs',
    order: { column: 'date', ascending: false },
    limit: 500,
  });
  const lifeEvents = useSupabase<LifeEvent>({
    table: 'life_events',
    order: { column: 'start_date', ascending: false },
    limit: 500,
  });
  const fin = useFinances();

  const bundle: MetricBundle = useMemo(() => ({
    sleep: sleep.data,
    meals: meals.data,
    workouts: workouts.data,
    dailyLogs: dailyLogs.data,
    transactions: fin.transactions,
    lifeEvents: lifeEvents.data,
  }), [sleep.data, meals.data, workouts.data, dailyLogs.data, fin.transactions, lifeEvents.data]);

  const periods = useMemo(() => {
    const todayKey = fmt(today);
    const yesterday = fmt(subDays(today, 1));
    const weekStart = fmt(startOfWeek(today, { weekStartsOn: 1 }));
    const monthStart = fmt(startOfMonth(today));
    const yearStart = fmt(subDays(today, 364));

    return {
      daily:   { start: yesterday,  end: yesterday },
      today:   { start: todayKey,   end: todayKey },
      weekly:  { start: weekStart,  end: todayKey },
      monthly: { start: monthStart, end: todayKey },
      yearly:  { start: yearStart,  end: todayKey },
    };
  }, [today]);

  const goalsByPeriod = useMemo(() => {
    const map: Record<GoalPeriod, Goal[]> = { daily: [], weekly: [], monthly: [], yearly: [] };
    for (const g of goals.data) {
      if (g.is_active) map[g.period].push(g);
    }
    return map;
  }, [goals.data]);

  /**
   * Score the goals for a period and apply absolution.
   * Absolution looks at the same period — so a weekly goal can be absolved by another
   * weekly goal scoring high (e.g. social_week absolves dining_week within the same week).
   * For multi-period interactions (e.g. monthly_savings absolved by travel_days which is weekly),
   * we also pull all weekly+monthly+daily absolvers from their natural ranges and check them too.
   */
  const scoreAndAbsolve = (period: GoalPeriod, range: DateRange): GoalScore[] => {
    const goalsForPeriod = goalsByPeriod[period];
    const baseScores: GoalScore[] = goalsForPeriod.map(goal => {
      const actual = resolveMetric(goal.metric_source, bundle, range);
      const score = scoreGoal(goal, actual);
      return { goal, actual, score, met: score !== null && score >= 80 };
    });

    // Cross-period absolvers: any goal whose key shows up in absolved_by_goals but isn't
    // in the current period needs to be scored against ITS OWN period range.
    const absolverKeys = new Set<string>();
    for (const gs of baseScores) {
      for (const k of gs.goal.absolved_by_goals ?? []) absolverKeys.add(k);
    }
    const externalAbsolverScores: GoalScore[] = [];
    for (const k of absolverKeys) {
      // already in current period? skip — it's already in baseScores
      if (baseScores.some(gs => gs.goal.key === k)) continue;
      const absolverGoal = goals.data.find(g => g.is_active && g.key === k);
      if (!absolverGoal) continue;
      const absolverRange = absolverGoal.period === period ? range : (() => {
        switch (absolverGoal.period) {
          case 'daily':   return periods.daily;
          case 'weekly':  return periods.weekly;
          case 'monthly': return periods.monthly;
          case 'yearly':  return periods.yearly;
        }
      })();
      const actual = resolveMetric(absolverGoal.metric_source, bundle, absolverRange);
      const score = scoreGoal(absolverGoal, actual);
      externalAbsolverScores.push({ goal: absolverGoal, actual, score, met: score !== null && score >= 80 });
    }

    const { annotated } = applyAbsolution([...baseScores, ...externalAbsolverScores]);
    // Only return annotations for the goals that actually belong to this period
    return annotated.filter(gs => baseScores.some(b => b.goal.id === gs.goal.id));
  };

  // ── Daily ────────────────────────────────────────────────────────────────
  const dailyGoalScores = useMemo(() => scoreAndAbsolve('daily', periods.daily), [goalsByPeriod, bundle, periods, goals.data]);
  const dailyAgg = useMemo(() => {
    const eligible = dailyGoalScores.filter(gs => !gs.absolvedBy?.length && !gs.goal.score_only_for_absolution);
    return aggregateScore(eligible);
  }, [dailyGoalScores]);

  // Helper: compute per-day daily-period score with absolution applied (for weekly/monthly/yearly rollup).
  const dailyScoreOn = (date: string): number | null => {
    const range = { start: date, end: date };
    const scored: GoalScore[] = goalsByPeriod.daily.map(goal => {
      const actual = resolveMetric(goal.metric_source, bundle, range);
      const score = scoreGoal(goal, actual);
      return { goal, actual, score, met: score !== null && score >= 80 };
    });
    // Add cross-period absolvers from their own ranges (use today's periods as approximation —
    // for historical days, a perfect implementation would re-window absolvers. Acceptable simplification.)
    const absolverKeys = new Set<string>();
    for (const gs of scored) for (const k of gs.goal.absolved_by_goals ?? []) absolverKeys.add(k);
    const external: GoalScore[] = [];
    for (const k of absolverKeys) {
      if (scored.some(gs => gs.goal.key === k)) continue;
      const absolverGoal = goals.data.find(g => g.is_active && g.key === k);
      if (!absolverGoal) continue;
      const absolverRange = absolverGoal.period === 'daily' ? range
        : absolverGoal.period === 'weekly' ? { start: fmt(subDays(new Date(date + 'T00:00:00'), 6)), end: date }
        : absolverGoal.period === 'monthly' ? { start: fmt(startOfMonth(new Date(date + 'T00:00:00'))), end: date }
        : { start: fmt(subDays(new Date(date + 'T00:00:00'), 364)), end: date };
      const actual = resolveMetric(absolverGoal.metric_source, bundle, absolverRange);
      const score = scoreGoal(absolverGoal, actual);
      external.push({ goal: absolverGoal, actual, score, met: score !== null && score >= 80 });
    }
    const { eligible } = applyAbsolution([...scored, ...external]);
    const dayGoalScores = eligible.filter(gs => scored.some(s => s.goal.id === gs.goal.id));
    const agg = aggregateScore(dayGoalScores);
    return agg.score;
  };

  // ── Weekly ───────────────────────────────────────────────────────────────
  const weeklyGoalScores = useMemo(() => scoreAndAbsolve('weekly', periods.weekly), [goalsByPeriod, bundle, periods, goals.data]);
  const weeklyDailyScores = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < 7; i++) {
      const d = fmt(subDays(today, i));
      const s = dailyScoreOn(d);
      if (s !== null) out.push(s);
    }
    return out;
  }, [goalsByPeriod, bundle, today, goals.data]);

  const weeklyAgg = useMemo(() => {
    const eligible = weeklyGoalScores.filter(gs => !gs.absolvedBy?.length && !gs.goal.score_only_for_absolution);
    const wAgg = aggregateScore(eligible);
    const dailyAvg = weeklyDailyScores.length > 0
      ? weeklyDailyScores.reduce((a, b) => a + b, 0) / weeklyDailyScores.length
      : null;

    if (wAgg.score === null && dailyAvg === null) return { score: null, counted: 0, total: weeklyGoalScores.length };
    if (wAgg.score === null) return { score: dailyAvg, counted: weeklyDailyScores.length, total: weeklyDailyScores.length };
    if (dailyAvg === null) return wAgg;
    return {
      score: (wAgg.score + dailyAvg) / 2,
      counted: wAgg.counted + weeklyDailyScores.length,
      total: wAgg.total + weeklyDailyScores.length,
    };
  }, [weeklyGoalScores, weeklyDailyScores]);

  // ── Monthly ──────────────────────────────────────────────────────────────
  const monthlyGoalScores = useMemo(() => scoreAndAbsolve('monthly', periods.monthly), [goalsByPeriod, bundle, periods, goals.data]);
  const monthlyDailyScores = useMemo(() => {
    const out: number[] = [];
    const end = new Date(periods.monthly.end + 'T00:00:00');
    const start = new Date(periods.monthly.start + 'T00:00:00');
    const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    for (let i = 0; i < days; i++) {
      const d = fmt(subDays(end, i));
      const s = dailyScoreOn(d);
      if (s !== null) out.push(s);
    }
    return out;
  }, [goalsByPeriod, bundle, periods, goals.data]);

  const monthlyAgg = useMemo(() => {
    const eligible = monthlyGoalScores.filter(gs => !gs.absolvedBy?.length && !gs.goal.score_only_for_absolution);
    const mAgg = aggregateScore(eligible);
    const dailyAvg = monthlyDailyScores.length > 0
      ? monthlyDailyScores.reduce((a, b) => a + b, 0) / monthlyDailyScores.length
      : null;
    if (mAgg.score === null && dailyAvg === null) return { score: null, counted: 0, total: monthlyGoalScores.length };
    if (mAgg.score === null) return { score: dailyAvg, counted: monthlyDailyScores.length, total: monthlyDailyScores.length };
    if (dailyAvg === null) return mAgg;
    return {
      score: (mAgg.score + dailyAvg) / 2,
      counted: mAgg.counted + monthlyDailyScores.length,
      total: mAgg.total + monthlyDailyScores.length,
    };
  }, [monthlyGoalScores, monthlyDailyScores]);

  // ── Yearly: 365-day rolling avg of (absolution-aware) daily scores ───────
  const yearlyAgg = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < 365; i++) {
      const d = fmt(subDays(today, i));
      const s = dailyScoreOn(d);
      if (s !== null) out.push(s);
    }
    if (out.length === 0) return { score: null, counted: 0, total: 365 };
    return {
      score: out.reduce((a, b) => a + b, 0) / out.length,
      counted: out.length,
      total: 365,
    };
  }, [goalsByPeriod, bundle, today, goals.data]);

  const results: PeriodResult[] = useMemo(() => [
    { label: 'Daily',   range: periods.daily,   score: dailyAgg.score,   counted: dailyAgg.counted,   total: dailyAgg.total,   goalScores: dailyGoalScores },
    { label: 'Weekly',  range: periods.weekly,  score: weeklyAgg.score,  counted: weeklyAgg.counted,  total: weeklyAgg.total,  goalScores: weeklyGoalScores },
    { label: 'Monthly', range: periods.monthly, score: monthlyAgg.score, counted: monthlyAgg.counted, total: monthlyAgg.total, goalScores: monthlyGoalScores },
    { label: 'Yearly',  range: periods.yearly,  score: yearlyAgg.score,  counted: yearlyAgg.counted,  total: yearlyAgg.total,  goalScores: [] },
  ], [periods, dailyAgg, weeklyAgg, monthlyAgg, yearlyAgg, dailyGoalScores, weeklyGoalScores, monthlyGoalScores]);

  const goalsErr = goals.error?.toLowerCase() || '';
  const eventsErr = lifeEvents.error?.toLowerCase() || '';
  const tableMissing = (s: string) => s.includes('schema cache') || s.includes('not find');

  return {
    results,
    bundle,
    periods,
    /** Score for a specific historical day (absolution-aware). Used by the calendar heatmap. */
    dailyScoreOn,
    loading: goals.loading || sleep.loading || meals.loading || workouts.loading || dailyLogs.loading || fin.loading,
    error: goals.error || sleep.error || meals.error || workouts.error || dailyLogs.error || fin.error,
    goalsTableMissing: tableMissing(goalsErr),
    lifeEventsTableMissing: tableMissing(eventsErr),
  };
};
