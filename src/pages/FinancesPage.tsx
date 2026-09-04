import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Stack, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Select, MenuItem, InputAdornment, Tabs, Tab, LinearProgress,
  Tooltip as MuiTooltip,
} from '@mui/material';
import { Search, TrendingUp, TrendingDown, AccountBalance, CreditCard, Savings, ShowChart, CallSplit } from '@mui/icons-material';
import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, BarChart, Bar, ReferenceLine,
} from 'recharts';
import { useFinances } from '../hooks/useFinances';
import AskSpecialistButton from '../components/chat/AskSpecialistButton';
import { formatCurrency, formatDateShort, formatNumber, formatPercent, formatMonth } from '../lib/formatters';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorMessage from '../components/common/ErrorMessage';
import OnPaceCard from '../components/finance/OnPaceCard';
import DateRangeFilter, { DateRange, computeRange } from '../components/finance/DateRangeFilter';
import AgentVoiceCard from '../components/common/AgentVoiceCard';
import InsightsFeed from '../components/home/InsightsFeed';
import CollapsibleSection from '../components/common/CollapsibleSection';
import CategoryPieCard from '../components/finance/CategoryPieCard';
import SubscriptionsCard from '../components/finance/SubscriptionsCard';
import CategoryTrendsCard from '../components/finance/CategoryTrendsCard';
import InvestmentsPanel from '../components/finance/InvestmentsPanel';
import PlanTab from '../components/finance/PlanTab';
import { computeNetWorthBreakdown, computeNetWorthTotal } from '../lib/finance';

const CATEGORIES = ['Food & Dining', 'Groceries', 'Shopping', 'Transportation', 'Entertainment', 'Bills & Utilities', 'Health & Medical', 'Travel', 'Subscriptions', 'Personal', 'Gifts', 'Education', 'Income', 'Transfer', 'Credit Card Payment', 'Investment', 'Other'];
const CHART_COLORS = ['#5B8DEF', '#764ba2', '#4CAF50', '#FF9800', '#F44336', '#90CAF9', '#FFB74D', '#81C784', '#E57373', '#64B5F6', '#CE93D8', '#A5D6A7'];

const ACCOUNT_TYPE_ORDER = ['credit', 'checking', 'savings', 'brokerage', 'retirement', 'other'];
const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  credit: 'Credit Cards',
  checking: 'Checking',
  savings: 'Savings',
  brokerage: 'Brokerage',
  retirement: 'Retirement',
  other: 'Other',
};
const ACCOUNT_TYPE_ICONS: Record<string, React.ReactNode> = {
  credit: <CreditCard sx={{ fontSize: 20, color: '#F44336' }} />,
  checking: <AccountBalance sx={{ fontSize: 20, color: '#5B8DEF' }} />,
  savings: <Savings sx={{ fontSize: 20, color: '#4CAF50' }} />,
  brokerage: <ShowChart sx={{ fontSize: 20, color: '#FF9800' }} />,
  retirement: <ShowChart sx={{ fontSize: 20, color: '#764ba2' }} />,
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ bgcolor: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, p: 1.5, minWidth: 180 }}>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>{label}</Typography>
      {payload.map((entry: any) => (
        <Box key={entry.dataKey} sx={{ display: 'flex', justifyContent: 'space-between', gap: 3, py: 0.25 }}>
          <Typography variant="body2" sx={{ color: entry.color }}>{entry.name}</Typography>
          <Typography variant="body2" fontWeight={600}>{formatCurrency(entry.value)}</Typography>
        </Box>
      ))}
    </Box>
  );
};

const FinancesPage: React.FC = () => {
  const { accounts, transactions, holdings, netWorth, monthlySpending, investmentActivity, loading, error, updateTransactionCategory, refetch } = useFinances();
  const [tab, setTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>(() => computeRange('this_month'));

  const rangeLabel = useMemo(() => {
    const fmt = (s: string) => formatDateShort(s);
    return `${fmt(dateRange.start)} – ${fmt(dateRange.end)}`;
  }, [dateRange.start, dateRange.end]);

  const currentNetWorth = netWorth.length > 0 ? netWorth[0] : null;
  // Live net worth from current account balances (SimpleFIN + manual, both in
  // financial_accounts) — the source of truth. Avoids showing a stale snapshot.
  const liveNetWorth = useMemo(() => computeNetWorthTotal(accounts as any), [accounts]);
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  // Change = live now vs the most recent snapshot from a PRIOR day (so today's
  // just-written snapshot doesn't make the delta read ~0).
  const priorSnapshot = useMemo(() => {
    const p = netWorth.find((n) => n.date < todayStr);
    return p ? p.net_worth : (netWorth.length > 1 ? netWorth[1].net_worth : null);
  }, [netWorth, todayStr]);
  const netWorthChange = priorSnapshot !== null ? liveNetWorth - priorSnapshot : null;
  const netWorthChangePct = priorSnapshot ? (netWorthChange! / Math.abs(priorSnapshot)) * 100 : null;

  const accountMap = useMemo(() => {
    const map: Record<string, { name: string; institution: string; last_four: string; account_type: string }> = {};
    accounts.forEach(a => {
      map[a.id] = { name: a.account_name, institution: a.institution, last_four: a.last_four, account_type: a.account_type };
    });
    return map;
  }, [accounts]);

  const getCardLabel = (accountId: string): string => {
    const acct = accountMap[accountId];
    if (!acct) return '';
    if (acct.last_four) return `${acct.institution} •${acct.last_four}`;
    const name = acct.name;
    if (name.length > 25) return name.slice(0, 22) + '…';
    return name;
  };

  // Net worth chart — aggregate to months
  const netWorthChart = useMemo(() => {
    const byMonth: Record<string, typeof netWorth[0]> = {};
    netWorth.forEach(n => {
      const month = n.date.slice(0, 7);
      if (!byMonth[month] || n.date > byMonth[month].date) {
        byMonth[month] = n;
      }
    });
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, n]) => ({
        month: formatMonth(n.date),
        netWorth: n.net_worth,
        assets: n.total_assets,
        liabilities: Math.abs(n.total_liabilities),
      }));
  }, [netWorth]);

  // Group accounts by type
  const accountsByType = useMemo(() => {
    const grouped: Record<string, typeof accounts> = {};
    accounts.filter(a => a.is_active).forEach(a => {
      const type = ACCOUNT_TYPE_ORDER.includes(a.account_type) ? a.account_type : 'other';
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(a);
    });
    // Sort by defined order
    const sorted: [string, typeof accounts][] = [];
    ACCOUNT_TYPE_ORDER.forEach(type => {
      if (grouped[type]) sorted.push([type, grouped[type]]);
    });
    return sorted;
  }, [accounts]);

  // Compute totals per type
  const typeTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    accountsByType.forEach(([type, accts]) => {
      totals[type] = accts.reduce((s, a) => s + a.current_balance, 0);
    });
    return totals;
  }, [accountsByType]);


  // Holdings
  const latestSnapshotDate = useMemo(() => {
    if (holdings.length === 0) return null;
    return holdings.reduce((max, h) => h.snapshot_date > max ? h.snapshot_date : max, holdings[0].snapshot_date);
  }, [holdings]);

  const latestHoldings = useMemo(() => {
    if (!latestSnapshotDate) return [];
    return holdings.filter(h => h.snapshot_date === latestSnapshotDate);
  }, [holdings, latestSnapshotDate]);

  // 4-bucket net worth breakdown for the hero card. The helper picks the
  // latest snapshot per account internally.
  const netWorthBreakdown = useMemo(
    () => computeNetWorthBreakdown(accounts, holdings),
    [accounts, holdings],
  );

  const holdingsByAccount = useMemo(() => {
    const grouped: Record<string, typeof latestHoldings> = {};
    latestHoldings.forEach(h => {
      const acct = accountMap[h.account_id];
      const label = acct ? `${acct.institution} — ${acct.name}` : 'Unknown Account';
      if (!grouped[label]) grouped[label] = [];
      grouped[label].push(h);
    });
    return grouped;
  }, [latestHoldings, accountMap]);

  const totalPortfolio = latestHoldings.reduce((sum, h) => sum + (h.current_value || 0), 0);
  const totalCostBasis = latestHoldings.reduce((sum, h) => sum + (h.cost_basis || 0), 0);
  const totalGainLoss = latestHoldings.reduce((sum, h) => sum + (h.gain_loss || 0), 0);
  const totalGainLossPct = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

  // Asset class breakdown
  const assetClassBreakdown = useMemo(() => {
    const classes: Record<string, number> = {};
    latestHoldings.forEach(h => {
      const cls = h.asset_class || 'Unknown';
      classes[cls] = (classes[cls] || 0) + (h.current_value || 0);
    });
    return Object.entries(classes)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);
  }, [latestHoldings]);

  // Only show credit card transactions
  const creditAccountIds = useMemo(() => {
    return new Set(accounts.filter(a => a.account_type === 'credit').map(a => a.id));
  }, [accounts]);

  const creditTransactions = useMemo(() => {
    return transactions.filter(t => creditAccountIds.has(t.account_id));
  }, [transactions, creditAccountIds]);

  const filteredTransactions = useMemo(() => {
    let filtered = creditTransactions;
    if (accountFilter !== 'all') {
      filtered = filtered.filter(t => t.account_id === accountFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        (t.description || '').toLowerCase().includes(term) ||
        (t.merchant_name || '').toLowerCase().includes(term) ||
        (t.custom_category || t.empower_category || '').toLowerCase().includes(term)
      );
    }
    return filtered;
  }, [creditTransactions, searchTerm, accountFilter]);

  // Compact page context for the "Ask Financial Advisor" chat (must be declared
  // before any early return — React hooks rules).
  const financeContext = useMemo(() => {
    const nw = accounts.length ? formatCurrency(liveNetWorth) : 'n/a';
    const nwChg = netWorthChange !== null ? `${netWorthChange >= 0 ? '+' : ''}${formatCurrency(netWorthChange)}` : '';
    const topCats = (monthlySpending || []).slice(0, 8)
      .map((c: any) => `${c.category || c.name}: ${formatCurrency(c.amount || c.total || 0)}`).join(', ');
    const recentTx = (transactions || []).slice(0, 12)
      .map((t: any) => `${t.date} ${formatCurrency(t.amount)} ${t.merchant_name || t.description || ''}`.trim()).join('; ');
    return [
      `Finances page (${rangeLabel}).`,
      `Net worth: ${nw}${nwChg ? ` (change ${nwChg})` : ''}.`,
      topCats ? `Spending by category: ${topCats}.` : '',
      recentTx ? `Recent transactions: ${recentTx}.` : '',
    ].filter(Boolean).join('\n');
  }, [currentNetWorth, netWorthChange, monthlySpending, transactions, rangeLabel]);

  if (loading) return <LoadingSkeleton variant="card" count={4} />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <Box>
      <Box sx={{ mb: { xs: 2, sm: 2.5, md: 3 }, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Finances</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Net worth, investments, and spending</Typography>
        </Box>
        <AskSpecialistButton context={financeContext} />
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Overview" />
        <Tab label="Investments" />
        <Tab label="Transactions" />
        <Tab label="Plan" />
      </Tabs>

      {/* ═══════════════ OVERVIEW ═══════════════ */}
      {tab === 0 && (
        <Grid container spacing={2.5}>
          {/* Net Worth Hero (top of page) */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>Net Worth</Typography>
                <Typography variant="h3" fontWeight={700} sx={{ color: '#5B8DEF', mt: 1, mb: 0.5 }}>
                  {accounts.length ? formatCurrency(liveNetWorth) : "--"}
                </Typography>
                {netWorthChange !== null && (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    {netWorthChange >= 0 ? <TrendingUp sx={{ color: '#4CAF50', fontSize: 18 }} /> : <TrendingDown sx={{ color: '#F44336', fontSize: 18 }} />}
                    <Typography variant="body2" fontWeight={600} color={netWorthChange >= 0 ? 'success.main' : 'error.main'}>
                      {netWorthChange >= 0 ? '+' : ''}{formatCurrency(netWorthChange)}
                      {netWorthChangePct !== null && ` (${netWorthChangePct >= 0 ? '+' : ''}${netWorthChangePct.toFixed(1)}%)`}
                    </Typography>
                  </Box>
                )}
                <Stack direction="row" justifyContent="center" spacing={3} sx={{ mt: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Assets</Typography>
                    <Typography variant="body1" fontWeight={600} color="success.main">{currentNetWorth ? formatCurrency(currentNetWorth.total_assets) : '--'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Liabilities</Typography>
                    <Typography variant="body1" fontWeight={600} color="error.main">{currentNetWorth ? formatCurrency(Math.abs(currentNetWorth.total_liabilities)) : '--'}</Typography>
                  </Box>
                </Stack>

                <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <Stack spacing={0.5}>
                    {[
                      { label: '401(k)',     value: netWorthBreakdown.fourOhOneK, color: '#764ba2' },
                      { label: 'Roth',       value: netWorthBreakdown.roth,       color: '#90CAF9' },
                      { label: 'Brokerage',  value: netWorthBreakdown.brokerage,  color: '#FF9800' },
                      { label: 'Cash + MMF', value: netWorthBreakdown.cash,       color: '#4CAF50' },
                    ].map(row => (
                      <Box key={row.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: row.color }} />
                          <Typography variant="caption" color="text.secondary">{row.label}</Typography>
                        </Box>
                        <Typography variant="body2" fontWeight={600}>{formatCurrency(row.value)}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Net Worth Over Time chart */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Card sx={{ '&:hover': { transform: 'none' } }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Net Worth Over Time</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={netWorthChart}>
                    <defs>
                      <linearGradient id="assetGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#4CAF50" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="liabGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F44336" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#F44336" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="month" stroke="rgba(255,255,255,0.12)" tickLine={false} tick={{ fill: "#8b96a5", fontSize: 11 }} />
                    <YAxis stroke="rgba(255,255,255,0.12)" tickLine={false} tick={{ fill: "#8b96a5", fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, color: '#8b96a5' }} />
                    <Area type="monotone" dataKey="assets" name="Assets" stroke="#4CAF50" fill="url(#assetGrad)" strokeWidth={1.5} />
                    <Area type="monotone" dataKey="liabilities" name="Liabilities" stroke="#F44336" fill="url(#liabGrad)" strokeWidth={1.5} />
                    <Line type="monotone" dataKey="netWorth" name="Net Worth" stroke="#5B8DEF" strokeWidth={2.5} dot={{ r: 3, fill: '#5B8DEF' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Financial advisor voice + insights (collapsible) */}
          <Grid size={{ xs: 12 }}>
            <CollapsibleSection title="Your advisor & financial insights">
              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <AgentVoiceCard agentId="financial-advisor" />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <InsightsFeed
                    agentId="financial-advisor"
                    limit={5}
                    title="Financial insights"
                    emptyMessage="Financial advisor is watching spending and net worth — nothing flagged yet."
                  />
                </Grid>
              </Grid>
            </CollapsibleSection>
          </Grid>

          {/* On Pace — current month savings extrapolation */}
          <Grid size={{ xs: 12 }}>
            <OnPaceCard />
          </Grid>

          {/* Date range filter */}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <DateRangeFilter value={dateRange} onChange={setDateRange} />
            </Box>
          </Grid>

          {/* Category pie with drill-down */}
          <Grid size={{ xs: 12, md: 7 }}>
            <CategoryPieCard
              transactions={transactions}
              startDate={dateRange.start}
              endDate={dateRange.end}
              rangeLabel={rangeLabel}
            />
          </Grid>

          {/* Subscriptions panel */}
          <Grid size={{ xs: 12, md: 5 }}>
            <SubscriptionsCard transactions={transactions} />
          </Grid>

          {/* Category trends */}
          <Grid size={{ xs: 12 }}>
            <CategoryTrendsCard
              transactions={transactions}
              startDate={dateRange.start}
              endDate={dateRange.end}
              rangeLabel={rangeLabel}
            />
          </Grid>

          {/* Accounts grouped by type */}
          {accountsByType.map(([type, accts]) => {
            const typeTotal = typeTotals[type] || 0;
            const isLiability = type === 'credit';
            return (
              <Grid size={{ xs: 12, md: 6 }} key={type}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {ACCOUNT_TYPE_ICONS[type] || <AccountBalance sx={{ fontSize: 20, color: '#7d8590' }} />}
                        <Typography variant="h6">{ACCOUNT_TYPE_LABELS[type] || type}</Typography>
                      </Box>
                      <Typography variant="h6" fontWeight={700} sx={{ color: isLiability ? '#F44336' : '#4CAF50' }}>
                        {isLiability && typeTotal < 0 ? '-' : ''}{formatCurrency(Math.abs(typeTotal))}
                      </Typography>
                    </Box>
                    <Stack spacing={1}>
                      {accts.map(a => (
                        <Box key={a.id} sx={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.04)',
                        }}>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="body2" fontWeight={600} noWrap>{a.account_name}</Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="caption" color="text.secondary">{a.institution}</Typography>
                              {a.last_four && <Typography variant="caption" color="text.secondary">•••{a.last_four}</Typography>}
                              {a.account_subtype && <Chip label={a.account_subtype} size="small" sx={{ height: 18, fontSize: '0.65rem', opacity: 0.6 }} />}
                            </Stack>
                          </Box>
                          <Box sx={{ textAlign: 'right', ml: 2 }}>
                            <Typography variant="body1" fontWeight={700} sx={{ color: a.current_balance >= 0 ? '#4CAF50' : '#F44336' }}>
                              {a.current_balance < 0 ? '-' : ''}{formatCurrency(Math.abs(a.current_balance))}
                            </Typography>
                            {a.available_balance !== undefined && a.available_balance !== null && a.available_balance !== a.current_balance && (
                              <Typography variant="caption" color="text.secondary">
                                {formatCurrency(a.available_balance)} avail
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* ═══════════════ INVESTMENTS ═══════════════ */}
      {tab === 1 && (
        <InvestmentsPanel
          accounts={accounts}
          holdings={holdings}
          investmentActivity={investmentActivity}
        />
      )}


      {/* ═══════════════ TRANSACTIONS ═══════════════ */}
      {tab === 2 && (
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12 }}>
            <Card sx={{ '&:hover': { transform: 'none' } }}>
              <CardContent>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.secondary' }} /></InputAdornment> }}
                    size="small"
                  />
                  <Select
                    value={accountFilter}
                    onChange={(e) => setAccountFilter(e.target.value)}
                    size="small"
                    sx={{ minWidth: 200, '& .MuiSelect-select': { py: 1 } }}
                  >
                    <MenuItem value="all">All Cards</MenuItem>
                    {accounts.filter(a => a.is_active && a.account_type === 'credit').map(a => (
                      <MenuItem key={a.id} value={a.id}>
                        {a.institution} {a.last_four ? `•${a.last_four}` : `— ${a.account_name.slice(0, 20)}`}
                      </MenuItem>
                    ))}
                  </Select>
                </Stack>

                <TableContainer sx={{ maxHeight: 600 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Card</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell>Category</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredTransactions.slice(0, 200).map(t => (
                        <TableRow key={t.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' }, opacity: t.pending ? 0.6 : 1 }}>
                          <TableCell>
                            <Typography variant="body2">{formatDateShort(t.date)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box>
                                <Typography variant="body2" fontWeight={500}>{t.merchant_name || t.description}</Typography>
                                {t.merchant_name && t.description !== t.merchant_name && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{t.description}</Typography>
                                )}
                              </Box>
                              {t.pending && <Chip label="Pending" size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'rgba(255,152,0,0.15)', color: '#FF9800' }} />}
                            </Box>
                            {t.tags && t.tags.length > 0 && (
                              <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                                {t.tags.map(tag => (
                                  <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.6rem', opacity: 0.6 }} />
                                ))}
                              </Stack>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">{getCardLabel(t.account_id)}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                              {t.original_amount !== null && (
                                <MuiTooltip
                                  title={
                                    <>
                                      <div>Adjusted: {formatCurrency(Math.abs(t.original_amount))} → {formatCurrency(Math.abs(t.amount))}</div>
                                      {t.split_note && <div style={{ marginTop: 2, opacity: 0.85 }}>{t.split_note}</div>}
                                    </>
                                  }
                                >
                                  <CallSplit sx={{ fontSize: 14, color: '#90CAF9' }} />
                                </MuiTooltip>
                              )}
                              <Typography variant="body2" fontWeight={600} sx={{ color: t.amount < 0 ? '#4CAF50' : '#e6edf3' }}>
                                {t.amount < 0 ? '+' : '-'}{formatCurrency(Math.abs(t.amount))}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {t.custom_category ? (
                              <Chip label={t.custom_category} size="small" variant="outlined" />
                            ) : t.empower_category ? (
                              <Chip label={t.empower_category} size="small" variant="outlined" sx={{ opacity: 0.7 }} />
                            ) : (
                              <Select
                                size="small"
                                value=""
                                displayEmpty
                                onChange={(e) => updateTransactionCategory(t.id, e.target.value as string)}
                                sx={{ minWidth: 140, '& .MuiSelect-select': { py: 0.5, fontSize: '0.75rem' } }}
                              >
                                <MenuItem value="" disabled><em>Categorize…</em></MenuItem>
                                {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                              </Select>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ═══════════════ PLAN ═══════════════ */}
      {tab === 3 && (
        <PlanTab
          transactions={transactions}
          accounts={accounts}
          monthlySpending={monthlySpending}
        />
      )}

    </Box>
  );
};

export default FinancesPage;
