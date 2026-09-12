import React, { useMemo } from 'react';
import { Card, CardContent, Typography, Box, Grid, Divider } from '@mui/material';
import {
  Bedtime, FitnessCenter, EggAlt, LocalFireDepartment, AttachMoney, SentimentSatisfied,
} from '@mui/icons-material';
import { format, subDays } from 'date-fns';
import { useSupabase } from '../../hooks/useSupabase';
import { useFinances } from '../../hooks/useFinances';
import { isRealSpend } from '../../lib/finance';
import { formatCurrency } from '../../lib/formatters';

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
const COMPLETE_DAY_CALORIE_THRESHOLD = 1500;

// Combines yesterday-at-a-glance (top) + a compact 7-day-average line (bottom)
// into one card, replacing the old full-width horizontal DailySummaryStrip +
// the separate VitalsStrip grid on the home page. A 2x3 grid reads better in
// a narrow widget column than a horizontal divided strip did.
const YesterdayAndAveragesWidget: React.FC = () => {
  const today = useMemo(() => new Date(), []);
  const yesterday = useMemo(() => fmt(subDays(today, 1)), [today]);
  const cur7 = useMemo(() => ({ start: fmt(subDays(today, 7)), end: yesterday }), [today, yesterday]);

  const { data: sleep } = useSupabase<{ date: string; hours: number | null }>({
    table: 'sleep', order: { column: 'date', ascending: false }, limit: 30,
  });
  const { data: workouts } = useSupabase<{ date: string; name: string | null; duration_min: number | null }>({
    table: 'workouts', order: { column: 'date', ascending: false }, limit: 30,
  });
  const { data: meals } = useSupabase<{ date: string; calories: number | null; protein_g: number | null }>({
    table: 'meals', order: { column: 'date', ascending: false }, limit: 100,
  });
  const { data: dailyLogs } = useSupabase<{ date: string; mood: number | null }>({
    table: 'daily_logs', order: { column: 'date', ascending: false }, limit: 30,
  });
  const { transactions } = useFinances();

  const sleepRow = sleep.find(s => s.date === yesterday);
  const workoutsYesterday = workouts.filter(w => w.date === yesterday);
  const mealsYesterday = meals.filter(m => m.date === yesterday);
  const calories = mealsYesterday.reduce((s, m) => s + (m.calories ?? 0), 0);
  const protein = mealsYesterday.reduce((s, m) => s + (m.protein_g ?? 0), 0);
  const dailyLog = dailyLogs.find(d => d.date === yesterday);
  const spend = transactions.filter(t => t.date === yesterday && isRealSpend(t)).reduce((s, t) => s + Math.abs(t.amount), 0);
  const txnCount = transactions.filter(t => t.date === yesterday && isRealSpend(t)).length;

  const yesterdayItems = [
    { icon: <Bedtime sx={{ fontSize: 16, color: '#764ba2' }} />, label: 'Sleep', value: sleepRow?.hours != null ? `${sleepRow.hours.toFixed(1)}h` : '—', faded: sleepRow?.hours == null },
    { icon: <FitnessCenter sx={{ fontSize: 16, color: '#FF9800' }} />, label: 'Workouts', value: workoutsYesterday.length === 0 ? '0' : `${workoutsYesterday.length}`, faded: workoutsYesterday.length === 0 },
    { icon: <EggAlt sx={{ fontSize: 16, color: '#5B8DEF' }} />, label: 'Protein', value: mealsYesterday.length === 0 ? '—' : `${Math.round(protein)}g`, faded: mealsYesterday.length === 0 },
    { icon: <LocalFireDepartment sx={{ fontSize: 16, color: '#F44336' }} />, label: 'Calories', value: mealsYesterday.length === 0 ? '—' : `${Math.round(calories)}`, faded: mealsYesterday.length === 0 },
    { icon: <AttachMoney sx={{ fontSize: 16, color: '#4CAF50' }} />, label: 'Spent', value: txnCount === 0 ? '$0' : formatCurrency(spend), faded: txnCount === 0 },
    { icon: <SentimentSatisfied sx={{ fontSize: 16, color: '#90CAF9' }} />, label: 'Mood', value: dailyLog?.mood != null ? `${dailyLog.mood}/5` : '—', faded: dailyLog?.mood == null },
  ];

  // Compact 7-day averages (a lighter-weight sibling of VitalsStrip's fuller tiles).
  const avgDailySum = (rows: { date: string }[], get: (r: any) => number | null, includeDate?: (d: string) => boolean) => {
    const byDate = new Map<string, number>();
    for (const r of rows as any[]) {
      const v = get(r);
      if (v === null || r.date < cur7.start || r.date > cur7.end) continue;
      byDate.set(r.date, (byDate.get(r.date) || 0) + v);
    }
    let kept = [...byDate.entries()];
    if (includeDate) kept = kept.filter(([d]) => includeDate(d));
    if (kept.length === 0) return null;
    return kept.reduce((s, [, v]) => s + v, 0) / kept.length;
  };
  const avgSimple = (rows: { date: string }[], get: (r: any) => number | null) => {
    const valid = (rows as any[]).filter(r => r.date >= cur7.start && r.date <= cur7.end && get(r) !== null);
    if (valid.length === 0) return null;
    return valid.reduce((s, r) => s + get(r), 0) / valid.length;
  };
  const calsByDate = new Map<string, number>();
  for (const m of meals) { if (m.calories !== null) calsByDate.set(m.date, (calsByDate.get(m.date) || 0) + m.calories); }
  const isCompleteDay = (d: string) => (calsByDate.get(d) || 0) >= COMPLETE_DAY_CALORIE_THRESHOLD;

  const avgSleep = avgSimple(sleep, r => r.hours);
  const avgCalories = avgDailySum(meals, r => r.calories, isCompleteDay);
  const movementDays = new Set(workouts.filter(w => w.date >= cur7.start && w.date <= cur7.end).map(w => w.date)).size;

  return (
    <Card sx={{ '&:hover': { transform: 'none' }, height: '100%' }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5, display: 'block', mb: 1 }}>
          Yesterday
        </Typography>
        <Grid container spacing={1}>
          {yesterdayItems.map((item, i) => (
            <Grid size={4} key={i} sx={{ opacity: item.faded ? 0.45 : 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                {item.icon}
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem', letterSpacing: 0.3, textTransform: 'uppercase' }}>
                  {item.label}
                </Typography>
              </Box>
              <Typography variant="body2" fontWeight={600} sx={{ mt: 0.15 }}>{item.value}</Typography>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.06)' }} />

        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5, display: 'block', mb: 0.75 }}>
          7-day average
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Sleep</Typography>
            <Typography variant="body2" fontWeight={600}>{avgSleep != null ? `${avgSleep.toFixed(1)}h` : '—'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Calories</Typography>
            <Typography variant="body2" fontWeight={600}>{avgCalories != null ? Math.round(avgCalories).toLocaleString() : '—'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Movement</Typography>
            <Typography variant="body2" fontWeight={600}>{movementDays}/7d</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default YesterdayAndAveragesWidget;
