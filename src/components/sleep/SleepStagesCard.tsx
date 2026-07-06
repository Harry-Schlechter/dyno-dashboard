import React from 'react';
import { Card, CardContent, Typography, Box, Tooltip, LinearProgress } from '@mui/material';
import { SleepEntry } from '../../hooks/useSleep';
import { stagePercents, STAGE_TARGETS } from '../../lib/sleepInsights';

// Deep / REM / Light breakdown for one night, with each stage's % of total sleep
// and how it compares to healthy ranges (deep ~13-23%, REM ~20-27%).

const STAGE_COLORS = { deep: '#3949AB', rem: '#7E57C2', light: '#9FA8DA' };

const StageBar: React.FC<{
  label: string; minutes: number | null; pct: number | null; color: string;
  target: { min: number; max: number };
}> = ({ label, minutes, pct, color, target }) => {
  const inRange = pct != null && pct >= target.min && pct <= target.max;
  const pctNum = pct != null ? Math.round(pct * 100) : null;
  return (
    <Box sx={{ mb: 1.25 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Typography variant="caption" fontWeight={600}>{label}</Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'baseline' }}>
          <Typography variant="caption" color="text.secondary">
            {minutes != null ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : '—'}
          </Typography>
          {pctNum != null && (
            <Tooltip title={`Healthy: ${Math.round(target.min * 100)}-${Math.round(target.max * 100)}%`}>
              <Typography variant="caption" sx={{ color: inRange ? '#4CAF50' : '#FFB74D', fontWeight: 700 }}>
                {pctNum}%
              </Typography>
            </Tooltip>
          )}
        </Box>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct != null ? Math.min(100, pct * 100) : 0}
        sx={{
          height: 6, borderRadius: 3, mt: 0.4, bgcolor: 'rgba(255,255,255,0.06)',
          '& .MuiLinearProgress-bar': { bgcolor: color },
        }}
      />
    </Box>
  );
};

const SleepStagesCard: React.FC<{ night: SleepEntry | null }> = ({ night }) => {
  const pct = night ? stagePercents(night) : null;
  const hasStages = pct && pct.stagedMinutes != null && pct.stagedMinutes > 0;

  return (
    <Card sx={{ height: '100%', '&:hover': { transform: 'none' } }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>
          Sleep stages
        </Typography>
        {!hasStages ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            No stage data for this night — wear the watch to bed to capture deep/REM/light.
          </Typography>
        ) : (
          <Box sx={{ mt: 1.5 }}>
            <StageBar label="Deep" minutes={night!.deep_sleep_min} pct={pct!.deepPct} color={STAGE_COLORS.deep} target={STAGE_TARGETS.deep} />
            <StageBar label="REM" minutes={night!.rem_sleep_min} pct={pct!.remPct} color={STAGE_COLORS.rem} target={STAGE_TARGETS.rem} />
            <StageBar label="Light" minutes={night!.core_sleep_min} pct={pct!.lightPct} color={STAGE_COLORS.light} target={STAGE_TARGETS.light} />
            {night!.awakenings != null && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                {night!.awakenings} awakening{night!.awakenings === 1 ? '' : 's'}
                {night!.efficiency_pct != null ? ` · ${night!.efficiency_pct}% efficiency` : ''}
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default SleepStagesCard;
export { STAGE_COLORS };
