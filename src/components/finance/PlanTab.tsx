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

const StatusChip: React.FC<{ label: string; actual: number; target: number }> = ({ label, actual, target }) => {
  const pct = target > 0 ? actual / target : 0;
  const color = pct >= 0.95 ? '#4CAF50' : pct >= 0.75 ? '#FF9800' : '#F44336';
  const text = pct >= 0.95 ? 'On Track' : pct >= 0.75 ? 'Slightly Behind' : 'Behind';
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Chip label={text} size="small" sx={{ bgcolor: `${color}22`, color, border: `1px solid ${color}55`, fontWeight: 600 }} />
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

  const ytdRoth = rothAcct ? Math.min(rothAcct.current_balance, ANNUAL_ROTH_LIMIT) : 2333;
  const ytdWros = wrosAcct ? Math.min(wrosAcct.current_balance, WROS_TARGET * 8) : 20000;

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

  // Avg of the last 3 months of actual contributions.
  const months3Avg = {
    '401k': contribData.slice(-3).reduce((s, m) => s + m['401k'], 0) / Math.min(3, contribData.length || 1),
    hsa: contribData.slice(-3).reduce((s, m) => s + m.hsa, 0) / Math.min(3, contribData.length || 1),
    roth: contribData.slice(-3).reduce((s, m) => s + m.roth, 0) / Math.min(3, contribData.length || 1),
    wros: contribData.slice(-3).reduce((s, m) => s + m.wros, 0) / Math.min(3, contribData.length || 1),
  };

  // Section 3 — Spending intelligence from monthlySpending view
  const spendingByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    monthlySpending.forEach(r => {
      if (!map[r.month]) map[r.month] = 0;
      map[r.month] += r.total;
    });
    return map;
  }, [monthlySpending]);

  const sortedMonths = useMemo(() =>
    Object.keys(spendingByMonth).sort().reverse(),
    [spendingByMonth]
  );

  const currentMonthSpend = spendingByMonth[currentMonthKey] || actualSpendThisMonth;
  const avg3mo = useMemo(() => {
    const past = sortedMonths.filter(m => m < currentMonthKey).slice(0, 3);
    if (!past.length) return trailing3Avg;
    return past.reduce((s, m) => s + spendingByMonth[m], 0) / past.length;
  }, [sortedMonths, currentMonthKey, spendingByMonth, trailing3Avg]);
  const avg6mo = useMemo(() => {
    const past = sortedMonths.filter(m => m < currentMonthKey).slice(0, 6);
    if (!past.length) return trailing3Avg;
    return past.reduce((s, m) => s + spendingByMonth[m], 0) / past.length;
  }, [sortedMonths, currentMonthKey, spendingByMonth, trailing3Avg]);

  const spendVsAvgPct = avg3mo > 0 ? ((currentMonthSpend - avg3mo) / avg3mo) * 100 : null;

  // Category movers
  const currentCats = useMemo(() => {
    const thisMonth = monthlySpending.filter(r => r.month === currentMonthKey);
    const prev3 = monthlySpending.filter(r => r.month < currentMonthKey);
    const avgByCat: Record<string, number> = {};
    const byMonth = new Set(prev3.map(r => r.month));
    const n = Math.min(byMonth.size, 3) || 1;
    prev3.forEach(r => { avgByCat[r.category] = (avgByCat[r.category] || 0) + r.total / n; });
    return thisMonth.map(r => ({
      category: r.category,
      current: r.total,
      avg: avgByCat[r.category] || 0,
      delta: r.total - (avgByCat[r.category] || 0),
      pct: avgByCat[r.category] ? ((r.total - avgByCat[r.category]) / avgByCat[r.category]) * 100 : 0,
    })).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 3);
  }, [monthlySpending, currentMonthKey]);

  // Spending alert banner
  const spendingBanner = useMemo(() => {
    if (spendVsAvgPct === null) return null;
    if (spendVsAvgPct > 15) return { icon: '⚠️', color: '#FF9800', text: `Spending up ${spendVsAvgPct.toFixed(0)}% vs your average — consider slowing down` };
    if (spendVsAvgPct < -15) return { icon: '✅', color: '#4CAF50', text: `${Math.abs(spendVsAvgPct).toFixed(0)}% under your average this month — bank it or spend freely` };
    return { icon: '📊', color: '#5B8DEF', text: 'On pace with your average' };
  }, [spendVsAvgPct]);

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

      {/* ── S2: Contributions Tracker ── */}
      <Grid size={{ xs: 12 }}>
        <Box sx={{ mt: 1, mb: 1 }}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>Contributions Tracker</Typography>
        </Box>
      </Grid>

      {/* Status chips */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Monthly Status</Typography>
            <Stack direction="row" spacing={3} justifyContent="space-around" sx={{ mb: 2 }}>
              <StatusChip label="401(k)" actual={months3Avg['401k']} target={CONTRIB_401K} />
              <StatusChip label="HSA" actual={months3Avg.hsa} target={CONTRIB_HSA} />
              <StatusChip label="Roth IRA" actual={months3Avg.roth} target={ROTH_TARGET} />
              <StatusChip label="WROS" actual={months3Avg.wros} target={WROS_TARGET} />
            </Stack>

            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(91,141,239,0.05)', border: '1px solid rgba(91,141,239,0.1)' }}>
              <Typography variant="caption" color="text.secondary">
                Contribution tracking activating — data populates end of each month
              </Typography>
            </Box>

            <Stack spacing={1.5} sx={{ mt: 2 }}>
              {[
                { label: '401(k)', ytd: CONTRIB_401K * 8, target: CONTRIB_401K * 12, color: '#764ba2' },
                { label: 'HSA', ytd: CONTRIB_HSA * 8, target: CONTRIB_HSA * 12, color: '#9575CD' },
                { label: 'Roth IRA', ytd: ytdRoth, target: ANNUAL_ROTH_LIMIT, color: '#90CAF9' },
                { label: 'WROS', ytd: ytdWros, target: WROS_TARGET * 12, color: '#FF9800' },
              ].map(row => (
                <Box key={row.label}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">{row.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatCurrency(row.ytd)} of {formatCurrency(row.target)} ({((row.ytd / row.target) * 100).toFixed(0)}%)
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min((row.ytd / row.target) * 100, 100)}
                    sx={{
                      height: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)',
                      '& .MuiLinearProgress-bar': { bgcolor: row.color, borderRadius: 4 },
                    }}
                  />
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* Contributions bar chart */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>2026 Contributions by Month</Typography>
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
                <ReferenceLine y={WROS_TARGET + ROTH_TARGET + CONTRIB_HSA + CONTRIB_401K} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" label={{ value: 'Target', fill: '#8b96a5', fontSize: 10, position: 'right' }} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Month table */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Month-by-Month Contributions — 2026</Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
                <Box component="thead">
                  <Box component="tr">
                    {['Month', '401(k)', 'HSA', 'Roth IRA', 'WROS', 'Total', 'vs Target'].map(h => (
                      <Box component="th" key={h} sx={{ p: 1, textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.08)', '&:first-of-type': { textAlign: 'left' } }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{h}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Box component="tbody">
                  {contribData.map(row => {
                    const total = row['401k'] + row.hsa + row.roth + row.wros;
                    const target = CONTRIB_401K + CONTRIB_HSA + ROTH_TARGET + WROS_TARGET;
                    const delta = total - target;
                    return (
                      <Box component="tr" key={row.month} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                        {[row.month, row['401k'], row.hsa, row.roth, row.wros].map((v, i) => (
                          <Box component="td" key={i} sx={{ p: 1, borderBottom: '1px solid rgba(255,255,255,0.04)', textAlign: i === 0 ? 'left' : 'right' }}>
                            <Typography variant="body2">{i === 0 ? v : formatCurrency(v as number)}</Typography>
                          </Box>
                        ))}
                        <Box component="td" sx={{ p: 1, textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <Typography variant="body2" fontWeight={600}>{formatCurrency(total)}</Typography>
                        </Box>
                        <Box component="td" sx={{ p: 1, textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <Typography variant="body2" sx={{ color: delta >= 0 ? '#4CAF50' : '#F44336' }}>
                            {delta >= 0 ? '+' : ''}{formatCurrency(delta)}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* ── S3: Spending Intelligence ── */}
      <Grid size={{ xs: 12 }}>
        <Box sx={{ mt: 1, mb: 1 }}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>Spending Intelligence</Typography>
        </Box>
      </Grid>

      {spendingBanner && (
        <Grid size={{ xs: 12 }}>
          <Box sx={{ p: 2, borderRadius: 2, bgcolor: `${spendingBanner.color}11`, border: `1px solid ${spendingBanner.color}33` }}>
            <Typography variant="body1" fontWeight={600} sx={{ color: spendingBanner.color }}>
              {spendingBanner.icon} {spendingBanner.text}
            </Typography>
          </Box>
        </Grid>
      )}

      <Grid size={{ xs: 12, md: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="overline" color="text.secondary">This Month vs Average</Typography>
            <Stack spacing={2} sx={{ mt: 1.5 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">This month</Typography>
                <Typography variant="h5" fontWeight={700}>{formatCurrency(currentMonthSpend)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">3-month avg</Typography>
                <Typography variant="h6" fontWeight={600} color="text.secondary">{formatCurrency(avg3mo)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">6-month avg</Typography>
                <Typography variant="h6" fontWeight={600} color="text.secondary">{formatCurrency(avg6mo)}</Typography>
              </Box>
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
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Top Category Movers</Typography>
            {currentCats.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No category data for current month yet.</Typography>
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
                    <LinearProgress
                      variant="determinate"
                      value={Math.min((cat.current / (avg3mo || 1)) * 100 * 3, 100)}
                      sx={{
                        height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.04)',
                        '& .MuiLinearProgress-bar': { bgcolor: cat.delta >= 0 ? '#F44336' : '#4CAF50', borderRadius: 3 },
                      }}
                    />
                  </Box>
                ))}
              </Stack>
            )}
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
