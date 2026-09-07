import React, { useMemo } from 'react';
import { Box, Card, CardContent, Typography, Grid, Stack, LinearProgress } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import { formatCurrency } from '../../lib/formatters';
import { isRealSpend, trailingMonthlyAvgSpend } from '../../lib/finance';
import { Transaction } from '../../hooks/useFinances';

// This-month spending vs recent average + top category movers. Lives in the
// Finances → Overview (spend-tracking), not the Plan tab (which is now purely
// projection/allocation).
const SpendingIntelligence: React.FC<{
  transactions: Transaction[];
  monthlySpending: Array<{ month: string; category: string; total: number }>;
}> = ({ transactions, monthlySpending }) => {
  const today = useMemo(() => new Date(), []);
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const actualSpendThisMonth = useMemo(() =>
    transactions.filter(t => t.date.startsWith(currentMonthKey) && isRealSpend(t)).reduce((s, t) => s + Math.abs(t.amount), 0),
    [transactions, currentMonthKey]);
  const trailing3Avg = useMemo(() => trailingMonthlyAvgSpend(transactions, today, 3), [transactions, today]);

  const spendingByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    monthlySpending.forEach(r => { map[r.month] = (map[r.month] || 0) + r.total; });
    return map;
  }, [monthlySpending]);
  const sortedMonths = useMemo(() => Object.keys(spendingByMonth).sort().reverse(), [spendingByMonth]);
  const currentMonthSpend = spendingByMonth[currentMonthKey] || actualSpendThisMonth;
  const avgN = (n: number) => {
    const past = sortedMonths.filter(m => m < currentMonthKey).slice(0, n);
    return past.length ? past.reduce((s, m) => s + spendingByMonth[m], 0) / past.length : trailing3Avg;
  };
  const avg3mo = useMemo(() => avgN(3), [sortedMonths, currentMonthKey, spendingByMonth, trailing3Avg]); // eslint-disable-line react-hooks/exhaustive-deps
  const avg6mo = useMemo(() => avgN(6), [sortedMonths, currentMonthKey, spendingByMonth, trailing3Avg]); // eslint-disable-line react-hooks/exhaustive-deps
  const spendVsAvgPct = avg3mo > 0 ? ((currentMonthSpend - avg3mo) / avg3mo) * 100 : null;

  const currentCats = useMemo(() => {
    const thisMonth = monthlySpending.filter(r => r.month === currentMonthKey);
    const prev = monthlySpending.filter(r => r.month < currentMonthKey);
    const byMonth = new Set(prev.map(r => r.month));
    const n = Math.min(byMonth.size, 3) || 1;
    const avgByCat: Record<string, number> = {};
    prev.forEach(r => { avgByCat[r.category] = (avgByCat[r.category] || 0) + r.total / n; });
    return thisMonth.map(r => ({
      category: r.category, current: r.total,
      delta: r.total - (avgByCat[r.category] || 0),
      pct: avgByCat[r.category] ? ((r.total - avgByCat[r.category]) / avgByCat[r.category]) * 100 : 0,
    })).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 3);
  }, [monthlySpending, currentMonthKey]);

  const banner = spendVsAvgPct !== null && spendVsAvgPct > 15
    ? { color: '#FF9800', icon: '⚠️', text: `Spending up ${spendVsAvgPct.toFixed(0)}% vs your average — consider slowing down` }
    : spendVsAvgPct !== null && spendVsAvgPct < -15
      ? { color: '#4CAF50', icon: '✅', text: `Spending down ${Math.abs(spendVsAvgPct).toFixed(0)}% vs your average — nice` }
      : null;

  return (
    <Grid container spacing={2.5} sx={{ mb: 1 }}>
      <Grid size={{ xs: 12 }}>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>Spending Intelligence</Typography>
      </Grid>
      {banner && (
        <Grid size={{ xs: 12 }}>
          <Box sx={{ p: 2, borderRadius: 2, bgcolor: `${banner.color}11`, border: `1px solid ${banner.color}33` }}>
            <Typography variant="body1" fontWeight={600} sx={{ color: banner.color }}>{banner.icon} {banner.text}</Typography>
          </Box>
        </Grid>
      )}
      <Grid size={{ xs: 12, md: 4 }}>
        <Card sx={{ '&:hover': { transform: 'none' } }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">This Month vs Average</Typography>
            <Stack spacing={2} sx={{ mt: 1.5 }}>
              <Box><Typography variant="caption" color="text.secondary">This month</Typography><Typography variant="h5" fontWeight={700}>{formatCurrency(currentMonthSpend)}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">3-month avg</Typography><Typography variant="h6" fontWeight={600} color="text.secondary">{formatCurrency(avg3mo)}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">6-month avg</Typography><Typography variant="h6" fontWeight={600} color="text.secondary">{formatCurrency(avg6mo)}</Typography></Box>
              {spendVsAvgPct !== null && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {spendVsAvgPct >= 0 ? <TrendingUp sx={{ fontSize: 18, color: '#F44336' }} /> : <TrendingDown sx={{ fontSize: 18, color: '#4CAF50' }} />}
                  <Typography variant="body1" fontWeight={700} sx={{ color: spendVsAvgPct >= 0 ? '#F44336' : '#4CAF50' }}>
                    {spendVsAvgPct >= 0 ? '+' : ''}{spendVsAvgPct.toFixed(1)}% vs avg
                  </Typography>
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 8 }}>
        <Card sx={{ '&:hover': { transform: 'none' } }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Top Category Movers</Typography>
            {currentCats.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No category data for the current month yet.</Typography>
            ) : (
              <Stack spacing={1.5}>
                {currentCats.map(cat => (
                  <Box key={cat.category}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'capitalize' }}>{cat.category}</Typography>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">{formatCurrency(cat.current)}</Typography>
                        <Typography variant="caption" sx={{ color: cat.delta >= 0 ? '#F44336' : '#4CAF50', fontWeight: 600 }}>
                          {cat.delta >= 0 ? '↑' : '↓'} {Math.abs(cat.pct).toFixed(0)}%
                        </Typography>
                      </Box>
                    </Box>
                    <LinearProgress variant="determinate" value={Math.min((cat.current / (avg3mo || 1)) * 100 * 3, 100)}
                      sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.04)', '& .MuiLinearProgress-bar': { bgcolor: cat.delta >= 0 ? '#F44336' : '#4CAF50', borderRadius: 3 } }} />
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default SpendingIntelligence;
