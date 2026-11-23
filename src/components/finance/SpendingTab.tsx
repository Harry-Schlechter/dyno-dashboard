import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Stack, Chip, TextField, InputAdornment, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Cell } from 'recharts';
import { supabase, USER_ID } from '../../lib/supabase';
import { Transaction } from '../../hooks/useFinances';
import { formatCurrency, formatDateShort, formatMonth } from '../../lib/formatters';
import { xAxisProps, yAxisProps, GRID_STROKE, ChartTooltip } from '../../lib/chartTheme';
import {
  Bucket, BUCKET_COLOR, BUCKET_LABEL, ONE_OFF_TAG, buildMonthRows, categoryTrends,
  lastMonths, mean, median, toSpendTxs, topMerchants,
} from '../../lib/spending';

const MONTHS_SHOWN = 12;
const PAGE = 1000; // Supabase caps a single request at 1,000 rows, so page it.

const lsGet = (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

const BUCKETS: Bucket[] = ['everyday', 'oneoff', 'travel'];
const fmt0 = (n: number) => formatCurrency(Math.round(n)).replace('.00', '');

interface Props { refreshKey?: number }

const SpendingTab: React.FC<Props> = ({ refreshKey = 0 }) => {
  const today = useMemo(() => new Date(), []);
  const months = useMemo(() => lastMonths(today, MONTHS_SHOWN + 1), [today]);
  const currentMonth = months[months.length - 1];
  const completeMonths = months.slice(0, -1);

  const [raw, setRaw] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [budgetTargets, setBudgetTargets] = useState<Record<string, number>>({});
  const [reimbursementOutstanding, setReimbursementOutstanding] = useState<number | null>(null);

  const [target, setTarget] = useState<string>(() => lsGet('spend.target') || '');
  const [selected, setSelected] = useState<string>(currentMonth);
  const [bucketFilter, setBucketFilter] = useState<Bucket[]>(['everyday', 'oneoff', 'travel']);
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [reviewOnly, setReviewOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const since = `${months[0]}-01`;
      const all: Transaction[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error: err } = await supabase
          .from('financial_transactions')
          .select('id,date,description,merchant_name,amount,original_amount,split_note,custom_category,account_id,pending,tags')
          .eq('user_id', USER_ID)
          .gte('date', since)
          .order('date', { ascending: false })
          .order('id', { ascending: true })
          .range(from, from + PAGE - 1);
        if (err) throw err;
        all.push(...((data as unknown as Transaction[]) || []));
        if (!data || data.length < PAGE) break;
      }
      setRaw(all);

      // Budget targets from DB
      const { data: targets } = await supabase
        .from('budget_targets')
        .select('category, monthly_target')
        .eq('user_id', USER_ID);
      if (targets) {
        setBudgetTargets(Object.fromEntries((targets as any[]).map(t => [t.category, Number(t.monthly_target)])));
      }

      // All-time reimbursement bucket — not limited to 13-month window
      const { data: reimTxs } = await supabase
        .from('financial_transactions')
        .select('amount, original_amount, tags')
        .eq('user_id', USER_ID)
        .or('original_amount.not.is.null,tags.cs.{reimbursement_in}');
      if (reimTxs) {
        const expected = (reimTxs as any[]).reduce((sum, t) => {
          const orig = Math.abs(Number(t.original_amount));
          const amt = Math.abs(Number(t.amount));
          return orig > amt + 0.01 ? sum + (orig - amt) : sum;
        }, 0);
        const received = (reimTxs as any[]).reduce((sum, t) => {
          return Array.isArray(t.tags) && t.tags.includes('reimbursement_in') && Number(t.amount) > 0
            ? sum + Number(t.amount) : sum;
        }, 0);
        setReimbursementOutstanding(Math.max(0, expected - received));
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [months]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const spend = useMemo(() => toSpendTxs(raw), [raw]);

  // Flip the one_off tag (Harry overrides the agent). Optimistic, then persisted.
  const toggleOneOff = useCallback(async (id: string, tags: string[]) => {
    const next = tags.includes(ONE_OFF_TAG) ? tags.filter(x => x !== ONE_OFF_TAG) : [...tags, ONE_OFF_TAG];
    setRaw(prev => prev.map(t => (t.id === id ? { ...t, tags: next } : t)));
    const { error: err } = await supabase.from('financial_transactions').update({ tags: next }).eq('id', id).eq('user_id', USER_ID);
    if (err) { setError(err.message); load(); }
  }, [load]);
  const rows = useMemo(() => buildMonthRows(spend, months, currentMonth), [spend, months, currentMonth]);
  const completeRows = rows.filter(r => !r.partial);

  const last6 = completeRows.slice(-6);
  const baseline = median(last6.map(r => r.everyday));
  const recent3 = mean(completeRows.slice(-3).map(r => r.everyday));
  const prior3 = mean(completeRows.slice(-6, -3).map(r => r.everyday));
  const trend = completeRows.length >= 6 ? recent3 - prior3 : null;
  const allInAvg = mean(last6.map(r => r.total));
  const lumpyAvg = mean(last6.map(r => r.oneoff + r.travel));
  const targetNum = Number(target) || 0;

  const cur = rows[rows.length - 1];
  const dayOfMonth = today.getDate();
  const daysInThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const everydayPace = cur ? (cur.everyday / Math.max(dayOfMonth, 1)) * daysInThisMonth : 0;

  const chartData = rows.map(r => ({ ...r, label: formatMonth(`${r.month}-01`).replace(/ \d{4}$/, '') + (r.partial ? '*' : '') }));

  const monthTxs = useMemo(
    () => spend.filter(t => t.date.startsWith(selected)).sort((a, b) => b.amount - a.amount),
    [spend, selected],
  );
  const monthBucketTotals = useMemo(() => {
    const out: Record<Bucket, number> = { everyday: 0, oneoff: 0, travel: 0 };
    monthTxs.forEach(t => { out[t.bucket] += t.amount; });
    return out;
  }, [monthTxs]);
  const monthCats = useMemo(() => {
    const m = new Map<string, number>();
    monthTxs.filter(t => bucketFilter.includes(t.bucket)).forEach(t => m.set(t.category, (m.get(t.category) || 0) + t.amount));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [monthTxs, bucketFilter]);
  const shownTxs = monthTxs.filter(t => bucketFilter.includes(t.bucket) && (!catFilter || t.category === catFilter) && (!reviewOnly || t.review));
  const reviewCount = spend.filter(t => t.review && t.date >= `${completeMonths[Math.max(0, completeMonths.length - 3)]}-01`).length;

  const trends = useMemo(() => categoryTrends(spend, completeMonths, 3), [spend, completeMonths]);
  const merchants = useMemo(() => topMerchants(spend, completeMonths.slice(-3), 12), [spend, completeMonths]);

  if (loading && !raw.length) return <Typography color="text.secondary">Loading spending…</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;

  const Stat = ({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) => (
    <Card sx={{ height: '100%', '&:hover': { transform: 'none' } }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2 }}>{label}</Typography>
        <Typography variant="h5" fontWeight={700}>{value}</Typography>
        {sub && <Typography variant="caption" color="text.secondary" component="div">{sub}</Typography>}
      </CardContent>
    </Card>
  );

  return (
    <Grid container spacing={2.5}>
      {/* ── headline numbers ── */}
      <Grid size={{ xs: 6, md: 3 }}>
        <Stat
          label="Baseline / mo"
          value={fmt0(baseline)}
          sub={trend == null ? 'median everyday, last 6 mo' : (
            <span style={{ color: trend <= 0 ? '#4CAF50' : '#F44336' }}>
              {trend <= 0 ? '▼' : '▲'} {fmt0(Math.abs(trend))}/mo vs prior 3 mo
            </span>
          )}
        />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <Stat label="All-in avg / mo" value={fmt0(allInAvg)} sub={`incl. ${fmt0(lumpyAvg)}/mo one-offs + travel`} />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <Stat
          label={`${formatMonth(`${currentMonth}-01`)} so far`}
          value={fmt0(cur?.total || 0)}
          sub={`everyday ${fmt0(cur?.everyday || 0)} · pacing ${fmt0(everydayPace)}`}
        />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <Card sx={{ height: '100%', '&:hover': { transform: 'none' } }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2 }}>Everyday target</Typography>
            <TextField
              size="small" variant="standard" value={target} placeholder="e.g. 4500" type="number"
              onChange={(e) => { setTarget(e.target.value); lsSet('spend.target', e.target.value); }}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              sx={{ width: '100%' }}
            />
            <Typography variant="caption" color="text.secondary" component="div">
              {targetNum ? `${fmt0(baseline - targetNum)}/mo ${baseline > targetNum ? 'above' : 'below'} target` : 'set a goal to draw it on the chart'}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* ── reimbursement bucket ── */}
      {reimbursementOutstanding !== null && (
        <Grid size={{ xs: 12 }}>
          {reimbursementOutstanding > 10 ? (
            <Box sx={{ px: 2, py: 1.25, borderRadius: 2, bgcolor: 'rgba(255,152,0,0.07)', border: '1px solid rgba(255,152,0,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2">
                <span style={{ color: '#FF9800' }}>⚠️ <strong>{fmt0(reimbursementOutstanding)}</strong></span>
                <span style={{ color: 'rgba(255,255,255,0.55)' }}> owed back to you — fronted for group dinners, therapy, etc. (all-time running total)</span>
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 2, whiteSpace: 'nowrap' }}>not in your spend</Typography>
            </Box>
          ) : (
            <Box sx={{ px: 2, py: 1, borderRadius: 2, bgcolor: 'rgba(76,175,80,0.05)', border: '1px solid rgba(76,175,80,0.2)', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="#4CAF50">✓ Reimbursements clear</Typography>
            </Box>
          )}
        </Grid>
      )}

      {/* ── monthly stacked bars ── */}
      <Grid size={{ xs: 12 }}>
        <Card sx={{ '&:hover': { transform: 'none' } }}>
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1} sx={{ mb: 1 }}>
              <Box>
                <Typography variant="h6" fontWeight={600}>Monthly spend: everyday vs one-offs</Typography>
                <Typography variant="caption" color="text.secondary">
                  Money actually out the door (your share after splits). One-offs are flagged by your agent. Card payments, transfers and investing are excluded. Click a bar to see its transactions.
                </Typography>
              </Box>
              {reviewCount > 0 && (
                <Chip size="small" color="warning" variant="outlined" label={`${reviewCount} big charge${reviewCount > 1 ? 's' : ''} to review`}
                  onClick={() => { setReviewOnly(r => !r); }} clickable sx={{ alignSelf: 'flex-start' }} />
              )}
            </Stack>
            <Box sx={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                  onClick={(s: any) => { const m = s?.activePayload?.[0]?.payload?.month; if (m) { setSelected(m); setCatFilter(null); } }}>
                  <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="label" {...xAxisProps} />
                  <YAxis {...yAxisProps} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
                  <Tooltip content={<ChartTooltip formatter={(v: number, n: string) => [formatCurrency(v), n]} />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  {BUCKETS.map(b => (
                    <Bar key={b} dataKey={b} name={BUCKET_LABEL[b]} stackId="s" fill={BUCKET_COLOR[b]} cursor="pointer">
                      {chartData.map(d => (
                        <Cell key={d.month} fill={BUCKET_COLOR[b]} fillOpacity={d.month === selected ? 1 : 0.62} />
                      ))}
                    </Bar>
                  ))}
                  {baseline > 0 && <ReferenceLine y={baseline} stroke="#e6edf3" strokeDasharray="4 4" label={{ value: `baseline ${fmt0(baseline)}`, fill: '#8b96a5', fontSize: 11, position: 'insideTopLeft' }} />}
                  {targetNum > 0 && <ReferenceLine y={targetNum} stroke="#4CAF50" strokeDasharray="2 4" label={{ value: `target ${fmt0(targetNum)}`, fill: '#4CAF50', fontSize: 11, position: 'insideBottomLeft' }} />}
                </BarChart>
              </ResponsiveContainer>
            </Box>
            <Stack direction="row" spacing={2} sx={{ mt: 1 }} flexWrap="wrap">
              {BUCKETS.map(b => (
                <Stack key={b} direction="row" spacing={0.75} alignItems="center">
                  <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: BUCKET_COLOR[b] }} />
                  <Typography variant="caption" color="text.secondary">
                    {BUCKET_LABEL[b]}{b === 'oneoff' ? ' (flagged by your agent — click a Type to change)' : b === 'travel' ? ' (category)' : ' (the rest)'}
                  </Typography>
                </Stack>
              ))}
              <Typography variant="caption" color="text.secondary">* month in progress</Typography>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* ── month drill-down ── */}
      <Grid size={{ xs: 12, md: 4 }}>
        <Card sx={{ height: '100%', '&:hover': { transform: 'none' } }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600}>{formatMonth(`${selected}-01`)}</Typography>
            <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
              {fmt0(monthBucketTotals.everyday + monthBucketTotals.oneoff + monthBucketTotals.travel)}
            </Typography>
            <ToggleButtonGroup size="small" value={bucketFilter} onChange={(_, v) => v?.length && setBucketFilter(v)} sx={{ mb: 2, flexWrap: 'wrap' }}>
              {BUCKETS.map(b => (
                <ToggleButton key={b} value={b} sx={{ textTransform: 'none', px: 1.25 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: BUCKET_COLOR[b], mr: 0.75 }} />
                  {BUCKET_LABEL[b]} {fmt0(monthBucketTotals[b])}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Typography variant="overline" color="text.secondary">By category (tap to filter)</Typography>
            <Stack spacing={0.5} sx={{ mt: 0.5 }}>
              {monthCats.map(([c, v]) => (
                <Box key={c} onClick={() => setCatFilter(catFilter === c ? null : c)}
                  sx={{ cursor: 'pointer', opacity: catFilter && catFilter !== c ? 0.45 : 1 }}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">{c}</Typography>
                    <Typography variant="body2" fontWeight={600}>{fmt0(v)}</Typography>
                  </Stack>
                  <Box sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)' }}>
                    <Box sx={{ height: 4, borderRadius: 2, bgcolor: '#5B8DEF', width: `${Math.min(100, (v / (monthCats[0]?.[1] || 1)) * 100)}%` }} />
                  </Box>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 8 }}>
        <Card sx={{ height: '100%', '&:hover': { transform: 'none' } }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
              Transactions{catFilter ? ` · ${catFilter}` : ''} <Typography component="span" variant="caption" color="text.secondary">({shownTxs.length})</Typography>
            </Typography>
            <TableContainer sx={{ maxHeight: 520 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell><TableCell>Merchant</TableCell><TableCell>Category</TableCell>
                    <TableCell>Type</TableCell><TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {shownTxs.map(t => (
                    <TableRow key={t.id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateShort(t.date)}</TableCell>
                      <TableCell sx={{ maxWidth: 260 }}>
                        <Typography variant="body2" noWrap>{t.merchant}</Typography>
                        {t.original != null && t.original !== t.amount && (
                          <Typography variant="caption" color="text.secondary" noWrap component="div">
                            your share of {formatCurrency(t.original)}{t.note ? ` · ${t.note}` : ''}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{t.category}</TableCell>
                      <TableCell>
                        {t.bucket === 'travel' ? (
                          <Chip size="small" label="Travel" sx={{ bgcolor: `${BUCKET_COLOR.travel}33`, color: BUCKET_COLOR.travel, height: 20, fontSize: 11 }} />
                        ) : (
                          <Chip size="small" clickable onClick={() => toggleOneOff(t.id, t.tags)}
                            label={t.bucket === 'oneoff' ? 'One-off' : t.review ? 'Everyday · review' : 'Everyday'}
                            sx={{ bgcolor: `${BUCKET_COLOR[t.bucket]}33`, color: t.review ? '#FFB74D' : BUCKET_COLOR[t.bucket], height: 20, fontSize: 11,
                                  border: t.review ? '1px dashed #FFB74D' : 'none' }} />
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCurrency(t.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* ── budget vs actuals ── */}
      {Object.keys(budgetTargets).length > 0 && (() => {
        const everydayCatMap = monthTxs
          .filter(t => t.bucket === 'everyday')
          .reduce((m, t) => { m.set(t.category, (m.get(t.category) || 0) + t.amount); return m; }, new Map<string, number>());
        const budgetRows = Object.entries(budgetTargets)
          .filter(([, tgt]) => tgt > 0)
          .map(([cat, tgt]) => ({ cat, actual: everydayCatMap.get(cat) || 0, tgt }))
          .filter(r => r.actual > 0 || r.tgt > 0)
          .sort((a, b) => (b.actual / Math.max(b.tgt, 1)) - (a.actual / Math.max(a.tgt, 1)));
        if (!budgetRows.length) return null;
        return (
          <Grid size={{ xs: 12 }}>
            <Card sx={{ '&:hover': { transform: 'none' } }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                  {formatMonth(`${selected}-01`)} — Budget vs actuals
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>everyday bucket only</Typography>
                </Typography>
                <Stack spacing={1.25}>
                  {budgetRows.map(({ cat, actual, tgt }) => {
                    const pct = Math.min((actual / tgt) * 100, 110);
                    const color = pct > 100 ? '#F44336' : pct > 80 ? '#FF9800' : '#4CAF50';
                    return (
                      <Box key={cat} onClick={() => setCatFilter(catFilter === cat ? null : cat)}
                        sx={{ cursor: 'pointer', opacity: catFilter && catFilter !== cat ? 0.5 : 1 }}>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.4 }}>
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{cat}</Typography>
                          <Typography variant="body2" fontWeight={600}>
                            <span style={{ color }}>{fmt0(actual)}</span>
                            <span style={{ color: 'rgba(255,255,255,0.35)' }}> / {fmt0(tgt)}</span>
                          </Typography>
                        </Stack>
                        <LinearProgress variant="determinate" value={Math.min(pct, 100)}
                          sx={{ height: 5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.05)',
                            '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 } }} />
                      </Box>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        );
      })()}

      {/* ── where to trim ── */}
      <Grid size={{ xs: 12, md: 7 }}>
        <Card sx={{ height: '100%', '&:hover': { transform: 'none' } }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600}>Where the baseline goes</Typography>
            <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>
              Everyday spend only, average per month — last 3 full months vs the 3 before.
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow><TableCell>Category</TableCell><TableCell align="right">Last 3 mo</TableCell><TableCell align="right">Prior 3 mo</TableCell><TableCell align="right">Change</TableCell></TableRow>
              </TableHead>
              <TableBody>
                {trends.filter(t => t.recent >= 20 || t.prior >= 20).map(t => (
                  <TableRow key={t.category} hover>
                    <TableCell>{t.category}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>{fmt0(t.recent)}</TableCell>
                    <TableCell align="right">{t.prior ? fmt0(t.prior) : '—'}</TableCell>
                    <TableCell align="right" sx={{ color: !t.prior ? 'text.secondary' : t.delta > 25 ? '#F44336' : t.delta < -25 ? '#4CAF50' : 'text.secondary' }}>
                      {!t.prior ? '—' : `${t.delta > 0 ? '+' : '−'}${fmt0(Math.abs(t.delta))}`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 5 }}>
        <Card sx={{ height: '100%', '&:hover': { transform: 'none' } }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600}>Top everyday merchants</Typography>
            <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>Last 3 full months, by total.</Typography>
            <Table size="small">
              <TableHead>
                <TableRow><TableCell>Merchant</TableCell><TableCell align="right">Visits</TableCell><TableCell align="right">Avg</TableCell><TableCell align="right">Total</TableCell></TableRow>
              </TableHead>
              <TableBody>
                {merchants.map(m => (
                  <TableRow key={m.merchant} hover>
                    <TableCell sx={{ maxWidth: 160 }}><Typography variant="body2" noWrap>{m.merchant}</Typography></TableCell>
                    <TableCell align="right">{m.count}</TableCell>
                    <TableCell align="right">{fmt0(m.avg)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>{fmt0(m.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default SpendingTab;
