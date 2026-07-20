import React from 'react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { TrendingUp, ChevronRight } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useForecast } from '../../hooks/useForecast';

const BAND_COLOR: Record<string, string> = { green: '#4CAF50', yellow: '#FFB74D', red: '#E57373' };

// Compact home-page line: tomorrow's recovery forecast (the headline prediction),
// with the engine's track record so it's honest. Links to Patterns for the rest.
const TomorrowForecast: React.FC = () => {
  const { tomorrow, accuracy, loading } = useForecast();
  const navigate = useNavigate();

  if (loading) return null;
  const rec = tomorrow.find((p) => p.metric === 'recovery_band');
  if (!rec) return null;

  const color = rec.band && BAND_COLOR[rec.band] ? BAND_COLOR[rec.band] : '#5B8DEF';
  const acc = accuracy.find((a) => a.metric === 'recovery_band');
  const advice: Record<string, string> = {
    green: 'good day to push', yellow: 'train moderate', red: 'prioritize recovery',
  };

  return (
    <Card
      onClick={() => navigate('/patterns')}
      sx={{ cursor: 'pointer', '&:hover': { transform: 'none', borderColor: 'rgba(255,255,255,0.16)' } }}
    >
      <CardContent sx={{ py: '14px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <TrendingUp sx={{ fontSize: 20, color: '#26C6DA' }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 0.5 }}>
              TOMORROW'S RECOVERY
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h6" fontWeight={700} sx={{ color, textTransform: 'capitalize' }}>
                {rec.predicted}
              </Typography>
              <Typography variant="body2" color="text.secondary">— {advice[rec.band ?? ''] ?? ''}</Typography>
            </Box>
          </Box>
          {acc && acc.scored >= 3 && (
            <Chip
              size="small"
              label={`${acc.hit_rate_pct}% accurate`}
              sx={{ height: 20, fontSize: '0.62rem', bgcolor: 'rgba(38,198,218,0.15)', color: '#26C6DA' }}
            />
          )}
          <ChevronRight sx={{ color: 'text.secondary' }} />
        </Box>
      </CardContent>
    </Card>
  );
};

export default TomorrowForecast;
