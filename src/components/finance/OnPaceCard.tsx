import React from 'react';
import { Card, CardContent, Typography, Box, Stack, LinearProgress, Tooltip } from '@mui/material';
import { TrendingUp, TrendingDown, InfoOutlined } from '@mui/icons-material';
import { useFinanceProjection } from '../../hooks/useFinanceProjection';
import { formatCurrency } from '../../lib/formatters';

const formatMonthLabel = (monthKey: string): string => {
  const [y, m] = monthKey.split('-');
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
};

const OnPaceCard: React.FC = () => {
  const { projection, trailingAvgSpend, vsAvgPct, loading, error } = useFinanceProjection();

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="overline" color="text.secondary">On Pace</Typography>
          <LinearProgress sx={{ mt: 2 }} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Typography variant="overline" color="text.secondary">On Pace</Typography>
          <Typography variant="body2" color="error.main" sx={{ mt: 1 }}>{error}</Typography>
        </CardContent>
      </Card>
    );
  }

  const {
    monthKey, daysElapsed, daysInMonth, spentSoFar, dailyBurnRate,
    projectedMonthSpend, expectedIncome, projectedSavings, annualizedSavings,
  } = projection;

  const monthProgressPct = (daysElapsed / daysInMonth) * 100;
  const onTrack = projectedSavings > 0;
  const spendVsIncomePct = expectedIncome > 0 ? Math.min((projectedMonthSpend / expectedIncome) * 100, 100) : 0;

  const trendColor = vsAvgPct === null ? 'text.secondary' : vsAvgPct > 5 ? '#F44336' : vsAvgPct < -5 ? '#4CAF50' : 'text.secondary';
  const TrendIcon = vsAvgPct !== null && vsAvgPct < 0 ? TrendingDown : TrendingUp;

  return (
    <Card sx={{ '&:hover': { transform: 'none' } }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2 }}>
            {formatMonthLabel(monthKey)} — On Pace
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Day {daysElapsed} of {daysInMonth}
          </Typography>
        </Box>

        <LinearProgress
          variant="determinate"
          value={monthProgressPct}
          sx={{
            height: 4, borderRadius: 2, mb: 2.5,
            bgcolor: 'rgba(255,255,255,0.04)',
            '& .MuiLinearProgress-bar': { bgcolor: '#5B8DEF', borderRadius: 2 },
          }}
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mb: 2.5 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">Spent so far</Typography>
            <Typography variant="h5" fontWeight={700}>{formatCurrency(spentSoFar)}</Typography>
            <Typography variant="caption" color="text.secondary">
              {formatCurrency(dailyBurnRate)}/day
            </Typography>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="caption" color="text.secondary">Projected month</Typography>
              <Tooltip title={`Linear extrapolation: daily burn × ${daysInMonth} days`}>
                <InfoOutlined sx={{ fontSize: 12, color: 'text.secondary' }} />
              </Tooltip>
            </Box>
            <Typography variant="h5" fontWeight={700}>{formatCurrency(projectedMonthSpend)}</Typography>
            {vsAvgPct !== null && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                <TrendIcon sx={{ fontSize: 14, color: trendColor }} />
                <Typography variant="caption" sx={{ color: trendColor, fontWeight: 600 }}>
                  {vsAvgPct >= 0 ? '+' : ''}{vsAvgPct.toFixed(0)}% vs 3-mo avg
                </Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">Expected income</Typography>
            <Typography variant="h5" fontWeight={700}>{formatCurrency(expectedIncome)}</Typography>
            <Typography variant="caption" color="text.secondary">post-tax baseline</Typography>
          </Box>
        </Stack>

        <Box sx={{ p: 2, borderRadius: 2, bgcolor: onTrack ? 'rgba(76,175,80,0.08)' : 'rgba(244,67,54,0.08)', border: `1px solid ${onTrack ? 'rgba(76,175,80,0.25)' : 'rgba(244,67,54,0.25)'}` }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
            <Typography variant="body2" fontWeight={600} color={onTrack ? 'success.main' : 'error.main'}>
              {onTrack ? 'On track to save' : 'Projected overspend'}
            </Typography>
            <Typography variant="h5" fontWeight={700} color={onTrack ? 'success.main' : 'error.main'}>
              {onTrack ? '+' : ''}{formatCurrency(projectedSavings)}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={spendVsIncomePct}
            sx={{
              height: 6, borderRadius: 3,
              bgcolor: 'rgba(255,255,255,0.04)',
              '& .MuiLinearProgress-bar': {
                bgcolor: spendVsIncomePct > 90 ? '#F44336' : spendVsIncomePct > 70 ? '#FF9800' : '#4CAF50',
                borderRadius: 3,
              },
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.75 }}>
            <Typography variant="caption" color="text.secondary">
              {spendVsIncomePct.toFixed(0)}% of income spent
            </Typography>
            <Typography variant="caption" color="text.secondary">
              At this pace: {formatCurrency(annualizedSavings)}/yr saved
            </Typography>
          </Box>
        </Box>

        {trailingAvgSpend > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
            3-month avg real spend: {formatCurrency(trailingAvgSpend)}/mo
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default OnPaceCard;
