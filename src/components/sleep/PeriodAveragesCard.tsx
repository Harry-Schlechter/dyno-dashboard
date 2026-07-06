import React, { useMemo } from 'react';
import { Card, CardContent, Typography, Box, Grid } from '@mui/material';
import { SleepEntry } from '../../hooks/useSleep';
import { sleepScore, stagePercents } from '../../lib/sleepInsights';

// Averages over the SELECTED filter window — this is the view the 7d/30d/90d/1y
// toggle actually drives. Nulls are ignored so partial-data periods still summarize.
const PeriodAveragesCard: React.FC<{ entries: SleepEntry[]; windowLabel: string }> = ({ entries, windowLabel }) => {
  const stats = useMemo(() => {
    const avg = (xs: (number | null | undefined)[]) => {
      const v = xs.filter((x): x is number => x != null);
      return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
    };
    const qualities = entries.map((e) => sleepScore(e).score);
    const deepPcts = entries.map((e) => stagePercents(e).deepPct);
    const remPcts = entries.map((e) => stagePercents(e).remPct);
    return {
      n: entries.filter((e) => e.hours != null).length,
      quality: avg(qualities),
      hours: avg(entries.map((e) => e.hours)),
      eff: avg(entries.map((e) => e.efficiency_pct)),
      deepPct: avg(deepPcts),
      remPct: avg(remPcts),
    };
  }, [entries]);

  const cell = (label: string, value: string, hint?: string) => (
    <Grid size={{ xs: 4, sm: 4, md: 4 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{label}</Typography>
      <Typography variant="h6" fontWeight={700}>{value}</Typography>
      {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
    </Grid>
  );

  return (
    <Card sx={{ height: '100%', '&:hover': { transform: 'none' } }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>
          {windowLabel} averages
        </Typography>
        {stats.n === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>No sleep in this period.</Typography>
        ) : (
          <Grid container spacing={2} sx={{ mt: 0.25 }}>
            {cell('Quality', stats.quality != null ? String(Math.round(stats.quality)) : '—', `${stats.n} nights`)}
            {cell('Hours', stats.hours != null ? stats.hours.toFixed(1) : '—')}
            {cell('Efficiency', stats.eff != null ? `${Math.round(stats.eff)}%` : '—')}
            {cell('Deep', stats.deepPct != null ? `${Math.round(stats.deepPct * 100)}%` : '—', 'of sleep')}
            {cell('REM', stats.remPct != null ? `${Math.round(stats.remPct * 100)}%` : '—', 'of sleep')}
          </Grid>
        )}
      </CardContent>
    </Card>
  );
};

export default PeriodAveragesCard;
