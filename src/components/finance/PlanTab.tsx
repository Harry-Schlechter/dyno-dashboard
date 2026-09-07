import React, { useMemo } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Stack, Chip, LinearProgress,
} from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import {
  XAxis, YAxis, Tooltip as RechartTooltip, ResponsiveContainer,
  CartesianGrid, BarChart, Bar, Legend, ReferenceLine,
} from 'recharts';
import { FinancialAccount, Transaction } from '../../hooks/useFinances';
import { formatCurrency, formatPercent } from '../../lib/formatters';
import { isRealSpend, trailingMonthlyAvgSpend, spendByCategory, expectedMonthlyIncome } from '../../lib/finance';
import { useContributions } from '../../hooks/useContributions';
import ProjectionTool from './ProjectionTool';

// ─── Constants ──────────────────────────────────────────────────────────────
// Take-home is the real net paycheck (after 401k + HSA pre-tax deductions),
// pulled from the shared income constant so a raise updates it in one place.
const TAKE_HOME = expectedMonthlyIncome(); // $8,685/mo post-raise 2026-09
const ROTH_TARGET = 583;                   // Roth IRA ($7k/yr ÷ 12)
const WROS_TARGET = 3000;                  // Joint brokerage / house fund (raised +$500 w/ the 2026-09 raise)
const CONTRIB_401K = 770;                  // pre-tax, auto-deducted from gross (NOT from take-home)
const EMPLOYER_MATCH_401K = 385;
const CONTRIB_HSA = 358;                   // pre-tax, auto-deducted from gross
const SPEND_FLOOR = TAKE_HOME - ROTH_TARGET - WROS_TARGET; // = 8685 - 583 - 3000 = 5102

const WROS_ACCT = 'c81b3a51-e41f-4dc5-80dd-4a66143df20b';
const ROTH_ACCT = '7b001b47-3cf9-4cdb-93cf-e4623e18da3f';

// Retirement/WROS starting balances — fallbacks only; the component prefers
// LIVE account balances (see liveBalances below) so progress reflects reality.
const RETIREMENT_BALANCES = { fourOhOneK: 22578, roth: 7133, hsa: 2738 };




// Placeholder 12-month contribution data (Jan–Aug 2026)
const MONTHS_2026 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
const PLACEHOLDER_CONTRIBS = MONTHS_2026.map((m, i) => ({
  month: m,
  '401k': i < 8 ? CONTRIB_401K : 0,
  hsa: i < 8 ? CONTRIB_HSA : 0,
  roth: i < 8 ? (i === 1 ? 0 : i === 4 ? 450 : ROTH_TARGET) : 0,
  wros: i < 8 ? WROS_TARGET : 0,
}));

const ANNUAL_ROTH_LIMIT = 7000;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtK = (v: number) => `$${(v / 1000).toFixed(0)}k`;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ bgcolor: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, p: 1.5, minWidth: 160 }}>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>{label}</Typography>
      {payload.map((entry: any) => (
        <Box key={entry.dataKey} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.25 }}>
          <Typography variant="body2" sx={{ color: entry.color }}>{entry.name}</Typography>
          <Typography variant="body2" fontWeight={600}>{formatCurrency(entry.value)}</Typography>
        </Box>
      ))}
    </Box>
  );
};


// ─── Props ────────────────────────────────────────────────────────────────────
interface PlanTabProps {
  transactions: Transaction[];
  accounts: FinancialAccount[];
  monthlySpending: Array<{ month: string; category: string; total: number }>;
}

// ─── Component ───────────────────────────────────────────────────────────────
const PlanTab: React.FC<PlanTabProps> = ({ transactions, accounts, monthlySpending }) => {
  const today = useMemo(() => new Date(), []);
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const { byMonth: contributions } = useContributions();

  // Section 1 — current month spend
  const actualSpendThisMonth = useMemo(() => {
    return transactions
      .filter(t => t.date.startsWith(currentMonthKey) && isRealSpend(t))
      .reduce((s, t) => s + Math.abs(t.amount), 0);
  }, [transactions, currentMonthKey]);

  const trailing3Avg = useMemo(() => trailingMonthlyAvgSpend(transactions, today, 3), [transactions, today]);
  const vsAvgPct = trailing3Avg > 0 ? ((actualSpendThisMonth - trailing3Avg) / trailing3Avg) * 100 : null;

  const spendingMoneyRemaining = SPEND_FLOOR - actualSpendThisMonth;
  const spendColor = actualSpendThisMonth <= SPEND_FLOOR * 1.1
    ? '#4CAF50'
    : actualSpendThisMonth <= SPEND_FLOOR * 1.25
      ? '#FF9800'
      : '#F44336';

  // Section 2 — YTD Roth progress (estimate from account balance delta or use hardcoded)
  const rothAcct = useMemo(() => accounts.find(a => a.id === ROTH_ACCT), [accounts]);
  const wrosAcct = useMemo(() => accounts.find(a => a.id === WROS_ACCT), [accounts]);


  // LIVE retirement balances (fall back to the hardcoded snapshot if an account
  // is missing). Roth = Roth IRA + Crypto Roth; HSA = the Schwab HSA brokerage.
  const liveBalances = useMemo(() => {
    const sum = (pred: (a: FinancialAccount) => boolean) =>
      accounts.filter(a => a.is_active !== false && pred(a)).reduce((s, a) => s + (a.current_balance || 0), 0);
    const k401 = sum(a => a.account_subtype === '401k');
    const roth = sum(a => (a.account_subtype || '').startsWith('roth_ira'));
    const hsa = sum(a => /hsa/i.test(a.account_name) && a.account_type === 'brokerage');
    return {
      fourOhOneK: k401 || RETIREMENT_BALANCES.fourOhOneK,
      roth: roth || RETIREMENT_BALANCES.roth,
      hsa: hsa || RETIREMENT_BALANCES.hsa,
    };
  }, [accounts]);

  // Real contributions from the DB (agent-maintained `contributions` table).
  // Falls back to the planned placeholder if the table is empty, so the tab
  // never looks broken before the agent backfills.
  const contribData = useMemo(() => {
    if (!contributions || contributions.length === 0) return PLACEHOLDER_CONTRIBS;
    return contributions.map(c => ({
      month: new Date(c.month + '-01T00:00:00').toLocaleString('en-US', { month: 'short' }),
      '401k': c['401k'],
      hsa: c.hsa,
      roth: c.roth,
      wros: c.wros,
    }));
  }, [contributions]);

  // Past-year totals per account (sum of up to the last 12 months).
  const yearTotals = useMemo(() => {
    const last12 = contribData.slice(-12);
    return {
      '401k': last12.reduce((s, m) => s + m['401k'], 0),
      hsa: last12.reduce((s, m) => s + m.hsa, 0),
      roth: last12.reduce((s, m) => s + m.roth, 0),
      wros: last12.reduce((s, m) => s + m.wros, 0),
    };
  }, [contribData]);








  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <Grid container spacing={2.5}>

      {/* ── S1: Monthly Money Map ── */}
      <Grid size={{ xs: 12 }}>
        <Box sx={{ mb: 1 }}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>Monthly Money Map</Typography>
        </Box>
      </Grid>

      {/* Waterfall summary */}
      <Grid size={{ xs: 12, md: 5 }}>
        <Card>
          <CardContent>
            <Typography variant="overline" color="text.secondary">Cash Flow This Month</Typography>

            {/* Take-home */}
            <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, bgcolor: 'rgba(91,141,239,0.08)', border: '1px solid rgba(91,141,239,0.2)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Take-home</Typography>
                <Typography variant="body2" fontWeight={700} color="#5B8DEF">{formatCurrency(TAKE_HOME)}</Typography>
              </Box>
            </Box>

            {/* Pre-tax note */}
            <Box sx={{ mx: 1.5, py: 0.75, borderLeft: '2px solid rgba(255,255,255,0.06)', pl: 1.5 }}>
              <Typography variant="caption" color="text.secondary">Pre-tax (invisible): 401k {formatCurrency(CONTRIB_401K)} employee +{formatCurrency(EMPLOYER_MATCH_401K)} employer match · HSA {formatCurrency(CONTRIB_HSA)}</Typography>
            </Box>

            {/* Post-take-home contributions */}
            {[
              { label: 'Roth IRA', value: ROTH_TARGET, color: '#90CAF9' },
              { label: 'Joint WROS', value: WROS_TARGET, color: '#FF9800' },
            ].map(row => (
              <Box key={row.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1.5, py: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: row.color }} />
                  <Typography variant="body2" color="text.secondary">→ {row.label}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">−{formatCurrency(row.value)}</Typography>
              </Box>
            ))}

            <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.06)', my: 1 }} />

            {/* Spending floor */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1.5, mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">Spending floor</Typography>
              <Typography variant="body2" fontWeight={600}>{formatCurrency(SPEND_FLOOR)}</Typography>
            </Box>

            {/* Actual spend */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1.5, mb: 1.5 }}>
              <Typography variant="body2" color="text.secondary">Spent this month</Typography>
              <Typography variant="body2" fontWeight={600} color={spendColor}>−{formatCurrency(actualSpendThisMonth)}</Typography>
            </Box>

            {/* Spending money remaining */}
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: `${spendColor}11`, border: `1px solid ${spendColor}33`, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 1 }}>SPENDING MONEY REMAINING</Typography>
              <Typography variant="h4" fontWeight={800} sx={{ color: spendColor, mt: 0.5 }}>
                {formatCurrency(spendingMoneyRemaining)}
              </Typography>
              {vsAvgPct !== null && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mt: 0.5 }}>
                  {vsAvgPct >= 0
                    ? <TrendingUp sx={{ fontSize: 14, color: '#F44336' }} />
                    : <TrendingDown sx={{ fontSize: 14, color: '#4CAF50' }} />}
                  <Typography variant="caption" sx={{ color: vsAvgPct >= 0 ? '#F44336' : '#4CAF50', fontWeight: 600 }}>
                    {vsAvgPct >= 0 ? '+' : ''}{vsAvgPct.toFixed(0)}% vs 3-mo avg
                  </Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Flow visualization */}
      <Grid size={{ xs: 12, md: 7 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">Monthly Budget Waterfall</Typography>
            <Stack spacing={1.5} sx={{ mt: 2 }}>
              {[
                { label: 'Take-Home', amount: TAKE_HOME, pct: 100, color: '#5B8DEF', sub: 'Semi-monthly × 2' },
                { label: '401(k) Pre-tax', amount: CONTRIB_401K, pct: (CONTRIB_401K / TAKE_HOME) * 100, color: '#764ba2', sub: 'Auto-deducted from gross' },
                { label: 'HSA Pre-tax', amount: CONTRIB_HSA, pct: (CONTRIB_HSA / TAKE_HOME) * 100, color: '#9575CD', sub: 'Auto-deducted from gross' },
                { label: 'Roth IRA', amount: ROTH_TARGET, pct: (ROTH_TARGET / TAKE_HOME) * 100, color: '#90CAF9', sub: 'Post-tax transfer' },
                { label: 'Joint WROS', amount: WROS_TARGET, pct: (WROS_TARGET / TAKE_HOME) * 100, color: '#FF9800', sub: 'Post-tax, house fund' },
                { label: 'Spending', amount: actualSpendThisMonth, pct: (actualSpendThisMonth / TAKE_HOME) * 100, color: spendColor, sub: 'Actual this month' },
              ].map(row => (
                <Box key={row.label}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{row.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{row.sub}</Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={700} sx={{ color: row.color }}>{formatCurrency(row.amount)}</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(row.pct, 100)}
                    sx={{
                      height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.04)',
                      '& .MuiLinearProgress-bar': { bgcolor: row.color, borderRadius: 3 },
                    }}
                  />
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* ── S2: Contributions ── */}
      <Grid size={{ xs: 12 }}>
        <Box sx={{ mt: 1, mb: 1 }}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>Contributions</Typography>
        </Box>
      </Grid>

      {/* Past-year totals per account (static) */}
      <Grid size={{ xs: 12 }}>
        <Grid container spacing={1.5}>
          {([
            { label: '401(k)', total: yearTotals['401k'], color: '#764ba2' },
            { label: 'HSA', total: yearTotals.hsa, color: '#9575CD' },
            { label: 'Roth IRA', total: yearTotals.roth, color: '#90CAF9' },
            { label: 'Joint WROS', total: yearTotals.wros, color: '#FF9800' },
          ]).map(row => (
            <Grid size={{ xs: 6, md: 3 }} key={row.label}>
              <Card sx={{ borderLeft: `3px solid ${row.color}`, '&:hover': { transform: 'none' } }}>
                <CardContent sx={{ '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="caption" color="text.secondary">{row.label} · past 12mo</Typography>
                  <Typography variant="h5" fontWeight={800} sx={{ color: row.color, mt: 0.5 }}>{formatCurrency(row.total)}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Grid>

      {/* Contributions over the past year */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Contributions by month — past year</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={contribData} barSize={8} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.12)" tickLine={false} tick={{ fill: '#8b96a5', fontSize: 11 }} />
                <YAxis stroke="rgba(255,255,255,0.12)" tickLine={false} tick={{ fill: '#8b96a5', fontSize: 11 }} tickFormatter={fmtK} />
                <RechartTooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#8b96a5' }} />
                <Bar dataKey="401k" name="401(k)" fill="#764ba2" radius={[2, 2, 0, 0]} />
                <Bar dataKey="hsa" name="HSA" fill="#9575CD" radius={[2, 2, 0, 0]} />
                <Bar dataKey="roth" name="Roth IRA" fill="#90CAF9" radius={[2, 2, 0, 0]} />
                <Bar dataKey="wros" name="WROS" fill="#FF9800" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* ── Financial-future projection (interactive) ── */}
      <Grid size={{ xs: 12 }}>
        <ProjectionTool accounts={accounts} />
      </Grid>

    </Grid>
  );
};

export default PlanTab;
