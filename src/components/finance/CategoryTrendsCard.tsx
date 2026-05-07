import React, { useMemo } from 'react';
import {
  Card, CardContent, Typography, Box, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow,
} from '@mui/material';
import { TrendingUp, TrendingDown, Remove } from '@mui/icons-material';
import { Transaction } from '../../hooks/useFinances';
import { isRealSpend } from '../../lib/finance';
import { formatCurrency } from '../../lib/formatters';

interface Props {
  transactions: Transaction[];
  // startDate / endDate / rangeLabel are accepted for API parity with the
  // previous version but the trends view always compares last-full-month vs
  // current-month-to-date. Range filter doesn't apply here.
  startDate?: string;
  endDate?: string;
  rangeLabel?: string;
}

interface TrendRow {
  category: string;
  current: number;       // current month-to-date spend
  prior: number;         // last full month spend
  delta: number;         // current - prior
  notable: boolean;
}

const monthKeyOf = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const formatMonthLabel = (key: string): string => {
  const [y, m] = key.split('-');
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleString('en-US', { month: 'short' });
};

const normalizeCategory = (cat: string | null): string => {
  if (!cat) return 'uncategorized';
  return cat.toLowerCase() === 'uncategorized' ? 'uncategorized' : cat;
};

const CategoryTrendsCard: React.FC<Props> = ({ transactions }) => {
  const { rows, currentMonthKey, priorMonthKey } = useMemo(() => {
    const today = new Date();
    const currentMonthKey = monthKeyOf(today);
    const priorDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const priorMonthKey = monthKeyOf(priorDate);

    const inMonth = (key: string) =>
      transactions.filter(t => t.date.startsWith(key) && isRealSpend(t));

    const sumByCategory = (txns: Transaction[]): Map<string, number> => {
      const m = new Map<string, number>();
      for (const t of txns) {
        const cat = normalizeCategory(t.custom_category);
        m.set(cat, (m.get(cat) || 0) + Math.abs(t.amount));
      }
      return m;
    };

    const currentMap = sumByCategory(inMonth(currentMonthKey));
    const priorMap = sumByCategory(inMonth(priorMonthKey));

    const cats = new Set<string>([...currentMap.keys(), ...priorMap.keys()]);
    const rows: TrendRow[] = [];
    for (const cat of cats) {
      const current = currentMap.get(cat) || 0;
      const prior = priorMap.get(cat) || 0;
      const delta = current - prior;
      // Notable = absolute change > $50 AND >50% relative change (when there's a baseline),
      // or a brand-new category over $50, or one that disappeared (had >$50 and now $0).
      const relChange = prior > 0 ? Math.abs(delta) / prior : null;
      const notable =
        (Math.abs(delta) > 50 && relChange !== null && relChange > 0.5)
        || (prior === 0 && current > 50)
        || (current === 0 && prior > 50);
      rows.push({ category: cat, current, prior, delta, notable });
    }
    rows.sort((a, b) => Math.max(b.current, b.prior) - Math.max(a.current, a.prior));
    return { rows, currentMonthKey, priorMonthKey };
  }, [transactions]);

  const notableRows = rows.filter(r => r.notable);
  const visibleRows = rows.filter(r => r.current > 0 || r.prior > 0);
  const currentLabel = formatMonthLabel(currentMonthKey);
  const priorLabel = formatMonthLabel(priorMonthKey);

  return (
    <Card sx={{ '&:hover': { transform: 'none' } }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1.5 }}>
          <Typography variant="h6">Category Trends</Typography>
          <Typography variant="caption" color="text.secondary">
            {currentLabel} (so far) vs {priorLabel} (full month)
          </Typography>
        </Box>

        {notableRows.length > 0 && (
          <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,152,0,0.06)', border: '1px solid rgba(255,152,0,0.2)' }}>
            <Typography variant="caption" fontWeight={600} color="#FF9800" sx={{ letterSpacing: 1, display: 'block', mb: 0.5 }}>
              NOTABLE CHANGES
            </Typography>
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
              {notableRows.slice(0, 6).map(r => (
                <Box key={r.category} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {r.delta > 0 ? (
                    <TrendingUp sx={{ fontSize: 14, color: '#F44336' }} />
                  ) : (
                    <TrendingDown sx={{ fontSize: 14, color: '#4CAF50' }} />
                  )}
                  <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                    {r.category.replace(/_/g, ' ')}: {r.delta >= 0 ? '+' : ''}{formatCurrency(r.delta)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        <TableContainer sx={{ maxHeight: 380 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Category</TableCell>
                <TableCell align="right">{priorLabel}</TableCell>
                <TableCell align="right">{currentLabel}</TableCell>
                <TableCell align="right">Δ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleRows.map(r => {
                const color = r.delta > 0 ? '#F44336' : r.delta < 0 ? '#4CAF50' : 'text.secondary';
                const Icon = r.delta > 0 ? TrendingUp : r.delta < 0 ? TrendingDown : Remove;
                return (
                  <TableRow key={r.category}>
                    <TableCell sx={{ textTransform: 'capitalize' }}>
                      {r.category.replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption" color="text.secondary">{formatCurrency(r.prior)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600}>{formatCurrency(r.current)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.25 }}>
                        <Icon sx={{ fontSize: 14, color }} />
                        <Typography variant="caption" sx={{ color, fontWeight: 600 }}>
                          {r.delta >= 0 ? '+' : ''}{formatCurrency(r.delta)}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

export default CategoryTrendsCard;
