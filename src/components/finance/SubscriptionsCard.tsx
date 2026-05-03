import React, { useMemo, useState } from 'react';
import {
  Card, CardContent, Typography, Box, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Tooltip, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import { WarningAmberOutlined, AutoAwesome } from '@mui/icons-material';
import { Transaction } from '../../hooks/useFinances';
import { formatCurrency, formatDateShort } from '../../lib/formatters';

interface Props {
  transactions: Transaction[];
}

interface MerchantGroup {
  merchant: string;
  isAi: boolean;
  total: number;
  count: number;
  avg: number;
  estMonthly: number;       // estimated monthly cost (count / span_months)
  lastDate: string;
  lastAmount: number;
  txns: Transaction[];
  flags: string[];          // human-readable flags (duplicates, miscategorized, etc.)
}

const monthsBetween = (startISO: string, endISO: string): number => {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const days = Math.max((end.getTime() - start.getTime()) / 86400000, 1);
  return days / 30.44;
};

const SubscriptionsCard: React.FC<Props> = ({ transactions }) => {
  const [filter, setFilter] = useState<'active' | 'all'>('active');

  const cutoffDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }, []);

  const groups = useMemo<MerchantGroup[]>(() => {
    const subs = transactions.filter(t =>
      t.custom_category === 'subscriptions' || t.custom_category === 'subscriptions_ai'
    );
    if (subs.length === 0) return [];

    // Group by merchant_name (fallback to description)
    const map = new Map<string, Transaction[]>();
    for (const t of subs) {
      const key = (t.merchant_name || t.description || 'Unknown').trim();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }

    const allDates = subs.map(t => t.date).sort();
    const spanMonths = allDates.length > 1
      ? Math.max(monthsBetween(allDates[0], allDates[allDates.length - 1]), 1)
      : 1;

    const groups: MerchantGroup[] = [];
    for (const [merchant, txns] of map.entries()) {
      const sorted = [...txns].sort((a, b) => b.date.localeCompare(a.date));
      const isAi = sorted.every(t => t.custom_category === 'subscriptions_ai');
      const negTxns = sorted.filter(t => t.amount < 0);
      const posTxns = sorted.filter(t => t.amount > 0);

      // Real subscription cost = absolute spend on negative-amount rows only
      const total = negTxns.reduce((s, t) => s + Math.abs(t.amount), 0);
      const count = negTxns.length;
      const avg = count > 0 ? total / count : 0;
      const estMonthly = count > 0 ? total / spanMonths : 0;

      const flags: string[] = [];
      if (posTxns.length > 0) {
        flags.push(`miscategorized: ${posTxns.length} positive amount${posTxns.length > 1 ? 's' : ''} (likely investment/refund)`);
      }
      // Same-day duplicate check
      const dateAmtCount = new Map<string, number>();
      for (const t of negTxns) {
        const key = `${t.date}|${t.amount}`;
        dateAmtCount.set(key, (dateAmtCount.get(key) || 0) + 1);
      }
      const dupes = [...dateAmtCount.entries()].filter(([_, c]) => c > 1);
      if (dupes.length > 0) {
        flags.push(`possible duplicate charge${dupes.length > 1 ? 's' : ''}`);
      }

      groups.push({
        merchant,
        isAi,
        total,
        count,
        avg,
        estMonthly,
        lastDate: sorted[0]?.date || '',
        lastAmount: Math.abs(sorted[0]?.amount || 0),
        txns: sorted,
        flags,
      });
    }

    return groups.sort((a, b) => b.estMonthly - a.estMonthly);
  }, [transactions]);

  const visibleGroups = useMemo(() => {
    if (filter === 'all') return groups;
    return groups.filter(g => g.lastDate >= cutoffDate);
  }, [groups, filter, cutoffDate]);

  const hiddenCount = groups.length - visibleGroups.length;

  const totalMonthly = visibleGroups.reduce((s, g) => s + g.estMonthly, 0);
  const aiMonthly = visibleGroups.filter(g => g.isAi).reduce((s, g) => s + g.estMonthly, 0);
  const otherMonthly = totalMonthly - aiMonthly;

  return (
    <Card sx={{ '&:hover': { transform: 'none' } }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h6">Subscriptions</Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={filter}
              onChange={(_, v) => v && setFilter(v)}
            >
              <ToggleButton value="active" sx={{ textTransform: 'none', py: 0.25, px: 1 }}>
                Active (30d)
              </ToggleButton>
              <ToggleButton value="all" sx={{ textTransform: 'none', py: 0.25, px: 1 }}>
                All
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary">Est. monthly</Typography>
            <Typography variant="h6" fontWeight={700}>{formatCurrency(totalMonthly)}</Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={3} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">AI subscriptions</Typography>
            <Typography variant="body1" fontWeight={600} color="#764ba2">{formatCurrency(aiMonthly)}/mo</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Other</Typography>
            <Typography variant="body1" fontWeight={600}>{formatCurrency(otherMonthly)}/mo</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Annualized</Typography>
            <Typography variant="body1" fontWeight={600}>{formatCurrency(totalMonthly * 12)}/yr</Typography>
          </Box>
        </Stack>

        {visibleGroups.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {filter === 'active'
              ? 'No active subscriptions in the last 30 days.'
              : 'No subscription transactions found.'}
          </Typography>
        ) : (
          <TableContainer sx={{ maxHeight: 420 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Merchant</TableCell>
                  <TableCell align="right">Charges</TableCell>
                  <TableCell align="right">Avg</TableCell>
                  <TableCell align="right">Est /mo</TableCell>
                  <TableCell>Last charge</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleGroups.map(g => (
                  <TableRow key={g.merchant} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {g.isAi && (
                          <Tooltip title="AI subscription">
                            <AutoAwesome sx={{ fontSize: 14, color: '#764ba2' }} />
                          </Tooltip>
                        )}
                        <Typography variant="body2" fontWeight={500}>{g.merchant}</Typography>
                        {g.flags.length > 0 && (
                          <Tooltip title={g.flags.join(' · ')}>
                            <WarningAmberOutlined sx={{ fontSize: 14, color: '#FF9800' }} />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="right">{g.count}</TableCell>
                    <TableCell align="right">{formatCurrency(g.avg)}</TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600}>{formatCurrency(g.estMonthly)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {g.lastDate ? formatDateShort(g.lastDate) : '--'} · {formatCurrency(g.lastAmount)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {filter === 'active' && hiddenCount > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            {hiddenCount} inactive subscription{hiddenCount > 1 ? 's' : ''} hidden (no charge in 30+ days)
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default SubscriptionsCard;
