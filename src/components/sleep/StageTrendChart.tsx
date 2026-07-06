import React, { useMemo } from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { SleepEntry } from '../../hooks/useSleep';
import { STAGE_COLORS } from './SleepStagesCard';

// Stacked deep/REM/light minutes over time — see how sleep composition trends,
// not just total hours. Only plots nights that actually have stage data.
const StageTrendChart: React.FC<{ entries: SleepEntry[] }> = ({ entries }) => {
  const data = useMemo(() => {
    return [...entries]
      .filter((e) => e.deep_sleep_min != null || e.rem_sleep_min != null || e.core_sleep_min != null)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => ({
        date: format(new Date(e.date + 'T12:00:00'), 'MMM d'),
        Deep: e.deep_sleep_min ?? 0,
        REM: e.rem_sleep_min ?? 0,
        Light: e.core_sleep_min ?? 0,
      }));
  }, [entries]);

  return (
    <Card sx={{ '&:hover': { transform: 'none' } }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Sleep composition</Typography>
        {data.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            No stage data yet. It builds up as you wear the watch to bed.
          </Typography>
        ) : (
          <Box sx={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 6, right: 10, bottom: 0, left: -12 }}>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9E9E9E' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9E9E9E' }} unit="m" />
                <Tooltip
                  contentStyle={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  formatter={(v: number, name: string) => [`${Math.floor(v / 60)}h ${v % 60}m`, name]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Deep" stackId="s" fill={STAGE_COLORS.deep} />
                <Bar dataKey="REM" stackId="s" fill={STAGE_COLORS.rem} />
                <Bar dataKey="Light" stackId="s" fill={STAGE_COLORS.light} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default StageTrendChart;
