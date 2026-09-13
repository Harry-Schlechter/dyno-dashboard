import React from 'react';
import { Card, CardContent, Typography, Box, Chip, Stack } from '@mui/material';
import { CalendarViewWeek } from '@mui/icons-material';
import { differenceInDays } from 'date-fns';
import { useForecast } from '../../hooks/useForecast';

const STATUS_COLOR: Record<string, string> = { ahead: '#4CAF50', on_track: '#5B8DEF', behind: '#FF9800' };
const metricLabel: Record<string, string> = {
  spend_pacing: 'Spend', sleep_pacing: 'Sleep', training_pacing: 'Training',
};

// Weekly pacing check-in: how Harry's trending against his own typical
// patterns/budget THIS WEEK — a different question than the daily forecast
// (situational) or the monthly outlook (forward reallocation).
const WeeklyPanel: React.FC = () => {
  const { latestWeekly, loading } = useForecast();

  if (loading || latestWeekly.length === 0) {
    return (
      <Card sx={{ '&:hover': { transform: 'none' }, py: 6, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No weekly pacing check-in yet. Runs Sundays.
        </Typography>
      </Card>
    );
  }

  const targetDate = latestWeekly[0]?.target_date ? new Date(latestWeekly[0].target_date) : null;
  const daysOld = targetDate ? differenceInDays(new Date(), targetDate) : 0;
  const stale = daysOld > 8;

  return (
    <Card sx={{ mb: 2.5, '&:hover': { transform: 'none' }, borderLeft: '3px solid #5B8DEF' }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1.5 }}>
          <CalendarViewWeek sx={{ fontSize: 18, color: '#5B8DEF' }} />
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>
            This week's pacing
          </Typography>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ ml: 'auto' }}>
            <Typography variant="caption" color="text.secondary">
              as of {latestWeekly[0]?.target_date}
            </Typography>
            {stale && (
              <Chip
                size="small" label="over a week old"
                sx={{ height: 16, fontSize: '0.6rem', bgcolor: 'rgba(255,152,0,0.15)', color: '#FF9800' }}
              />
            )}
          </Stack>
        </Stack>
        <Stack spacing={1.5}>
          {latestWeekly.map((p) => {
            const color = STATUS_COLOR[p.band ?? ''] ?? '#5B8DEF';
            return (
              <Box key={p.id} sx={{ p: 1.25, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.25 }}>
                  <Typography variant="caption" color="text.secondary">{metricLabel[p.metric] ?? p.metric}</Typography>
                  <Chip
                    size="small" label={(p.band ?? '').replace('_', ' ')}
                    sx={{ height: 18, fontSize: '0.62rem', textTransform: 'capitalize', bgcolor: `${color}22`, color }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                  {p.rationale}
                </Typography>
              </Box>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default WeeklyPanel;
