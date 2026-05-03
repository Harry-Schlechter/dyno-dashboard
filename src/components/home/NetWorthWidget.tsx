import React, { useMemo } from 'react';
import { Card, CardContent, Typography, Box, Stack, Tooltip } from '@mui/material';
import { TrendingUp, TrendingDown, InfoOutlined } from '@mui/icons-material';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useFinances } from '../../hooks/useFinances';
import { useFinanceProjection } from '../../hooks/useFinanceProjection';
import { savedLastMonth, expectedMonthlyIncome } from '../../lib/finance';
import { formatCurrency } from '../../lib/formatters';

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

const NetWorthWidget: React.FC = () => {
  const { netWorth, transactions, loading } = useFinances();
  const { projection } = useFinanceProjection();

  const current = netWorth[0] ?? null;

  const today = useMemo(() => new Date(), []);
  const startLastMonth = useMemo(() => fmt(startOfMonth(subMonths(today, 1))), [today]);
  const endLastMonth = useMemo(() => fmt(endOfMonth(subMonths(today, 1))), [today]);

  // Last-month cash flow = expected income - real spend (transactions-based, not NW snapshot)
  const lastMonthSaved = useMemo(
    () => transactions.length === 0 ? null : savedLastMonth(transactions, startLastMonth, endLastMonth),
    [transactions, startLastMonth, endLastMonth],
  );

  const monthlyIncome = expectedMonthlyIncome();
  const lastMonthPct = useMemo(() => {
    if (lastMonthSaved === null || monthlyIncome <= 0) return null;
    return (lastMonthSaved / monthlyIncome) * 100;
  }, [lastMonthSaved, monthlyIncome]);

  return (
    <Card sx={{ '&:hover': { transform: 'none' }, height: '100%' }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>Net Worth</Typography>
        {loading || !current ? (
          <Typography variant="h3" fontWeight={700} sx={{ mt: 1, color: 'text.secondary' }}>—</Typography>
        ) : (
          <>
            <Typography variant="h3" fontWeight={700} sx={{ mt: 0.5, color: '#5B8DEF' }}>
              {formatCurrency(current.net_worth)}
            </Typography>

            <Stack direction="row" spacing={3} sx={{ mt: 1.5 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Assets</Typography>
                <Typography variant="body2" fontWeight={600} color="success.main">
                  {formatCurrency(current.total_assets)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Liabilities</Typography>
                <Typography variant="body2" fontWeight={600} color="error.main">
                  {formatCurrency(Math.abs(current.total_liabilities))}
                </Typography>
              </Box>
            </Stack>

            <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <Stack spacing={1}>
                <ChangeRow
                  label="Saved last month"
                  delta={lastMonthSaved}
                  pct={lastMonthPct}
                  hint={`Income ${formatCurrency(monthlyIncome)} − real spend ${formatCurrency(monthlyIncome - (lastMonthSaved ?? 0))}`}
                />
                <ChangeRow
                  label="On pace this month"
                  delta={projection.projectedSavings}
                  pct={null}
                  hint="Expected income − projected spend at current burn rate"
                  isProjection
                />
              </Stack>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

const ChangeRow: React.FC<{
  label: string;
  delta: number | null;
  pct: number | null;
  hint?: string;
  isProjection?: boolean;
}> = ({ label, delta, pct, hint, isProjection }) => {
  if (delta === null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="caption" color="text.secondary">—</Typography>
      </Box>
    );
  }
  const positive = delta >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  const color = positive ? '#4CAF50' : '#F44336';
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        {hint && (
          <Tooltip title={hint}>
            <InfoOutlined sx={{ fontSize: 11, color: 'text.secondary' }} />
          </Tooltip>
        )}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Icon sx={{ fontSize: 14, color }} />
        <Typography variant="caption" sx={{ color, fontWeight: 600 }}>
          {delta >= 0 && '+'}{formatCurrency(delta)}
          {pct !== null && ` (${pct >= 0 ? '+' : ''}${pct.toFixed(0)}% saved)`}
        </Typography>
      </Box>
    </Box>
  );
};

export default NetWorthWidget;
