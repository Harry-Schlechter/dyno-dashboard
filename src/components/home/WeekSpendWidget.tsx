import React, { useMemo } from 'react';
import { Card, CardContent, Typography, Box, Stack } from '@mui/material';
import { CreditCard } from '@mui/icons-material';
import { format, startOfWeek } from 'date-fns';
import { useFinances } from '../../hooks/useFinances';
import { isRealSpend, filterTransactionsByRange } from '../../lib/finance';
import { formatCurrency } from '../../lib/formatters';

const WeekSpendWidget: React.FC = () => {
  const { transactions, loading } = useFinances();

  const stats = useMemo(() => {
    if (transactions.length === 0) return null;
    const today = new Date();
    const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const todayStr = format(today, 'yyyy-MM-dd');
    const inWeek = filterTransactionsByRange(transactions, weekStart, todayStr).filter(isRealSpend);
    const total = inWeek.reduce((s, t) => s + Math.abs(t.amount), 0);
    return {
      total,
      count: inWeek.length,
      weekStart,
    };
  }, [transactions]);

  return (
    <Card sx={{ '&:hover': { transform: 'none' }, height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <CreditCard sx={{ fontSize: 18, color: '#F44336' }} />
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>
            This week's spend
          </Typography>
        </Box>

        {loading || !stats ? (
          <Typography variant="h3" sx={{ color: 'text.secondary' }}>—</Typography>
        ) : (
          <>
            <Typography variant="h3" fontWeight={700} sx={{ color: '#5B8DEF' }}>
              {formatCurrency(stats.total)}
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {stats.count} transaction{stats.count !== 1 ? 's' : ''}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                since Mon
              </Typography>
            </Stack>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default WeekSpendWidget;
