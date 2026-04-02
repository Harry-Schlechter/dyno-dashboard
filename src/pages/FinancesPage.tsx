import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Stack, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Select, MenuItem, InputAdornment, Tabs, Tab,
} from '@mui/material';
import { Search, TrendingUp, TrendingDown } from '@mui/icons-material';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import { useFinances } from '../hooks/useFinances';
import { formatCurrency, formatDate, formatDateShort, formatNumber, formatPercent } from '../lib/formatters';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorMessage from '../components/common/ErrorMessage';

const CATEGORIES = ['Food & Dining', 'Shopping', 'Transportation', 'Entertainment', 'Bills & Utilities', 'Health', 'Travel', 'Education', 'Personal', 'Income', 'Transfer', 'Other'];
const CHART_COLORS = ['#5B8DEF', '#764ba2', '#4CAF50', '#FF9800', '#F44336', '#90CAF9', '#FFB74D', '#81C784', '#E57373', '#64B5F6', '#CE93D8', '#A5D6A7'];

const FinancesPage: React.FC = () => {
  const { accounts, transactions, holdings, netWorth, monthlySpending, loading, error, updateTransactionCategory, refetch } = useFinances();
  const [tab, setTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const currentNetWorth = netWorth.length > 0 ? netWorth[0] : null;

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

  const filteredTransactions = useMemo(() => {
    if (!searchTerm) return transactions;
    const term = searchTerm.toLowerCase();
    return transactions.filter(t =>
      (t.description || '').toLowerCase().includes(term) ||
      (t.merchant_name || '').toLowerCase().includes(term) ||
      (t.custom_category || t.empower_category || '').toLowerCase().includes(term)
    );
  }, [transactions, searchTerm]);

  const spendingByCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    transactions.filter(t => t.amount > 0).forEach(t => {
      const cat = t.custom_category || t.empower_category || 'Uncategorized';
      cats[cat] = (cats[cat] || 0) + t.amount;
    });
    return Object.entries(cats)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const totalPortfolio = holdings.reduce((sum, h) => sum + (h.current_value || 0), 0);

  if (loading) return <LoadingSkeleton variant="card" count={4} />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700}>Finances</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Net worth, investments, and spending</Typography>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 } }}>
        <Tab label="Overview" />
        <Tab label="Investments" />
        <Tab label="Transactions" />
        <Tab label="Spending" />
      </Tabs>

      {/* Overview Tab */}
      {tab === 0 && (
        <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="overline" color="text.secondary">Net Worth</Typography>
                <Typography variant="h4" fontWeight={700} sx={{ color: '#5B8DEF', my: 1 }}>
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
                    <Line type="monotone" dataKey="value" stroke="#5B8DEF" strokeWidth={2} dot={false} />
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
                        <Typography variant="body1" fontWeight={700} sx={{ color: a.is_asset ? '#4CAF50' : '#F44336' }}>
                          {formatCurrency(a.current_balance)}
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

      {/* Investments Tab */}
      {tab === 1 && (
        <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
          <Grid size={{ xs: 12 }}>
            <Card sx={{ '&:hover': { transform: 'none' } }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Portfolio</Typography>
                  <Typography variant="h5" fontWeight={700} color="#5B8DEF">{formatCurrency(totalPortfolio)}</Typography>
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
                        <TableCell align="right">Gain/Loss</TableCell>
                        <TableCell align="right">Allocation</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {holdings.map(h => (
                        <TableRow key={h.id}>
                          <TableCell><Typography fontWeight={600}>{h.ticker || '--'}</Typography></TableCell>
                          <TableCell><Typography variant="body2" color="text.secondary">{h.description}</Typography></TableCell>
                          <TableCell align="right">{h.quantity ? formatNumber(h.quantity, 2) : '--'}</TableCell>
                          <TableCell align="right">{h.current_price ? formatCurrency(h.current_price) : '--'}</TableCell>
                          <TableCell align="right">{formatCurrency(h.current_value)}</TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                              {h.gain_loss >= 0 ? <TrendingUp sx={{ fontSize: 16, color: '#4CAF50' }} /> : <TrendingDown sx={{ fontSize: 16, color: '#F44336' }} />}
                              <Typography variant="body2" sx={{ color: h.gain_loss >= 0 ? '#4CAF50' : '#F44336' }}>
                                {formatCurrency(Math.abs(h.gain_loss))} ({formatPercent(Math.abs(h.gain_loss_pct))})
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">{totalPortfolio > 0 ? formatPercent((h.current_value / totalPortfolio) * 100) : '--'}</TableCell>
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

      {/* Transactions Tab */}
      {tab === 2 && (
        <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
          <Grid size={{ xs: 12 }}>
            <Card sx={{ '&:hover': { transform: 'none' } }}>
              <CardContent>
                <Box sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.secondary' }} /></InputAdornment> }}
                    size="small"
                  />
                </Box>
                <TableContainer sx={{ maxHeight: 600 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell>Category</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredTransactions.slice(0, 100).map(t => (
                        <TableRow key={t.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}>
                          <TableCell><Typography variant="body2">{formatDateShort(t.date)}</Typography></TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>{t.merchant_name || t.description}</Typography>
                            {t.merchant_name && t.description !== t.merchant_name && (
                              <Typography variant="caption" color="text.secondary">{t.description}</Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={600} sx={{ color: t.amount < 0 ? '#4CAF50' : '#e6edf3' }}>
                              {formatCurrency(Math.abs(t.amount))}
                            </Typography>
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
                                <MenuItem value="" disabled><em>Categorize...</em></MenuItem>
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

      {/* Spending Tab */}
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
