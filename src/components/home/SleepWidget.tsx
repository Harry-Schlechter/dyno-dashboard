import React, { useMemo } from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { Bedtime } from '@mui/icons-material';
import { useSupabase } from '../../hooks/useSupabase';
import { format, subDays } from 'date-fns';

interface SleepRow {
  date: string;
  hours: number | null;
  went_to_bed_at: string | null;
  woke_up_at: string | null;
}

const SleepWidget: React.FC = () => {
  const { data, loading } = useSupabase<SleepRow>({
    table: 'sleep',
    order: { column: 'date', ascending: false },
    limit: 30,
  });

  const lastNight = data[0] ?? null;

  const avg7d = useMemo(() => {
    const cutoff = format(subDays(new Date(), 7), 'yyyy-MM-dd');
    const recent = data.filter(s => s.date >= cutoff && s.hours != null);
    if (recent.length === 0) return null;
    return recent.reduce((s, r) => s + (r.hours as number), 0) / recent.length;
  }, [data]);

  return (
    <Card sx={{ '&:hover': { transform: 'none' }, height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Bedtime sx={{ fontSize: 18, color: '#764ba2' }} />
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>
            Last night's sleep
          </Typography>
        </Box>

        {loading ? (
          <Typography variant="h3" sx={{ color: 'text.secondary' }}>—</Typography>
        ) : !lastNight || lastNight.hours == null ? (
          <Typography variant="body2" color="text.secondary">No sleep logged</Typography>
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
              <Typography variant="h3" fontWeight={700} sx={{ color: '#5B8DEF' }}>
                {lastNight.hours.toFixed(1)}
              </Typography>
              <Typography variant="body2" color="text.secondary">hours</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {avg7d !== null && `7-day avg: ${avg7d.toFixed(1)}h`}
            </Typography>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SleepWidget;
