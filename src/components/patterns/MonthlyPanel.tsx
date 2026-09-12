import React from 'react';
import { Card, CardContent, Typography, Box, Chip, Stack } from '@mui/material';
import { Map as MapIcon } from '@mui/icons-material';
import { useForecast } from '../../hooks/useForecast';

const READ_COLOR: Record<string, string> = {
  confirmed_light: '#4CAF50', confirmed_busy: '#FF9800', likely_unknown: '#7d8590',
};
const READ_LABEL: Record<string, string> = {
  confirmed_light: 'light', confirmed_busy: 'busy', likely_unknown: 'unknown',
};

// 1-6 month outlook: trailing pattern vs. what's actually known about upcoming
// months (calendar-aware, honest about the difference between "confirmed
// clear" and "no data entered yet"). See bin/forecast_monthly.py.
const MonthlyPanel: React.FC = () => {
  const { latestMonthly, loading } = useForecast();

  if (loading || !latestMonthly) {
    return (
      <Card sx={{ '&:hover': { transform: 'none' }, py: 6, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No 1-6 month outlook yet. Runs the 1st of each month.
        </Typography>
      </Card>
    );
  }

  const monthByMonth = (latestMonthly.basis?.month_by_month as Array<{ month: string; read: string; note: string }>) || [];

  return (
    <Card sx={{ mb: 2.5, '&:hover': { transform: 'none' }, borderLeft: '3px solid #9C7BFF' }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1.5 }}>
          <MapIcon sx={{ fontSize: 18, color: '#9C7BFF' }} />
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>
            1-6 month outlook
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            as of {latestMonthly.target_date}
          </Typography>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
          {latestMonthly.rationale}
        </Typography>

        {monthByMonth.length > 0 && (
          <Stack spacing={1}>
            {monthByMonth.map((m) => {
              const color = READ_COLOR[m.read] ?? '#7d8590';
              return (
                <Box key={m.month} sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
                  <Chip
                    size="small" label={m.month}
                    sx={{ height: 22, fontSize: '0.65rem', fontWeight: 600, minWidth: 62, bgcolor: 'rgba(255,255,255,0.05)' }}
                  />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Chip
                      size="small" label={READ_LABEL[m.read] ?? m.read}
                      sx={{ height: 18, fontSize: '0.6rem', mb: 0.25, textTransform: 'capitalize', bgcolor: `${color}22`, color }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.45 }}>
                      {m.note}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

export default MonthlyPanel;
