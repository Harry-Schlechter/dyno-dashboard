import React, { useMemo, useState } from 'react';
import {
  Card, CardContent, Typography, Box, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tooltip, ToggleButton, ToggleButtonGroup, Chip,
} from '@mui/material';
import { WarningAmberOutlined, AutoAwesome, PauseCircleOutline, CancelOutlined } from '@mui/icons-material';
import { Transaction } from '../../hooks/useFinances';
import { Subscription, useSubscriptions } from '../../hooks/useSubscriptions';
import { formatCurrency, formatDateShort } from '../../lib/formatters';

interface Props {
  transactions: Transaction[];
}

interface Row {
  sub: Subscription;
  monthlyEquivalent: number;
  recentMatches: Transaction[];
  lastCharge: Transaction | null;
  driftFlag: string | null;       // "charged $X, expected $Y"
  staleFlag: string | null;       // "no charge in N days, expected by D"
}

const CADENCE_TO_MONTHS: Record<Subscription['cadence'], number> = {
  weekly: 0.25,
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

const matchesPattern = (t: Transaction, pattern: string): boolean => {
  const p = pattern.toLowerCase();
  const m = (t.merchant_name || '').toLowerCase();
  const d = (t.description || '').toLowerCase();
  return m.includes(p) || d.includes(p);
};

const daysBetween = (a: string, b: string): number =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);

const SubscriptionsCard: React.FC<Props> = ({ transactions }) => {
  const { subscriptions, loading } = useSubscriptions();
  const [filter, setFilter] = useState<'active' | 'all'>('active');

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const rows = useMemo<Row[]>(() => {
    if (!subscriptions) return [];

    return subscriptions.map(sub => {
      const months = CADENCE_TO_MONTHS[sub.cadence];
      const monthlyEquivalent = sub.expected_amount / months;

      const matches = transactions
        .filter(t => t.amount < 0 && matchesPattern(t, sub.merchant_pattern))
        .sort((a, b) => b.date.localeCompare(a.date));
      const lastCharge = matches[0] || null;

      let driftFlag: string | null = null;
      if (lastCharge) {
        const charged = Math.abs(lastCharge.amount);
        const ratio = charged / sub.expected_amount;
        if (ratio < 0.8 || ratio > 1.2) {
          driftFlag = `Last charge ${formatCurrency(charged)} vs expected ${formatCurrency(sub.expected_amount)}`;
        }
      }

      let staleFlag: string | null = null;
      if (sub.status === 'active' && sub.next_expected_at && sub.next_expected_at < todayISO) {
        const daysLate = daysBetween(sub.next_expected_at, todayISO);
        if (daysLate > 3) {
          staleFlag = `${daysLate}d past expected (${formatDateShort(sub.next_expected_at)})`;
        }
      }

      return { sub, monthlyEquivalent, recentMatches: matches, lastCharge, driftFlag, staleFlag };
    }).sort((a, b) => b.monthlyEquivalent - a.monthlyEquivalent);
  }, [subscriptions, transactions, todayISO]);

  const visibleRows = useMemo(() => {
    if (filter === 'all') return rows;
    return rows.filter(r => r.sub.status === 'active' || r.sub.status === 'trial');
  }, [rows, filter]);

  const hiddenCount = rows.length - visibleRows.length;
  const totalMonthly = visibleRows
    .filter(r => r.sub.status !== 'canceled')
    .reduce((s, r) => s + r.monthlyEquivalent, 0);

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
                Active
              </ToggleButton>
              <ToggleButton value="all" sx={{ textTransform: 'none', py: 0.25, px: 1 }}>
                All
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary">Est. monthly</Typography>
            <Typography variant="h6" fontWeight={700}>{formatCurrency(totalMonthly)}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {formatCurrency(totalMonthly * 12)}/yr
            </Typography>
          </Box>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          Ask the financial-advisor agent on Telegram to add, remove, pause, or update any subscription.
        </Typography>

        {loading ? (
          <Typography variant="body2" color="text.secondary">Loading subscriptions…</Typography>
        ) : visibleRows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No subscriptions yet. The auto-detector will add ones with 3+ same-amount monthly charges. You can also add them manually via the agent.
          </Typography>
        ) : (
          <TableContainer sx={{ maxHeight: 460 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Subscription</TableCell>
                  <TableCell align="right">Expected</TableCell>
                  <TableCell align="right">/mo</TableCell>
                  <TableCell>Last charge</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleRows.map(r => (
                  <TableRow key={r.sub.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {r.sub.source === 'detected' && (
                          <Tooltip title="Auto-detected from repeat charges">
                            <AutoAwesome sx={{ fontSize: 14, color: '#764ba2' }} />
                          </Tooltip>
                        )}
                        <Typography variant="body2" fontWeight={500}>{r.sub.name}</Typography>
                        {(r.driftFlag || r.staleFlag) && (
                          <Tooltip title={[r.driftFlag, r.staleFlag].filter(Boolean).join(' · ')}>
                            <WarningAmberOutlined sx={{ fontSize: 14, color: '#FF9800' }} />
                          </Tooltip>
                        )}
                        {r.sub.tier === 'cancel_candidate' && (
                          <Tooltip title="Marked as cancel candidate"><CancelOutlined sx={{ fontSize: 14, color: '#F44336' }} /></Tooltip>
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary">{r.sub.cadence}</Typography>
                    </TableCell>
                    <TableCell align="right">{formatCurrency(r.sub.expected_amount)}</TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600}>{formatCurrency(r.monthlyEquivalent)}</Typography>
                    </TableCell>
                    <TableCell>
                      {r.lastCharge ? (
                        <Typography variant="caption" color="text.secondary">
                          {formatDateShort(r.lastCharge.date)} · {formatCurrency(Math.abs(r.lastCharge.amount))}
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusChip status={r.sub.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {filter === 'active' && hiddenCount > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            {hiddenCount} canceled/paused hidden
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

const StatusChip: React.FC<{ status: Subscription['status'] }> = ({ status }) => {
  const map: Record<Subscription['status'], { label: string; color: string; icon?: React.ReactNode }> = {
    active:   { label: 'Active',   color: '#4CAF50' },
    trial:    { label: 'Trial',    color: '#FF9800' },
    paused:   { label: 'Paused',   color: '#90CAF9', icon: <PauseCircleOutline sx={{ fontSize: 12 }} /> },
    canceled: { label: 'Canceled', color: '#777' },
  };
  const v = map[status];
  return (
    <Chip
      label={v.label}
      icon={v.icon as any}
      size="small"
      sx={{ bgcolor: 'transparent', color: v.color, border: `1px solid ${v.color}40`, height: 20, fontSize: 11 }}
    />
  );
};

export default SubscriptionsCard;
