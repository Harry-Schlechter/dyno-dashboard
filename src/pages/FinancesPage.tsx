import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Stack, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Select, MenuItem, InputAdornment, Tabs, Tab,
} from '@mui/material';
import { Search, TrendingUp, TrendingDown, AccountBalance } from '@mui/icons-material';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts';
import { useFinances } from '../hooks/useFinances';
import { formatCurrency, formatDateShort, formatNumber, formatPercent } from '../lib/formatters';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorMessage from '../components/common/ErrorMessage';

const CATEGORIES = ['Food & Dining', 'Groceries', 'Shopping', 'Transportation', 'Entertainment', 'Bills & Utilities', 'Health & Medical', 'Travel', 'Subscriptions', 'Personal', 'Gifts', 'Education', 'Income', 'Transfer', 'Credit Card Payment', 'Investment', 'Other'];
const CHART_COLORS = ['#5B8DEF', '#764ba2', '#4CAF50', '#FF9800', '#F44336', '#90CAF9', '#FFB74D', '#81C784', '#E57373', '#64B5F6', '#CE93D8', '#A5D6A7'];

const FinancesPage: React.FC = () => {
  const { accounts, transactions, holdings, netWorth, loading, error, updateTransactionCategory, refetch } = useFinances();
  const [tab, setTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [accountFilter, setAccountFilter] = useState<string>('all');

  const currentNetWorth = netWorth.length > 0 ? netWorth[0] : null;

  // Build account lookup map for displaying card names on transactions
  const accountMap = useMemo(() => {
    const map: Record<string, { name: string; institution: string; last_four: string }> = {};
    accounts.forEach(a => {
      map[a.id] = { name: a.account_name, institution: a.institution, last_four: a.last_four };
    });
    return map;
  }, [accounts]);

  // Short card label for transaction rows
  const getCardLabel = (accountId: string): string => {
    const acct = accountMap[accountId];
    if (!acct) return '';
    if (acct.last_four) return `${acct.institution} •${acct.last_four}`;
    // Shorten long account names
    const name = acct.name;
    if (name.length > 25) return name.slice(0, 22) + '…';
    return name;
  };

  const netWorthChart = useMemo(() => {
    return netWorth.slice().reverse().map(n => ({
      date: formatDateShort(n.date),
      value: n.net_worth,
    }));
  }, [netWorth]);

  const accountsByInstitution = useMemo(() => {
    const grouped: Record<string, typeof accounts> = {};
    accounts.filter(a => a.is_active).forEach(a => {
      if (!grouped[a.institution]) grouped[a.institution] = [];
      grouped[a.institution].push(a);
    });
    return grouped;
  }, [accounts]);

  // Only show latest snapshot holdings, grouped by account
  const latestSnapshotDate = useMemo(() => {
    if (holdings.length === 0) return null;
    return holdings.reduce((max, h) => h.snapshot_date > max ? h.snapshot_date : max, holdings[0].snapshot_date);
  }, [holdings]);

  const latestHoldings = useMemo(() => {
    if (!latestSnapshotDate) return [];
    return holdings.filter(h => h.snapshot_date === latestSnapshotDate);
  }, [holdings, latestSnapshotDate]);

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

  // Card accounts for filtering transactions
  const cardAccounts = useMemo(() => {
    return accounts.filter(a => a.is_active && (
      a.account_type === 'credit' || a.account_type === 'checking' || a.account_type === 'savings' ||
      a.account_subtype?.toLowerCase().includes('credit') ||
      a.account_subtype?.toLowerCase().includes('checking')
    ));
  }, [accounts]);

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
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
  }, [transactions, searchTerm, accountFilter]);

  const spendingByCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    transactions.filter(t => t.amount > 0 && !['Transfer', 'Credit Card Payment'].includes(t.custom_category || '')).forEach(t => {
      const cat = t.custom_category || t.empower_category || 'Uncategorized';
      cats[cat] = (cats[cat] || 0) + t.amount;
    });
    return Object.entries(cats)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  if (loading) return <LoadingSkeleton variant="card" count={4} />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <Box>
      <Box sx={{ mb: { xs: 2, sm: 2.5, md: 3 } }}>
        <Typography variant="h4" fontWeight={700}>Finances</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Net worth, investments, and spending</Typography>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Overview" />
        <Tab label="Investments" />
        <Tab label="Transactions" />
        <Tab label="Spending" />
      </Tabs>

      {/* ═══════════════ Overview Tab ═══════════════ */}
      {tab === 0 && (
        <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="overline" color="text.secondary">Net Worth</Typography>
                <Typography variant="h3" fontWeight={700} sx={{ color: '#5B8DEF', my: 1 }}>
                  {currentNetWorth ? formatCurrency(currentNetWorth.net_worth) : '--'}
                </Typography>
                {currentNetWorth && (
                  <Stack direction="row" justifyContent="center" spacing={3}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Assets</Typography>
                      <Typography variant="body2" color="success.main">{formatCurrency(currentNetWorth.total_assets)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Liabilities</Typography>
                      <Typography variant="body2" color="error.main">{formatCurrency(currentNetWorth.total_liabilities)}</Typography>
                    </Box>
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 8 }}>
            <Card sx={{ '&:hover': { transform: 'none' } }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Net Worth Trend</Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={netWorthChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" stroke="#7d8590" fontSize={12} />
                    <YAxis stroke="#7d8590" fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ backgroundColor: '#121821', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} formatter={(v: number) => formatCurrency(v)} />
                    <Line type="monotone" dataKey="value" stroke="#5B8DEF" strokeWidth={2} dot={{ r: 4, fill: '#5B8DEF' }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Accounts by Institution */}
          {Object.entries(accountsByInstitution).map(([institution, accts]) => (
            <Grid size={{ xs: 12, md: 6 }} key={institution}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>{institution}</Typography>
                  <Stack spacing={1.5}>
                    {accts.map(a => (
                      <Box key={a.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)' }}>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{a.account_name}</Typography>
                          <Typography variant="caption" color="text.secondary">{a.account_subtype} {a.last_four ? `•••${a.last_four}` : ''}</Typography>
                        </Box>
                        <Typography variant="body1" fontWeight={700} sx={{ color: a.current_balance >= 0 ? '#4CAF50' : '#F44336' }}>
                          {formatCurrency(Math.abs(a.current_balance))}
                          {a.current_balance < 0 && <Typography component="span" variant="caption" color="error.main"> owed</Typography>}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ═══════════════ Investments Tab ═══════════════ */}
      {tab === 1 && (
        <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
          {/* Total portfolio value */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="overline" color="text.secondary">Total Portfolio</Typography>
                    <Typography variant="h4" fontWeight={700} color="#5B8DEF">{formatCurrency(totalPortfolio)}</Typography>
                  </Box>
                  {latestSnapshotDate && (
                    <Chip label={`As of ${formatDateShort(latestSnapshotDate)}`} size="small" variant="outlined" />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Holdings grouped by account */}
          {Object.entries(holdingsByAccount).map(([accountLabel, acctHoldings]) => {
            const acctTotal = acctHoldings.reduce((s, h) => s + (h.current_value || 0), 0);
            return (
              <Grid size={{ xs: 12 }} key={accountLabel}>
                <Card sx={{ '&:hover': { transform: 'none' } }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <AccountBalance sx={{ color: '#5B8DEF', fontSize: 20 }} />
                        <Typography variant="h6">{accountLabel}</Typography>
                      </Box>
                      <Typography variant="h6" fontWeight={700} color="#5B8DEF">{formatCurrency(acctTotal)}</Typography>
                    </Box>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Ticker</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell align="right">Shares</TableCell>
                            <TableCell align="right">Price</TableCell>
                            <TableCell align="right">Value</TableCell>
                            <TableCell align="right">Allocation</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {acctHoldings.sort((a, b) => (b.current_value || 0) - (a.current_value || 0)).map(h => (
                            <TableRow key={h.id}>
                              <TableCell><Typography fontWeight={600}>{h.ticker || '--'}</Typography></TableCell>
                              <TableCell><Typography variant="body2" color="text.secondary">{h.description}</Typography></TableCell>
                              <TableCell align="right">{h.quantity ? formatNumber(h.quantity, 2) : '--'}</TableCell>
                              <TableCell align="right">{h.current_price ? formatCurrency(h.current_price) : '--'}</TableCell>
                              <TableCell align="right"><Typography fontWeight={600}>{formatCurrency(h.current_value)}</Typography></TableCell>
                              <TableCell align="right">{totalPortfolio > 0 ? formatPercent((h.current_value / totalPortfolio) * 100) : '--'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* ═══════════════ Transactions Tab ═══════════════ */}
      {tab === 2 && (
        <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
          <Grid size={{ xs: 12 }}>
            <Card sx={{ '&:hover': { transform: 'none' } }}>
              <CardContent>
                {/* Search + Filter row */}
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
                    <MenuItem value="all">All Accounts</MenuItem>
                    {accounts.filter(a => a.is_active).map(a => (
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
                        <TableRow key={t.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}>
                          <TableCell><Typography variant="body2">{formatDateShort(t.date)}</Typography></TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>{t.merchant_name || t.description}</Typography>
                            {t.merchant_name && t.description !== t.merchant_name && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{t.description}</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">{getCardLabel(t.account_id)}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={600} sx={{ color: t.amount < 0 ? '#4CAF50' : '#e6edf3' }}>
                              {t.amount < 0 ? '+' : '-'}{formatCurrency(Math.abs(t.amount))}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {t.custom_category ? (
                              <Chip label={t.custom_category} size="small" variant="outlined" onClick={() => {/* TODO: allow re-categorize */}} />
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

      {/* ═══════════════ Spending Tab ═══════════════ */}
      {tab === 3 && (
        <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ '&:hover': { transform: 'none' } }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Spending by Category</Typography>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie data={spendingByCategory.slice(0, 10)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={130} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {spendingByCategory.slice(0, 10).map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#121821', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ '&:hover': { transform: 'none' } }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Top Categories</Typography>
                <Stack spacing={1.5}>
                  {spendingByCategory.slice(0, 10).map((cat, i) => (
                    <Box key={cat.name} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <Typography variant="body2">{cat.name}</Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={600}>{formatCurrency(cat.value)}</Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default FinancesPage;
