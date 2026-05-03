import React, { useMemo } from 'react';
import {
  Card, CardContent, Typography, Box, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow,
} from '@mui/material';
import { TrendingUp, TrendingDown, Remove } from '@mui/icons-material';
import { Transaction } from '../../hooks/useFinances';
import { isRealSpend, filterTransactionsByRange } from '../../lib/finance';
import { formatCurrency } from '../../lib/formatters';

interface Props {
  transactions: Transaction[];
  startDate: string;
  endDate: string;
  rangeLabel: string;
}

interface TrendRow {
  category: string;
  current: number;
  trailingAvg: number;
  delta: number;
  deltaPct: number | null;
  notable: boolean;
}

const monthsBetween = (startISO: string, endISO: string): number => {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const days = Math.max((end.getTime() - start.getTime()) / 86400000, 1);
  return days / 30.44;
};

const CategoryTrendsCard: React.FC<Props> = ({ transactions, startDate, endDate, rangeLabel }) => {
  const rows = useMemo<TrendRow[]>(() => {
    // Current period spend by category
    const inRange = filterTransactionsByRange(transactions, startDate, endDate).filter(isRealSpend);
    const currentMap = new Map<string, number>();
    for (const t of inRange) {
      const cat = (t.custom_category || 'uncategorized').toLowerCase() === 'uncategorized'
        ? 'uncategorized'
        : t.custom_category || 'uncategorized';
      currentMap.set(cat, (currentMap.get(cat) || 0) + Math.abs(t.amount));
    }
    const periodMonths = Math.max(monthsBetween(startDate, endDate), 0.1);

    // Trailing 90 days BEFORE startDate as baseline
    const baselineEnd = new Date(startDate);
    baselineEnd.setDate(baselineEnd.getDate() - 1);
    const baselineStart = new Date(baselineEnd);
    baselineStart.setDate(baselineStart.getDate() - 90);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const baseline = filterTransactionsByRange(transactions, fmt(baselineStart), fmt(baselineEnd)).filter(isRealSpend);
    const baselineMonths = Math.max(monthsBetween(fmt(baselineStart), fmt(baselineEnd)), 0.1);
    const baselineMap = new Map<string, number>();
    for (const t of baseline) {
      const cat = (t.custom_category || 'uncategorized').toLowerCase() === 'uncategorized'
        ? 'uncategorized'
        : t.custom_category || 'uncategorized';
      baselineMap.set(cat, (baselineMap.get(cat) || 0) + Math.abs(t.amount));
    }

    const cats = new Set<string>([...currentMap.keys(), ...baselineMap.keys()]);
    const trendRows: TrendRow[] = [];
    for (const cat of cats) {
      // Normalize both to per-month rate so different period lengths compare fairly
      const current = (currentMap.get(cat) || 0) / periodMonths;
      const trailingAvg = (baselineMap.get(cat) || 0) / baselineMonths;
      const delta = current - trailingAvg;
      const deltaPct = trailingAvg > 0 ? (delta / trailingAvg) * 100 : null;
      const notable = (deltaPct !== null && Math.abs(deltaPct) >= 25 && current > 20)
        || (trailingAvg === 0 && current > 50)
        || (current === 0 && trailingAvg > 50);
      trendRows.push({ category: cat, current, trailingAvg, delta, deltaPct, notable });
    }
    return trendRows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }, [transactions, startDate, endDate]);

  const notableRows = rows.filter(r => r.notable);

  return (
    <Card sx={{ '&:hover': { transform: 'none' } }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1.5 }}>
          <Typography variant="h6">Category Trends</Typography>
          <Typography variant="caption" color="text.secondary">
            {rangeLabel} vs prior 90-day avg (per-month rate)
          </Typography>
        </Box>

        {notableRows.length > 0 && (
          <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,152,0,0.06)', border: '1px solid rgba(255,152,0,0.2)' }}>
            <Typography variant="caption" fontWeight={600} color="#FF9800" sx={{ letterSpacing: 1, display: 'block', mb: 0.5 }}>
              NOTABLE CHANGES
            </Typography>
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
              {notableRows.slice(0, 5).map(r => (
                <Box key={r.category} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {r.delta > 0 ? (
                    <TrendingUp sx={{ fontSize: 14, color: '#F44336' }} />
                  ) : (
                    <TrendingDown sx={{ fontSize: 14, color: '#4CAF50' }} />
                  )}
                  <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                    {r.category.replace(/_/g, ' ')}: {r.deltaPct !== null ? `${r.deltaPct >= 0 ? '+' : ''}${r.deltaPct.toFixed(0)}%` : 'new'}
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
                <TableCell align="right">Current /mo</TableCell>
                <TableCell align="right">Prior avg /mo</TableCell>
                <TableCell align="right">Δ</TableCell>
                <TableCell align="right">Δ%</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.filter(r => r.current > 0 || r.trailingAvg > 0).map(r => {
                const color = r.deltaPct === null ? 'text.secondary' : r.delta > 0 ? '#F44336' : r.delta < 0 ? '#4CAF50' : 'text.secondary';
                const Icon = r.delta > 0 ? TrendingUp : r.delta < 0 ? TrendingDown : Remove;
                return (
                  <TableRow key={r.category}>
                    <TableCell sx={{ textTransform: 'capitalize' }}>
                      {r.category.replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600}>{formatCurrency(r.current)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption" color="text.secondary">{formatCurrency(r.trailingAvg)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.25 }}>
                        <Icon sx={{ fontSize: 14, color }} />
                        <Typography variant="caption" sx={{ color }}>
                          {r.delta >= 0 ? '+' : ''}{formatCurrency(r.delta)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption" sx={{ color, fontWeight: 600 }}>
                        {r.deltaPct === null ? 'new' : `${r.deltaPct >= 0 ? '+' : ''}${r.deltaPct.toFixed(0)}%`}
                      </Typography>
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
