import React from 'react';
import { Card, CardContent, Typography, Box, LinearProgress, Tooltip } from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';
import { PeriodResult } from '../../hooks/useLifeScore';

const colorFor = (score: number | null): string => {
  if (score === null) return '#7d8590';
  if (score >= 80) return '#4CAF50';
  if (score >= 60) return '#5B8DEF';
  if (score >= 40) return '#FF9800';
  return '#F44336';
};

interface Props {
  result: PeriodResult;
  emphasized?: boolean;
}

const LifeScoreTile: React.FC<Props> = ({ result, emphasized = false }) => {
  const color = colorFor(result.score);
  const score = result.score === null ? null : Math.round(result.score);

  const subtitle = (() => {
    if (result.score === null) {
      return result.total === 0 ? 'No goals set' : 'Awaiting data';
    }
    return `${result.counted}/${result.total} tracked`;
  })();

  return (
    <Card
      sx={{
        height: '100%',
        borderColor: emphasized ? color : undefined,
        borderWidth: emphasized ? 2 : 1,
        borderStyle: 'solid',
        bgcolor: emphasized ? `${color}10` : undefined,
        '&:hover': { transform: 'none' },
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>
            {result.label}
          </Typography>
          <Tooltip title={`${result.range.start} → ${result.range.end}`}>
            <InfoOutlined sx={{ fontSize: 12, color: 'text.secondary' }} />
          </Tooltip>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
          <Typography variant="h2" fontWeight={700} sx={{ color, lineHeight: 1 }}>
            {score === null ? '—' : score}
          </Typography>
          <Typography variant="body2" color="text.secondary">/100</Typography>
        </Box>

        <LinearProgress
          variant="determinate"
          value={score ?? 0}
          sx={{
            height: 6, borderRadius: 3, mt: 1.5,
            bgcolor: 'rgba(255,255,255,0.05)',
            '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
          }}
        />

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          {subtitle}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default LifeScoreTile;
