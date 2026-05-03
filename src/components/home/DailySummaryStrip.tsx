import React, { useMemo } from 'react';
import { Card, CardContent, Typography, Box, Stack, Divider } from '@mui/material';
import {
  Bedtime, FitnessCenter, EggAlt, LocalFireDepartment, AttachMoney, SentimentSatisfied,
} from '@mui/icons-material';
import { format, subDays } from 'date-fns';
import { useSupabase } from '../../hooks/useSupabase';
import { useFinances } from '../../hooks/useFinances';
import { isRealSpend } from '../../lib/finance';
import { formatCurrency } from '../../lib/formatters';

const DailySummaryStrip: React.FC = () => {
  const yesterday = useMemo(() => format(subDays(new Date(), 1), 'yyyy-MM-dd'), []);

  const { data: sleep } = useSupabase<{ date: string; hours: number | null }>({
    table: 'sleep', order: { column: 'date', ascending: false }, limit: 30,
  });
  const { data: workouts } = useSupabase<{ date: string; name: string | null; duration_min: number | null }>({
    table: 'workouts', order: { column: 'date', ascending: false }, limit: 30,
  });
  const { data: meals } = useSupabase<{ date: string; calories: number | null; protein_g: number | null }>({
    table: 'meals', order: { column: 'date', ascending: false }, limit: 100,
  });
  const { data: dailyLogs } = useSupabase<{ date: string; mood: number | null; weight_lbs: number | null }>({
    table: 'daily_logs', order: { column: 'date', ascending: false }, limit: 30,
  });
  const { transactions } = useFinances();

  const sleepRow = sleep.find(s => s.date === yesterday);
  const workoutsYesterday = workouts.filter(w => w.date === yesterday);
  const mealsYesterday = meals.filter(m => m.date === yesterday);
  const calories = mealsYesterday.reduce((s, m) => s + (m.calories ?? 0), 0);
  const protein = mealsYesterday.reduce((s, m) => s + (m.protein_g ?? 0), 0);
  const dailyLog = dailyLogs.find(d => d.date === yesterday);
  const spend = transactions
    .filter(t => t.date === yesterday && isRealSpend(t))
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const txnCount = transactions.filter(t => t.date === yesterday && isRealSpend(t)).length;

  const items = [
    {
      icon: <Bedtime sx={{ fontSize: 18, color: '#764ba2' }} />,
      label: 'Sleep',
      value: sleepRow?.hours != null ? `${sleepRow.hours.toFixed(1)}h` : '—',
      faded: sleepRow?.hours == null,
    },
    {
      icon: <FitnessCenter sx={{ fontSize: 18, color: '#FF9800' }} />,
      label: 'Workouts',
      value: workoutsYesterday.length === 0
        ? '0'
        : `${workoutsYesterday.length} · ${workoutsYesterday.map(w => w.name).filter(Boolean).join(', ')}`,
      faded: workoutsYesterday.length === 0,
    },
    {
      icon: <EggAlt sx={{ fontSize: 18, color: '#5B8DEF' }} />,
      label: 'Protein',
      value: mealsYesterday.length === 0 ? '—' : `${Math.round(protein)}g`,
      faded: mealsYesterday.length === 0,
    },
    {
      icon: <LocalFireDepartment sx={{ fontSize: 18, color: '#F44336' }} />,
      label: 'Calories',
      value: mealsYesterday.length === 0 ? '—' : `${Math.round(calories)}`,
      faded: mealsYesterday.length === 0,
    },
    {
      icon: <AttachMoney sx={{ fontSize: 18, color: '#4CAF50' }} />,
      label: 'Spent',
      value: txnCount === 0 ? '$0' : `${formatCurrency(spend)} · ${txnCount}tx`,
      faded: txnCount === 0,
    },
    {
      icon: <SentimentSatisfied sx={{ fontSize: 18, color: '#90CAF9' }} />,
      label: 'Mood',
      value: dailyLog?.mood != null ? `${dailyLog.mood}/5` : '—',
      faded: dailyLog?.mood == null,
    },
  ];

  return (
    <Card sx={{ '&:hover': { transform: 'none' } }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0} divider={<Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />}>
          {items.map((item, i) => (
            <Box key={i} sx={{ flex: 1, px: 1.5, opacity: item.faded ? 0.45 : 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {item.icon}
                <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 0.5, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                  {item.label}
                </Typography>
              </Box>
              <Typography variant="body2" fontWeight={600} sx={{ mt: 0.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.value}
              </Typography>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default DailySummaryStrip;
