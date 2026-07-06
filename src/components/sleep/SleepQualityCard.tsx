import React, { useMemo } from 'react';
import { Card, CardContent, Typography, Box, Chip, LinearProgress, Tooltip } from '@mui/material';
import { SleepEntry } from '../../hooks/useSleep';
import { sleepScore } from '../../lib/sleepInsights';

const BAND_COLOR: Record<string, string> = {
  great: '#4CAF50', good: '#8BC34A', fair: '#FFB74D', poor: '#E57373',
};

// Last night's sleep-quality score + sub-scores. Purely informative — each
// component is measured against its healthy target, not against other nights.
const SleepQualityCard: React.FC<{ night: SleepEntry | null }> = ({ night }) => {
  const score = useMemo(() => (night ? sleepScore(night) : null), [night]);
  const color = score?.band ? BAND_COLOR[score.band] : '#9E9E9E';

  return (
    <Card sx={{ height: '100%', '&:hover': { transform: 'none' } }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>Sleep quality</Typography>
          {score?.confidence === 'low' && (
            <Tooltip title="Limited detail (no stages/efficiency). Wear the watch to bed to sharpen this.">
              <Chip size="small" label="low detail" sx={{ height: 18, fontSize: '0.6rem' }} />
            </Tooltip>
          )}
        </Box>

        {!score || score.score == null ? (
          <Typography variant="body2" color="text.secondary">No sleep data for last night.</Typography>
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography variant="h2" fontWeight={800} sx={{ color, lineHeight: 1 }}>{score.score}</Typography>
              <Chip size="small" label={score.band} sx={{ fontWeight: 700, textTransform: 'capitalize', bgcolor: `${color}22`, color }} />
            </Box>
            <Box sx={{ mt: 1.5 }}>
              {score.parts.map((p) => (
                <Box key={p.label} sx={{ mb: 0.6 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">{p.label}</Typography>
                    <Typography variant="caption" fontWeight={600}>{Math.round(p.value)}</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={Math.min(100, p.value)}
                    sx={{ height: 3, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)', '& .MuiLinearProgress-bar': { bgcolor: color } }} />
                </Box>
              ))}
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SleepQualityCard;
