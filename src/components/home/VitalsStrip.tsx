import React, { useMemo } from 'react';
import { Card, CardContent, Typography, Box, Grid } from '@mui/material';
import { TrendingUp, TrendingDown, Remove, Bedtime, LocalFireDepartment, MonitorWeight, FitnessCenter, EmojiEmotions } from '@mui/icons-material';
import { format, subDays } from 'date-fns';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { useSupabase } from '../../hooks/useSupabase';

// Vital model: each tile shows a 7-day rolling average for its primary metric,
// the delta vs the prior 7 days (so you can see "trending up/down/flat"), and
// a tiny 14-day sparkline. No targets, no scores — just awareness.

interface SleepRow   { date: string; hours: number | null }
interface MealRow    { date: string; calories: number | null; protein_g: number | null }
interface DailyLog   { date: string; weight_lbs: number | null; mood: number | null }
interface WorkoutRow { date: string; duration_min: number | null }

// A day counts as "fully logged" only if calorie sum ≥ this. Days with
// just a single lunch logged (~1,200 cal) get excluded from nutrition averages
// because they distort downward — the rest of the day's intake just wasn't logged.
const COMPLETE_DAY_CALORIE_THRESHOLD = 1500;

interface VitalSpec {
  label: string;
  icon: React.ReactNode;
  color: string;
  unit: string;
  // current period 7d avg (or null when no data)
  current: number | null;
  // prior period 7d avg (or null when no data)
  prior: number | null;
  // sparkline points: oldest → newest, 14 days
  spark: { value: number }[];
  // direction interpretation: 'up_good' (higher = better), 'down_good', 'neutral'
  direction: 'up_good' | 'down_good' | 'neutral';
  formatValue: (v: number) => string;
}

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

// Average over a date range, ignoring nulls. Returns null if no rows have data.
const avgInRange = <T,>(
  rows: T[],
  getDate: (r: T) => string,
  getValue: (r: T) => number | null,
  start: string,
  end: string,
): number | null => {
  const valid = rows.filter(r => {
    const d = getDate(r);
    return d >= start && d <= end && getValue(r) !== null;
  });
  if (valid.length === 0) return null;
  return valid.reduce((s, r) => s + (getValue(r) as number), 0) / valid.length;
};

// Daily-sum-then-average: for things like calories where one date has multiple
// rows (multiple meals/workouts), sum per day first, then average across days.
const avgDailySum = <T,>(
  rows: T[],
  getDate: (r: T) => string,
  getValue: (r: T) => number | null,
  start: string,
  end: string,
  // Optional per-day filter: only count days where this returns true.
  // Used to exclude partial-logging days from nutrition averages.
  includeDate?: (date: string) => boolean,
): number | null => {
  const byDate = new Map<string, number>();
  for (const r of rows) {
    const d = getDate(r);
    if (d < start || d > end) continue;
    const v = getValue(r);
    if (v === null) continue;
    byDate.set(d, (byDate.get(d) || 0) + v);
  }
  let kept = [...byDate.entries()];
  if (includeDate) kept = kept.filter(([d]) => includeDate(d));
  if (kept.length === 0) return null;
  // Average across LOGGED days only — unlogged days don't drag the number down.
  const total = kept.reduce((s, [, v]) => s + v, 0);
  return total / kept.length;
};

// Sparkline of daily values for the last `days` days. Days with no data → 0.
const sparkDailySum = <T,>(
  rows: T[],
  getDate: (r: T) => string,
  getValue: (r: T) => number | null,
  end: Date,
  days = 14,
): { value: number }[] => {
  const out: { value: number }[] = [];
  const byDate = new Map<string, number>();
  for (const r of rows) {
    const v = getValue(r);
    if (v === null) continue;
    const d = getDate(r);
    byDate.set(d, (byDate.get(d) || 0) + v);
  }
  for (let i = days - 1; i >= 0; i--) {
    const d = fmt(subDays(end, i));
    out.push({ value: byDate.get(d) || 0 });
  }
  return out;
};

const sparkAvg = <T,>(
  rows: T[],
  getDate: (r: T) => string,
  getValue: (r: T) => number | null,
  end: Date,
  days = 14,
): { value: number }[] => {
  const out: { value: number }[] = [];
  const byDate = new Map<string, number>();
  for (const r of rows) {
    const v = getValue(r);
    if (v === null) continue;
    byDate.set(getDate(r), v);
  }
  for (let i = days - 1; i >= 0; i--) {
    const d = fmt(subDays(end, i));
    const v = byDate.get(d);
    out.push({ value: v ?? 0 });
  }
  return out;
};

const VitalTile: React.FC<{ spec: VitalSpec }> = ({ spec }) => {
  const { label, icon, color, unit, current, prior, spark, direction, formatValue } = spec;
  const delta = current !== null && prior !== null ? current - prior : null;
  const pct = delta !== null && prior !== null && prior !== 0 ? (delta / prior) * 100 : null;

  // Color the trend chip by interpretation
  const trendColor = (() => {
    if (delta === null) return 'text.secondary';
    if (Math.abs(delta) < (Math.abs(prior ?? 0) * 0.02)) return 'text.secondary'; // <2% = flat
    if (direction === 'neutral') return 'text.secondary';
    const goodDelta = direction === 'up_good' ? delta > 0 : delta < 0;
    return goodDelta ? '#4CAF50' : '#FF9800';
  })();
  const TrendIcon = delta === null
    ? Remove
    : Math.abs(delta) < (Math.abs(prior ?? 0) * 0.02)
      ? Remove
      : delta > 0 ? TrendingUp : TrendingDown;

  return (
    <Card sx={{ '&:hover': { transform: 'none' }, height: '100%' }}>
      <CardContent sx={{ pb: '14px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
          <Box sx={{ color, display: 'flex' }}>{icon}</Box>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2, fontSize: '0.65rem' }}>
            {label}
          </Typography>
        </Box>

        {current === null ? (
          <>
            <Typography variant="h4" fontWeight={700} sx={{ color: 'text.secondary', lineHeight: 1 }}>—</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>No data yet</Typography>
          </>
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
              <Typography variant="h4" fontWeight={700} sx={{ color, lineHeight: 1 }}>
                {formatValue(current)}
              </Typography>
              <Typography variant="caption" color="text.secondary">{unit}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.75 }}>
              <TrendIcon sx={{ fontSize: 14, color: trendColor }} />
              <Typography variant="caption" sx={{ color: trendColor, fontWeight: 600 }}>
                {delta === null
                  ? '—'
                  : `${delta >= 0 ? '+' : ''}${formatValue(delta)} vs prior 7d${pct !== null ? ` (${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%)` : ''}`}
              </Typography>
            </Box>
          </>
        )}

        {spark.length > 0 && (
          <Box sx={{ mt: 1, height: 28 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spark}>
                <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

const VitalsStrip: React.FC = () => {
  const today = useMemo(() => new Date(), []);
  const last30 = fmt(subDays(today, 30));

  const sleep    = useSupabase<SleepRow>({ table: 'sleep',       order: { column: 'date', ascending: false }, limit: 60 });
  const meals    = useSupabase<MealRow>({  table: 'meals',       order: { column: 'date', ascending: false }, limit: 500 });
  const logs     = useSupabase<DailyLog>({ table: 'daily_logs',  order: { column: 'date', ascending: false }, limit: 60 });
  const workouts = useSupabase<WorkoutRow>({ table: 'workouts', order: { column: 'date', ascending: false }, limit: 200 });

  const vitals = useMemo<VitalSpec[]>(() => {
    // "Yesterday" is the most recent fully-completed day. Current day is excluded
    // from rolling averages because it's partial (e.g. lunch logged but not dinner
    // would skew calories down). Sparkline still shows partial today as last point.
    const yesterday = subDays(today, 1);
    const cur7 = { start: fmt(subDays(yesterday, 6)),  end: fmt(yesterday) };
    const pri7 = { start: fmt(subDays(yesterday, 13)), end: fmt(subDays(yesterday, 7)) };

    // Build set of "complete" days based on calorie threshold (≥1,500 cal).
    // Used to filter out partial-logging days from BOTH calorie and protein averages.
    const calsByDate = new Map<string, number>();
    for (const m of meals.data) {
      if (m.calories === null) continue;
      calsByDate.set(m.date, (calsByDate.get(m.date) || 0) + m.calories);
    }
    const isCompleteDay = (d: string) => (calsByDate.get(d) || 0) >= COMPLETE_DAY_CALORIE_THRESHOLD;

    return [
      {
        label: 'Sleep',
        icon: <Bedtime sx={{ fontSize: 16 }} />,
        color: '#764ba2',
        unit: 'h / night',
        current: avgInRange(sleep.data, r => r.date, r => r.hours, cur7.start, cur7.end),
        prior:   avgInRange(sleep.data, r => r.date, r => r.hours, pri7.start, pri7.end),
        spark:   sparkAvg(sleep.data,   r => r.date, r => r.hours, yesterday, 14),
        direction: 'up_good',
        formatValue: v => v.toFixed(1),
      },
      {
        label: 'Calories',
        icon: <LocalFireDepartment sx={{ fontSize: 16 }} />,
        color: '#FF9800',
        unit: '/ day',
        current: avgDailySum(meals.data, r => r.date, r => r.calories, cur7.start, cur7.end, isCompleteDay),
        prior:   avgDailySum(meals.data, r => r.date, r => r.calories, pri7.start, pri7.end, isCompleteDay),
        spark:   sparkDailySum(meals.data, r => r.date, r => r.calories, yesterday, 14),
        direction: 'neutral',
        formatValue: v => Math.round(v).toLocaleString(),
      },
      {
        label: 'Protein',
        icon: <FitnessCenter sx={{ fontSize: 16 }} />,
        color: '#E57373',
        unit: 'g / day',
        current: avgDailySum(meals.data, r => r.date, r => r.protein_g, cur7.start, cur7.end, isCompleteDay),
        prior:   avgDailySum(meals.data, r => r.date, r => r.protein_g, pri7.start, pri7.end, isCompleteDay),
        spark:   sparkDailySum(meals.data, r => r.date, r => r.protein_g, yesterday, 14),
        direction: 'up_good',
        formatValue: v => Math.round(v).toString(),
      },
      {
        label: 'Weight',
        icon: <MonitorWeight sx={{ fontSize: 16 }} />,
        color: '#5B8DEF',
        unit: 'lb',
        current: avgInRange(logs.data, r => r.date, r => r.weight_lbs, cur7.start, cur7.end),
        prior:   avgInRange(logs.data, r => r.date, r => r.weight_lbs, pri7.start, pri7.end),
        spark:   sparkAvg(logs.data,   r => r.date, r => r.weight_lbs, yesterday, 14),
        direction: 'neutral',
        formatValue: v => v.toFixed(1),
      },
      {
        label: 'Movement',
        icon: <FitnessCenter sx={{ fontSize: 16 }} />,
        color: '#4CAF50',
        unit: 'days / wk',
        current: (() => {
          // count distinct workout dates in current 7d window
          const set = new Set<string>();
          for (const w of workouts.data) {
            if (w.date >= cur7.start && w.date <= cur7.end) set.add(w.date);
          }
          return set.size > 0 ? set.size : 0;
        })(),
        prior: (() => {
          const set = new Set<string>();
          for (const w of workouts.data) {
            if (w.date >= pri7.start && w.date <= pri7.end) set.add(w.date);
          }
          return set.size > 0 ? set.size : 0;
        })(),
        spark: sparkDailySum(workouts.data, r => r.date, r => (r.duration_min ?? 0) > 0 ? 1 : 0, yesterday, 14),
        direction: 'up_good',
        formatValue: v => v.toFixed(0),
      },
      {
        label: 'Mood',
        icon: <EmojiEmotions sx={{ fontSize: 16 }} />,
        color: '#FFB74D',
        unit: '/ 5',
        current: avgInRange(logs.data, r => r.date, r => r.mood, cur7.start, cur7.end),
        prior:   avgInRange(logs.data, r => r.date, r => r.mood, pri7.start, pri7.end),
        spark:   sparkAvg(logs.data,   r => r.date, r => r.mood, yesterday, 14),
        direction: 'up_good',
        formatValue: v => v.toFixed(1),
      },
    ];
  }, [sleep.data, meals.data, logs.data, workouts.data, today, last30]);

  return (
    <Box>
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5, display: 'block', mb: 1 }}>
        Vitals — last 7 completed days
      </Typography>
      <Grid container spacing={{ xs: 1.5, sm: 2 }}>
        {vitals.map(v => (
          <Grid key={v.label} size={{ xs: 6, sm: 4, md: 2 }}>
            <VitalTile spec={v} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default VitalsStrip;
