import React, { useMemo, useState } from 'react';
import {
  Card, CardContent, Typography, Box, Stack, Tabs, Tab, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip,
} from '@mui/material';
import { AccountBalance, ShowChart, Savings, WarningAmberOutlined } from '@mui/icons-material';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { FinancialAccount, InvestmentHolding, InvestmentActivity } from '../../hooks/useFinances';
import { bucketForAccount, FinanceBucket } from '../../lib/finance';
import { formatCurrency, formatNumber, formatDateShort } from '../../lib/formatters';
import RecentTradesCard from './RecentTradesCard';

const CHART_COLORS = ['#5B8DEF', '#764ba2', '#4CAF50', '#FF9800', '#F44336', '#90CAF9', '#FFB74D', '#81C784', '#E57373', '#64B5F6'];

interface Props {
  accounts: FinancialAccount[];
  holdings: InvestmentHolding[];
  investmentActivity: InvestmentActivity[];
}

type ViewKey = 'retirement' | 'brokerage' | 'cash';

const VIEW_LABEL: Record<ViewKey, string> = {
  retirement: 'Retirement',
  brokerage: 'Brokerage',
  cash: 'Cash',
};

const VIEW_ICON: Record<ViewKey, React.ReactNode> = {
  retirement: <ShowChart sx={{ fontSize: 18 }} />,
  brokerage: <AccountBalance sx={{ fontSize: 18 }} />,
  cash: <Savings sx={{ fontSize: 18 }} />,
};

// Pick only the latest snapshot per account, then SUM by ticker.
// SimpleFIN returns one row per contribution source (employee pre-tax, employer
// match, Roth) for the same fund — all distinct rows with the same ticker.
// Older snapshots may also contain ghost positions that no longer exist
// (e.g. funds reallocated out of), so we discard everything except the
// latest snapshot_date for each account.
const latestHoldingsPerTicker = (holdings: InvestmentHolding[]): InvestmentHolding[] => {
  // 1. find latest snapshot_date per account_id
  const latestDate = new Map<string, string>();
  for (const h of holdings) {
    const cur = latestDate.get(h.account_id);
    if (!cur || h.snapshot_date > cur) latestDate.set(h.account_id, h.snapshot_date);
  }

  // 2. accumulate same-ticker rows within the latest snapshot
  const map = new Map<string, InvestmentHolding>();
  for (const h of holdings) {
    if (h.snapshot_date !== latestDate.get(h.account_id)) continue;
    const key = `${h.account_id}|${h.ticker}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...h });
    } else {
      existing.quantity += h.quantity;
      existing.current_value += h.current_value;
      existing.cost_basis += h.cost_basis;
      existing.gain_loss = existing.current_value - existing.cost_basis;
      existing.gain_loss_pct = existing.cost_basis > 0
        ? (existing.gain_loss / existing.cost_basis) * 100
        : 0;
    }
  }
  return [...map.values()];
};

const InvestmentsPanel: React.FC<Props> = ({ accounts, holdings, investmentActivity }) => {
  const [view, setView] = useState<ViewKey>('retirement');

  // Map account_id -> bucket and account info
  const accountInfo = useMemo(() => {
    const map = new Map<string, FinancialAccount & { bucket: FinanceBucket }>();
    for (const a of accounts) {
      map.set(a.id, { ...a, bucket: bucketForAccount(a) });
    }
    return map;
  }, [accounts]);

  const latestHoldings = useMemo(() => latestHoldingsPerTicker(holdings), [holdings]);

  // Group holdings by bucket (using override-aware bucket map)
  const holdingsByBucket = useMemo(() => {
    const map: Record<ViewKey, InvestmentHolding[]> = { retirement: [], brokerage: [], cash: [] };
    for (const h of latestHoldings) {
      const acct = accountInfo.get(h.account_id);
      if (!acct) continue;
      const bucket = acct.bucket;
      if (bucket === 'retirement' || bucket === 'brokerage') {
        map[bucket].push(h);
      }
    }
    return map;
  }, [latestHoldings, accountInfo]);

  // Cash: depository accounts + the SPAXX position inside Joint WROS (treat as emergency fund)
  const cashAccounts = useMemo(
    () => accounts.filter(a => a.is_active && bucketForAccount(a) === 'cash'),
    [accounts],
  );

  // Bucket totals
  const bucketTotals = useMemo(() => {
    const cashFromAccounts = cashAccounts.reduce((s, a) => s + (a.current_balance || 0), 0);
    const cashFromHoldings = latestHoldings
      .filter(h => h.asset_class === 'Cash')
      .reduce((s, h) => s + (h.current_value || 0), 0);
    return {
      retirement: holdingsByBucket.retirement.reduce((s, h) => s + (h.current_value || 0), 0),
      brokerage: holdingsByBucket.brokerage
        .filter(h => h.asset_class !== 'Cash') // exclude SPAXX from brokerage equity total
        .reduce((s, h) => s + (h.current_value || 0), 0),
      cash: cashFromAccounts + cashFromHoldings,
    };
  }, [holdingsByBucket, latestHoldings, cashAccounts]);

  const grandTotal = bucketTotals.retirement + bucketTotals.brokerage + bucketTotals.cash;

  // Holdings grouped by account for the active view
  const accountsInView = useMemo(() => {
    if (view === 'cash') return [];
    const byAccount = new Map<string, InvestmentHolding[]>();
    const list = view === 'brokerage'
      ? holdingsByBucket.brokerage.filter(h => h.asset_class !== 'Cash')
      : holdingsByBucket[view];
    for (const h of list) {
      if (!byAccount.has(h.account_id)) byAccount.set(h.account_id, []);
      byAccount.get(h.account_id)!.push(h);
    }
    return [...byAccount.entries()].map(([accountId, hs]) => ({
      account: accountInfo.get(accountId)!,
      holdings: hs.sort((a, b) => (b.current_value || 0) - (a.current_value || 0)),
      total: hs.reduce((s, h) => s + (h.current_value || 0), 0),
    })).sort((a, b) => b.total - a.total);
  }, [view, holdingsByBucket, accountInfo]);

  // Allocation pie data — by account name within active view
  const allocationData = useMemo(() => {
    if (view === 'cash') {
      const data: { name: string; value: number }[] = [];
      for (const a of cashAccounts) {
        if (a.current_balance > 0) data.push({ name: a.account_name, value: Math.round(a.current_balance) });
      }
      // SPAXX from Joint WROS as its own slice
      const spaxx = latestHoldings.find(h => h.asset_class === 'Cash');
      if (spaxx && spaxx.current_value > 0) {
        const acct = accountInfo.get(spaxx.account_id);
        data.push({
          name: `${acct?.institution || 'Cash'} — Emergency Fund (${spaxx.ticker})`,
          value: Math.round(spaxx.current_value),
        });
      }
      return data.sort((a, b) => b.value - a.value);
    }
    return accountsInView
      .map(a => ({ name: `${a.account.institution} — ${a.account.account_name}`, value: Math.round(a.total) }))
      .filter(d => d.value > 0);
  }, [view, cashAccounts, latestHoldings, accountInfo, accountsInView]);

  // Position concentration warning (>30% in single name in any individual account)
  const concentrationWarnings = useMemo(() => {
    const warnings: { account: string; ticker: string; pct: number }[] = [];
    for (const a of accountsInView) {
      if (a.total < 1000) continue;
      for (const h of a.holdings) {
        const pct = (h.current_value / a.total) * 100;
        if (pct >= 30 && (h.asset_class !== 'Cash')) {
          warnings.push({ account: a.account.account_name, ticker: h.ticker || '?', pct });
        }
      }
    }
    return warnings;
  }, [accountsInView]);

  return (
    <Stack spacing={2.5}>
      {/* Bucket summary tiles */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        {(['retirement', 'brokerage', 'cash'] as ViewKey[]).map(key => {
          const total = bucketTotals[key];
          const pct = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
          const active = view === key;
          return (
            <Card
              key={key}
              onClick={() => setView(key)}
              sx={{
                flex: 1,
                cursor: 'pointer',
                borderColor: active ? '#5B8DEF' : undefined,
                borderWidth: active ? 2 : 1,
                borderStyle: 'solid',
                bgcolor: active ? 'rgba(91,141,239,0.06)' : undefined,
                transition: 'border-color 0.2s, background-color 0.2s',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {VIEW_ICON[key]}
                  <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
                    {VIEW_LABEL[key]}
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={700} color="#5B8DEF">{formatCurrency(total)}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {pct.toFixed(1)}% of {formatCurrency(grandTotal)}
                </Typography>
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      <Tabs value={view} onChange={(_, v) => setView(v)} sx={{ borderBottom: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
        <Tab label="Retirement" value="retirement" />
        <Tab label="Brokerage" value="brokerage" />
        <Tab label="Cash & Emergency" value="cash" />
      </Tabs>

      {/* Allocation pie */}
      {allocationData.length > 0 && (
        <Card sx={{ '&:hover': { transform: 'none' } }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {VIEW_LABEL[view]} Allocation
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={allocationData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={110}
                    paddingAngle={2}
                  >
                    {allocationData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(v: number) => formatCurrency(v)}
                    contentStyle={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#7d8590' }} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Concentration warnings (brokerage view especially) */}
      {concentrationWarnings.length > 0 && (
        <Card sx={{ '&:hover': { transform: 'none' }, borderColor: 'rgba(255,152,0,0.35)', borderStyle: 'solid', borderWidth: 1 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <WarningAmberOutlined sx={{ color: '#FF9800' }} />
              <Typography variant="subtitle1" fontWeight={600}>Concentration risk</Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {concentrationWarnings.map(w => (
                <Chip
                  key={`${w.account}-${w.ticker}`}
                  label={`${w.ticker} ${w.pct.toFixed(0)}% of ${w.account}`}
                  sx={{ bgcolor: 'rgba(255,152,0,0.1)', color: '#FF9800', border: '1px solid rgba(255,152,0,0.3)' }}
                />
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Account-by-account holdings */}
      {view !== 'cash' && accountsInView.map(({ account, holdings: hs, total }) => (
        <Card key={account.id} sx={{ '&:hover': { transform: 'none' } }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Box>
                <Typography variant="h6">{account.institution} — {account.account_name}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                  {account.account_subtype.replace(/_/g, ' ')}
                </Typography>
              </Box>
              <Stack direction="row" spacing={2} alignItems="baseline">
                <Typography variant="h6" fontWeight={700} color="#5B8DEF">{formatCurrency(total)}</Typography>
                <Typography variant="caption" color="text.secondary">{hs.length} positions</Typography>
              </Stack>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Ticker</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Shares</TableCell>
                    <TableCell align="right">Value</TableCell>
                    <TableCell align="right">% of acct</TableCell>
                    <TableCell align="right">Snapshot</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {hs.map(h => {
                    const pct = total > 0 ? (h.current_value / total) * 100 : 0;
                    return (
                      <TableRow key={h.id}>
                        <TableCell>
                          <Typography fontWeight={600}>{h.ticker || '--'}</Typography>
                          {h.asset_class && (
                            <Typography variant="caption" color="text.secondary">{h.asset_class}</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">{h.description}</Typography>
                        </TableCell>
                        <TableCell align="right">{h.quantity ? formatNumber(h.quantity, 2) : '--'}</TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={600}>{formatCurrency(h.current_value)}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption" sx={{ color: pct >= 30 ? '#FF9800' : 'text.secondary', fontWeight: pct >= 30 ? 600 : 400 }}>
                            {pct.toFixed(1)}%
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption" color="text.secondary">{formatDateShort(h.snapshot_date)}</Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      ))}

      {/* Cash view: depository accounts + SPAXX */}
      {view === 'cash' && (
        <Card sx={{ '&:hover': { transform: 'none' } }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Cash & Emergency Fund</Typography>
            <Stack spacing={1}>
              {cashAccounts.map(a => (
                <Box key={a.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{a.account_name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {a.institution} · <span style={{ textTransform: 'capitalize' }}>{a.account_subtype}</span>
                    </Typography>
                  </Box>
                  <Typography variant="body1" fontWeight={700} color="#4CAF50">{formatCurrency(a.current_balance)}</Typography>
                </Box>
              ))}
              {latestHoldings.filter(h => h.asset_class === 'Cash').map(h => {
                const acct = accountInfo.get(h.account_id);
                return (
                  <Box key={h.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderRadius: 2, bgcolor: 'rgba(76,175,80,0.04)', border: '1px solid rgba(76,175,80,0.15)' }}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {h.ticker} — {h.description || 'Money Market'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {acct?.institution} · {acct?.account_name}
                      </Typography>
                    </Box>
                    <Typography variant="body1" fontWeight={700} color="#4CAF50">{formatCurrency(h.current_value)}</Typography>
                  </Box>
                );
              })}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Recent buys / sells / dividends — same source for all views */}
      <RecentTradesCard activity={investmentActivity} />
    </Stack>
  );
};

export default InvestmentsPanel;
