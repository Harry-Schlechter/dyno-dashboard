import React, { useMemo, useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Tooltip, Stack,
  ToggleButton, ToggleButtonGroup, Chip,
} from '@mui/material';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RTooltip,
} from 'recharts';
import { format, subDays } from 'date-fns';
import { useSupabase } from '../hooks/useSupabase';
import { useFinances } from '../hooks/useFinances';
import {
  alignSeries, pearson, laggedPearson, correlationColor, correlationLabel,
  sumByDay, valueByDay, DailySeries,
} from '../lib/correlations';
import LoadingSkeleton from '../components/common/LoadingSkeleton';

type Window = '30d' | '90d' | '180d';
const WINDOW_DAYS: Record<Window, number> = { '30d': 30, '90d': 90, '180d': 180 };

interface SleepRow { date: string; hours: number | null; quality: number | null }
interface MealRow { date: string; calories: number | null; protein_g: number | null }
interface WorkoutRow { date: string; duration_min: number | null }
interface DailyLogRow { date: string; mood: number | null; energy: number | null; stress: number | null; weight_lbs: number | null }

interface MetricDef {
  key: string;
  label: string;
  short: string;
  build: (ctx: SeriesContext) => DailySeries;
}

interface SeriesContext {
  sleep: SleepRow[];
  meals: MealRow[];
  workouts: WorkoutRow[];
  logs: DailyLogRow[];
  spend: { date: string; amount: number; custom_category: string | null; empower_category: string }[];
}

const METRICS: MetricDef[] = [
  { key: 'sleep_h',    label: 'Sleep hours',     short: 'Sleep',     build: c => valueByDay(c.sleep, r => r.hours) },
  { key: 'mood',       label: 'Mood (1-5)',      short: 'Mood',      build: c => valueByDay(c.logs, r => r.mood) },
  { key: 'energy',     label: 'Energy (1-5)',    short: 'Energy',    build: c => valueByDay(c.logs, r => r.energy) },
  { key: 'stress',     label: 'Stress (1-5)',    short: 'Stress',    build: c => valueByDay(c.logs, r => r.stress) },
  { key: 'calories',   label: 'Calories',        short: 'Calories',  build: c => sumByDay(c.meals, r => r.calories) },
  { key: 'protein',    label: 'Protein (g)',     short: 'Protein',   build: c => sumByDay(c.meals, r => r.protein_g) },
  { key: 'workout_min',label: 'Workout minutes', short: 'Workouts',  build: c => sumByDay(c.workouts, r => r.duration_min) },
  { key: 'spend',      label: 'Spending ($)',    short: 'Spend',     build: c => sumByDay(
    c.spend.filter(t => {
      const cat = (t.custom_category ?? t.empower_category ?? '').toLowerCase();
      return t.amount < 0 && !cat.includes('transfer');
    }),
    t => -t.amount,
  ) },
];

const CorrelationsPage: React.FC = () => {
  const [win, setWin] = useState<Window>('90d');
  const start = format(subDays(new Date(), WINDOW_DAYS[win]), 'yyyy-MM-dd');

  const sleep    = useSupabase<SleepRow>({ table: 'sleep',         filters: { date: { gte: start } }, limit: 500 });
  const meals    = useSupabase<MealRow>({ table: 'meals',         filters: { date: { gte: start } }, limit: 5000 });
  const workouts = useSupabase<WorkoutRow>({ table: 'workouts',     filters: { date: { gte: start } }, limit: 1000 });
  const logs     = useSupabase<DailyLogRow>({ table: 'daily_logs',  filters: { date: { gte: start } }, limit: 500 });
  const fin      = useFinances();

  const ctx: SeriesContext = useMemo(() => ({
    sleep: sleep.data, meals: meals.data, workouts: workouts.data, logs: logs.data,
    spend: fin.transactions
      .filter(t => t.date >= start)
      .map(t => ({ date: t.date, amount: t.amount, custom_category: t.custom_category, empower_category: t.empower_category })),
  }), [sleep.data, meals.data, workouts.data, logs.data, fin.transactions, start]);

  const series = useMemo(() => {
    const out: Record<string, DailySeries> = {};
    for (const m of METRICS) out[m.key] = m.build(ctx);
    return out;
  }, [ctx]);

  // Build full correlation matrix
  const matrix = useMemo(() => {
    const m: { row: MetricDef; col: MetricDef; r: number | null; n: number }[][] = [];
    for (const row of METRICS) {
      const r: typeof m[number] = [];
      for (const col of METRICS) {
        if (row.key === col.key) {
          r.push({ row, col, r: 1, n: series[row.key].size });
          continue;
        }
        const { x, y } = alignSeries(series[row.key], series[col.key]);
        r.push({ row, col, r: pearson(x, y), n: x.length });
      }
      m.push(r);
    }
    return m;
  }, [series]);

  // Sleep × mood with 0/+1/-1 day lag
  const sleepMoodLags = useMemo(() => {
    return [-1, 0, 1].map(lag => ({
      lag,
      r: laggedPearson(series.sleep_h, series.mood, lag),
    }));
  }, [series]);

  // Sleep × mood scatter points
  const sleepMoodPoints = useMemo(() => {
    const out: { sleep: number; mood: number }[] = [];
    for (const [date, hours] of series.sleep_h) {
      const mood = series.mood.get(date);
      if (mood !== undefined) out.push({ sleep: hours, mood });
    }
    return out;
  }, [series]);

  // Top 5 strongest non-trivial correlations
  const topCorrelations = useMemo(() => {
    const flat: { a: string; b: string; r: number; n: number }[] = [];
    for (let i = 0; i < METRICS.length; i++) {
      for (let j = i + 1; j < METRICS.length; j++) {
        const cell = matrix[i][j];
        if (cell.r !== null && cell.n >= 10) {
          flat.push({ a: METRICS[i].label, b: METRICS[j].label, r: cell.r, n: cell.n });
        }
      }
    }
    flat.sort((x, y) => Math.abs(y.r) - Math.abs(x.r));
    return flat.slice(0, 5);
  }, [matrix]);

  if (sleep.loading || meals.loading || workouts.loading || logs.loading || fin.loading) {
    return <LoadingSkeleton variant="card" count={4} />;
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Correlations</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            How your metrics move together. Pearson r over the selected window.
          </Typography>
        </Box>
        <ToggleButtonGroup size="small" exclusive value={win} onChange={(_, v) => v && setWin(v)}>
          <ToggleButton value="30d" sx={{ textTransform: 'none' }}>30d</ToggleButton>
          <ToggleButton value="90d" sx={{ textTransform: 'none' }}>90d</ToggleButton>
          <ToggleButton value="180d" sx={{ textTransform: 'none' }}>180d</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Grid container spacing={2.5}>
        {/* Top correlations callout */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ '&:hover': { transform: 'none' }, height: '100%' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>
                Strongest links
              </Typography>
              {topCorrelations.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Not enough overlapping data yet.
                </Typography>
              ) : (
                <Stack spacing={1.5} sx={{ mt: 2 }}>
                  {topCorrelations.map((c, i) => (
                    <Box key={i}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 500 }}>
                          {c.a} ↔ {c.b}
                        </Typography>
                        <Chip
                          size="small"
                          label={`r=${c.r.toFixed(2)}`}
                          sx={{
                            height: 20, fontSize: '0.7rem', fontWeight: 700,
                            color: c.r >= 0 ? '#4CAF50' : '#F44336',
                            bgcolor: (c.r >= 0 ? '#4CAF50' : '#F44336') + '22',
                          }}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                        {correlationLabel(c.r)} · {c.n} days
                      </Typography>
                      <Box sx={{ height: 4, mt: 0.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                        <Box sx={{
                          height: '100%',
                          width: `${Math.min(100, Math.abs(c.r) * 100)}%`,
                          bgcolor: c.r >= 0 ? '#4CAF50' : '#F44336',
                        }} />
                      </Box>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Sleep → mood lag analysis */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ '&:hover': { transform: 'none' }, height: '100%' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>
                Sleep → Mood (timing)
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, mb: 2 }}>
                How yesterday's, tonight's, or tomorrow's sleep correlates with today's mood.
              </Typography>
              <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 2 }}>
                {sleepMoodLags.map(({ lag, r }) => {
                  const label = lag === 0 ? 'Same night' : lag === 1 ? 'Night before' : 'Night after';
                  const color = r === null ? '#7d8590' : r >= 0 ? '#4CAF50' : '#F44336';
                  return (
                    <Box key={lag} sx={{ flex: 1, minWidth: 110 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                        {label}
                      </Typography>
                      <Typography variant="h4" fontWeight={700} sx={{ color, fontSize: '1.6rem' }}>
                        {r === null ? '—' : (r >= 0 ? '+' : '') + r.toFixed(2)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                        {correlationLabel(r)}
                      </Typography>
                    </Box>
                  );
                })}
              </Stack>

              {/* Scatter */}
              {sleepMoodPoints.length > 5 && (
                <Box sx={{ height: 220, mt: 2 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis type="number" dataKey="sleep" name="Sleep" unit="h" stroke="#7d8590" tick={{ fontSize: 11 }} domain={[3, 11]} />
                      <YAxis type="number" dataKey="mood" name="Mood" stroke="#7d8590" tick={{ fontSize: 11 }} domain={[0.5, 5.5]} ticks={[1,2,3,4,5]} />
                      <ZAxis range={[40, 60]} />
                      <RTooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: '#0f1318', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                      <Scatter data={sleepMoodPoints} fill="#5B8DEF" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Full matrix */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ '&:hover': { transform: 'none' } }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>
                Full correlation matrix
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, mb: 2 }}>
                Green = positive, red = negative, intensity = strength. Hover for r and sample size.
              </Typography>
              <Box sx={{ overflowX: 'auto', pb: 1 }}>
                <Box sx={{ minWidth: 540, display: 'inline-block' }}>
                  {/* Header row */}
                  <Box sx={{ display: 'flex', mb: 0.5, ml: { xs: 9, sm: 11 } }}>
                    {METRICS.map(m => (
                      <Box key={m.key} sx={{ width: { xs: 56, sm: 64 }, textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ fontSize: { xs: '0.6rem', sm: '0.65rem' }, color: 'text.secondary' }}>
                          {m.short}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                  {matrix.map((row, ri) => (
                    <Box key={ri} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <Box sx={{ width: { xs: 80, sm: 96 }, pr: 1 }}>
                        <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.7rem' } }}>
                          {METRICS[ri].short}
                        </Typography>
                      </Box>
                      {row.map((cell, ci) => {
                        const same = ri === ci;
                        const tooltip = same
                          ? METRICS[ri].label
                          : `${cell.row.label} ↔ ${cell.col.label}: ${cell.r === null ? 'not enough data' : `r=${cell.r.toFixed(2)}, n=${cell.n}`}`;
                        return (
                          <Tooltip key={ci} title={tooltip} arrow>
                            <Box
                              sx={{
                                width: { xs: 56, sm: 64 }, height: { xs: 36, sm: 40 },
                                bgcolor: same ? 'rgba(255,255,255,0.04)' : correlationColor(cell.r),
                                border: '1px solid rgba(255,255,255,0.04)',
                                borderRadius: 1,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                mr: 0.25, cursor: same ? 'default' : 'pointer',
                              }}
                            >
                              <Typography variant="caption" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' }, fontWeight: 600 }}>
                                {same ? '—' : cell.r === null ? '·' : cell.r.toFixed(2)}
                              </Typography>
                            </Box>
                          </Tooltip>
                        );
                      })}
                    </Box>
                  ))}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CorrelationsPage;
