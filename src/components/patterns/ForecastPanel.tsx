import React from 'react';
import { Card, CardContent, Typography, Box, Chip, Tooltip, Stack } from '@mui/material';
import { TrendingUp } from '@mui/icons-material';
import { useForecast } from '../../hooks/useForecast';

const BAND_COLOR: Record<string, string> = { green: '#4CAF50', yellow: '#FFB74D', red: '#E57373' };

const metricLabel: Record<string, string> = {
  recovery_band: 'Recovery',
  sleep_hours: 'Sleep',
  workout_performance: 'Workout',
};

// Tomorrow's forecasts + the engine's own track record. The self-scoring is what
// makes it trustworthy — you can see how often it's right before acting on it.
const ForecastPanel: React.FC = () => {
  const { tomorrow, accuracy, loading } = useForecast();

  if (loading || tomorrow.length === 0) return null;

  return (
    <Card sx={{ mb: 2.5, '&:hover': { transform: 'none' }, borderLeft: '3px solid #26C6DA' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
          <TrendingUp sx={{ fontSize: 18, color: '#26C6DA' }} />
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>
            Tomorrow's forecast
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ flexWrap: 'wrap' }}>
          {tomorrow.map((p) => {
            const color = p.band && BAND_COLOR[p.band] ? BAND_COLOR[p.band] : '#5B8DEF';
            const acc = accuracy.find((a) => a.metric === p.metric);
            return (
              <Box key={p.id} sx={{ flex: 1, minWidth: 200 }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary">{metricLabel[p.metric] ?? p.metric}</Typography>
                  {p.confidence != null && (
                    <Typography variant="caption" color="text.secondary">· {Math.round(p.confidence * 100)}% conf</Typography>
                  )}
                </Box>
                <Typography variant="h5" fontWeight={700} sx={{ color, textTransform: 'capitalize' }}>
                  {p.predicted}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {p.rationale}
                </Typography>
                {acc && acc.scored > 0 && (
                  <Tooltip title={`Scored against reality on ${acc.scored} past forecasts`}>
                    <Chip
                      size="small"
                      label={`track record: ${acc.hit_rate_pct}% (${acc.hits}/${acc.scored})`}
                      sx={{ mt: 0.75, height: 18, fontSize: '0.6rem', bgcolor: 'rgba(38,198,218,0.15)', color: '#26C6DA' }}
                    />
                  </Tooltip>
                )}
              </Box>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default ForecastPanel;
