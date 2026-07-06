import React, { useMemo } from 'react';
import { Card, CardContent, Typography, Box, Tooltip } from '@mui/material';
import { SleepEntry } from '../../hooks/useSleep';
import { sleepDebt, consistency, SLEEP_NEED_HOURS } from '../../lib/sleepInsights';

// Sleep debt + bedtime consistency over a FIXED recent window — deliberately
// independent of the page's 7d/30d/90d/1y filter. Debt is about "how far behind
// am I right now," which is a short rolling concept (7 days); stretching it to a
// year would double-count nights you've already recovered from. Labeled as fixed.
const SleepDebtCard: React.FC<{ entries: SleepEntry[] }> = ({ entries }) => {
  const debt = useMemo(() => sleepDebt(entries, 7), [entries]);
  const cons = useMemo(() => consistency(entries.slice(0, 14)), [entries]);

  const debtColor = debt > 7 ? '#E57373' : debt > 3 ? '#FFB74D' : '#4CAF50';
  const debtLabel = debt > 7 ? 'significant deficit' : debt > 3 ? 'mild deficit' : 'well rested';

  return (
    <Card sx={{ height: '100%', '&:hover': { transform: 'none' } }}>
      <CardContent>
        <Tooltip title="Fixed recent window — does not change with the time filter above.">
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>
            Sleep debt · last 7 days
          </Typography>
        </Tooltip>

        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
          <Typography variant="h2" fontWeight={800} sx={{ color: debtColor, lineHeight: 1 }}>
            {debt.toFixed(1)}
          </Typography>
          <Typography variant="body1" color="text.secondary">hours behind</Typography>
        </Box>
        <Typography variant="caption" sx={{ color: debtColor, fontWeight: 600 }}>{debtLabel}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
          cumulative deficit vs {SLEEP_NEED_HOURS}h/night
        </Typography>

        {cons.bedSd != null && (
          <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Bedtime consistency · last 14 days
            </Typography>
            <Typography variant="body2" fontWeight={700}
              sx={{ color: cons.bedSd < 45 ? '#4CAF50' : cons.bedSd < 90 ? '#FFB74D' : '#E57373' }}>
              ±{Math.round(cons.bedSd)} min
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                {cons.bedSd < 45 ? 'very consistent' : cons.bedSd < 90 ? 'somewhat variable' : 'irregular'}
              </Typography>
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default SleepDebtCard;
