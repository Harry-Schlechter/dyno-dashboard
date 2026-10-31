import React, { useMemo } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Stack, Chip, LinearProgress,
} from '@mui/material';
import { TrendingDown, FitnessCenter, LocalFireDepartment, Straighten } from '@mui/icons-material';
import {
  ComposedChart, LineChart, BarChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine, ReferenceArea, Cell, Legend,
} from 'recharts';
import { format, differenceInDays, addDays, parseISO } from 'date-fns';
import { useSupabase } from '../hooks/useSupabase';

// ── Cut parameters ──────────────────────────────────────────────────────────
const CUT_START      = '2026-10-26';
const CUT_END        = '2026-12-25';
const START_WEIGHT   = 173.5;
const TARGET_WEIGHT  = 160;
const CAL_CEILING    = 2200;
const PROTEIN_TARGET = 150;

const CUT_TOTAL_DAYS = differenceInDays(parseISO(CUT_END), parseISO(CUT_START));
const IDEAL_RATE     = (START_WEIGHT - TARGET_WEIGHT) / CUT_TOTAL_DAYS; // lbs/day

// ── Types ───────────────────────────────────────────────────────────────────
interface DailyLog {
  date: string;
  weight_lbs: number | null;
}

interface Meal {
  date: string;
  calories: number | null;
  protein_g: number | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function toShortDate(d: string) {
  return format(parseISO(d), 'M/d');
}

function linearRegression(points: { x: number; y: number }[]) {
  if (points.length < 2) return null;
  const n = points.length;
  const sumX  = points.reduce((s, p) => s + p.x, 0);
  const sumY  = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  const slope     = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

// ── Stat card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  icon?: React.ReactNode;
}
const StatCard: React.FC<StatCardProps> = ({ label, value, sub, color = '#90caf9', icon }) => (
  <Card sx={{ height: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
    <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={1}>
        {icon && <Box sx={{ color, display: 'flex' }}>{icon}</Box>}
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.8, fontSize: '0.68rem' }}>
          {label}
        </Typography>
      </Stack>
      <Typography variant="h4" fontWeight={700} sx={{ color, lineHeight: 1.1 }}>
        {value}
      </Typography>
      {sub && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {sub}
        </Typography>
      )}
    </CardContent>
  </Card>
);

// ── Main ─────────────────────────────────────────────────────────────────────
const CutPage: React.FC = () => {
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const { data: weightRows, loading: weightLoading } = useSupabase<DailyLog>({
    table: 'daily_logs',
    select: 'date,weight_lbs',
    filters: {},
    order: { column: 'date', ascending: true },
    limit: 500,
  });

  const { data: mealRows, loading: mealLoading } = useSupabase<Meal>({
    table: 'meals',
    select: 'date,calories,protein_g',
    order: { column: 'date', ascending: true },
    limit: 2000,
  });

  // ── Weight data ─────────────────────────────────────────────────────────
  const weightData = useMemo(() => {
    const cut = weightRows.filter(r => r.date >= CUT_START && r.weight_lbs != null);
    return cut.map(r => ({
      date: r.date,
      label: toShortDate(r.date),
      weight: r.weight_lbs as number,
      day: differenceInDays(parseISO(r.date), parseISO(CUT_START)),
    }));
  }, [weightRows]);

  // Linear regression on actual weight points
  const regression = useMemo(() => linearRegression(weightData.map(p => ({ x: p.day, y: p.weight }))), [weightData]);

  // Generate ideal pace & trend projection lines across entire cut window
  const weightChartData = useMemo(() => {
    const rows: { date: string; label: string; day: number; weight?: number; ideal: number; trend?: number }[] = [];
    const cutDays = Math.min(differenceInDays(parseISO(today), parseISO(CUT_START)) + 5, CUT_TOTAL_DAYS);
    const weightByDay = new Map(weightData.map(p => [p.day, p.weight]));

    for (let d = 0; d <= cutDays; d++) {
      const date = format(addDays(parseISO(CUT_START), d), 'yyyy-MM-dd');
      const ideal = START_WEIGHT - IDEAL_RATE * d;
      const weight = weightByDay.get(d);
      const trend = regression ? regression.slope * d + regression.intercept : undefined;
      rows.push({ date, label: toShortDate(date), day: d, weight, ideal, trend });
    }
    return rows;
  }, [weightData, regression, today]);

  // ── Nutrition data ───────────────────────────────────────────────────────
  const nutritionData = useMemo(() => {
    const byDay = new Map<string, { cal: number; protein: number; n: number }>();
    for (const m of mealRows) {
      if (m.date < CUT_START) continue;
      const cur = byDay.get(m.date) ?? { cal: 0, protein: 0, n: 0 };
      cur.cal     += m.calories   ?? 0;
      cur.protein += m.protein_g  ?? 0;
      cur.n++;
      byDay.set(m.date, cur);
    }
    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        label: toShortDate(date),
        calories: Math.round(v.cal),
        protein:  Math.round(v.protein),
        logged: v.n > 0,
      }));
  }, [mealRows]);

  // ── Stats ────────────────────────────────────────────────────────────────
  const daysIn = differenceInDays(parseISO(today), parseISO(CUT_START));
  const daysLeft = differenceInDays(parseISO(CUT_END), parseISO(today));

  const latestWeight = useMemo(() => {
    const sorted = [...weightData].sort((a, b) => b.date.localeCompare(a.date));
    return sorted[0]?.weight ?? null;
  }, [weightData]);

  const weightLost = latestWeight != null ? START_WEIGHT - latestWeight : null;

  const avgCal = useMemo(() => {
    const logged = nutritionData.filter(d => d.calories > 0);
    if (!logged.length) return null;
    return Math.round(logged.reduce((s, d) => s + d.calories, 0) / logged.length);
  }, [nutritionData]);

  const avgProtein = useMemo(() => {
    const logged = nutritionData.filter(d => d.protein > 0);
    if (!logged.length) return null;
    return Math.round(logged.reduce((s, d) => s + d.protein, 0) / logged.length);
  }, [nutritionData]);

  // Projected finish weight based on regression slope
  const projectedFinishWeight = useMemo(() => {
    if (!regression) return null;
    const finishDay = CUT_TOTAL_DAYS;
    const w = regression.slope * finishDay + regression.intercept;
    return Math.round(w * 10) / 10;
  }, [regression]);

  // Days to target at current pace
  const daysToTarget = useMemo(() => {
    if (!regression || regression.slope >= 0) return null;
    const day = (TARGET_WEIGHT - regression.intercept) / regression.slope;
    const date = format(addDays(parseISO(CUT_START), Math.round(day)), 'MMM d');
    return date;
  }, [regression]);

  const pacePerWeek = regression ? Math.abs(regression.slope * 7) : null;

  // Progress bar
  const progressPct = latestWeight != null
    ? Math.min(100, Math.max(0, ((START_WEIGHT - latestWeight) / (START_WEIGHT - TARGET_WEIGHT)) * 100))
    : 0;

  const loading = weightLoading || mealLoading;

  // ── Custom tooltip ────────────────────────────────────────────────────────
  const WeightTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <Box sx={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 1, p: 1.5 }}>
        <Typography variant="caption" color="text.secondary">{d?.date}</Typography>
        {d?.weight   != null && <Typography variant="body2" sx={{ color: '#90caf9' }}>Actual: {d.weight} lbs</Typography>}
        {d?.trend    != null && <Typography variant="body2" sx={{ color: '#ce93d8' }}>Trend: {(Math.round(d.trend * 10) / 10)} lbs</Typography>}
        {d?.ideal    != null && <Typography variant="body2" sx={{ color: '#a5d6a7' }}>Pace: {(Math.round(d.ideal * 10) / 10)} lbs</Typography>}
      </Box>
    );
  };

  const NutrTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <Box sx={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 1, p: 1.5 }}>
        <Typography variant="caption" color="text.secondary">{d?.date}</Typography>
        {d?.calories != null && <Typography variant="body2" sx={{ color: '#ffb74d' }}>Cal: {d.calories}</Typography>}
        {d?.protein  != null && <Typography variant="body2" sx={{ color: '#80cbc4' }}>Protein: {d.protein}g</Typography>}
      </Box>
    );
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} mb={0.5}>
        <TrendingDown sx={{ color: '#90caf9', fontSize: '2rem' }} />
        <Box>
          <Typography variant="h4" fontWeight={700}>The Cut</Typography>
          <Typography variant="body2" color="text.secondary">
            Oct 26 – Dec 25 · {START_WEIGHT} → {TARGET_WEIGHT} lbs · ≤{CAL_CEILING} cal · {PROTEIN_TARGET}g+ protein
          </Typography>
        </Box>
        <Box flex={1} />
        <Chip
          label={`Day ${daysIn} of ${CUT_TOTAL_DAYS}`}
          size="small"
          sx={{ background: 'rgba(144,202,249,0.12)', color: '#90caf9', fontWeight: 600 }}
        />
        <Chip
          label={`${daysLeft}d left`}
          size="small"
          sx={{ background: 'rgba(165,214,167,0.12)', color: '#a5d6a7' }}
        />
      </Stack>

      {/* Progress bar */}
      <Box sx={{ mb: 3, mt: 2 }}>
        <Stack direction="row" justifyContent="space-between" mb={0.5}>
          <Typography variant="caption" color="text.secondary">Progress to goal</Typography>
          <Typography variant="caption" color="text.secondary">
            {weightLost != null ? `${weightLost.toFixed(1)} / ${(START_WEIGHT - TARGET_WEIGHT).toFixed(1)} lbs` : '—'}
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={progressPct}
          sx={{
            height: 8, borderRadius: 4,
            background: 'rgba(255,255,255,0.08)',
            '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #42a5f5, #a5d6a7)', borderRadius: 4 },
          }}
        />
      </Box>

      {/* Stat cards */}
      <Grid container spacing={2} mb={3}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            label="Current weight"
            value={latestWeight != null ? `${latestWeight} lbs` : '—'}
            sub={weightLost != null ? `−${weightLost.toFixed(1)} lbs from start` : 'No data yet'}
            color="#90caf9"
            icon={<Straighten fontSize="small" />}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            label="Pace"
            value={pacePerWeek != null ? `${pacePerWeek.toFixed(1)} lbs/wk` : '—'}
            sub={daysToTarget ? `On track to hit 160 by ${daysToTarget}` : 'Need more data'}
            color={pacePerWeek != null && pacePerWeek >= 1.0 ? '#a5d6a7' : '#ffb74d'}
            icon={<TrendingDown fontSize="small" />}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            label="Avg calories"
            value={avgCal != null ? `${avgCal}` : '—'}
            sub={avgCal != null ? (avgCal <= CAL_CEILING ? `✓ Under ${CAL_CEILING} cal target` : `↑ ${avgCal - CAL_CEILING} over target`) : 'No logs yet'}
            color={avgCal != null && avgCal <= CAL_CEILING ? '#a5d6a7' : '#ef9a9a'}
            icon={<LocalFireDepartment fontSize="small" />}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            label="Avg protein"
            value={avgProtein != null ? `${avgProtein}g` : '—'}
            sub={avgProtein != null ? (avgProtein >= PROTEIN_TARGET ? `✓ Above ${PROTEIN_TARGET}g target` : `↓ ${PROTEIN_TARGET - avgProtein}g short`) : 'No logs yet'}
            color={avgProtein != null && avgProtein >= PROTEIN_TARGET ? '#a5d6a7' : '#ef9a9a'}
            icon={<FitnessCenter fontSize="small" />}
          />
        </Grid>
      </Grid>

      {loading && (
        <Typography color="text.secondary" textAlign="center" py={4}>Loading cut data…</Typography>
      )}

      {!loading && (
        <Grid container spacing={3}>
          {/* Weight chart */}
          <Grid size={{ xs: 12 }}>
            <Card sx={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                  <Typography fontWeight={600}>Weight</Typography>
                  {projectedFinishWeight != null && (
                    <Typography variant="caption" color="text.secondary">
                      Projected Dec 25: {projectedFinishWeight} lbs
                    </Typography>
                  )}
                </Stack>
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart data={weightChartData} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="label" tick={{ fill: '#9e9e9e', fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis
                      domain={[TARGET_WEIGHT - 1, START_WEIGHT + 1]}
                      tick={{ fill: '#9e9e9e', fontSize: 11 }}
                      tickFormatter={v => `${v}`}
                      width={38}
                    />
                    <Tooltip content={<WeightTooltip />} />
                    <ReferenceLine y={TARGET_WEIGHT} stroke="#a5d6a7" strokeDasharray="6 3"
                      label={{ value: `Goal ${TARGET_WEIGHT}`, fill: '#a5d6a7', fontSize: 11, position: 'insideBottomRight' }} />
                    {/* Ideal pace */}
                    <Line dataKey="ideal" stroke="#a5d6a7" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="Ideal pace" />
                    {/* Regression trend */}
                    {regression && <Line dataKey="trend" stroke="#ce93d8" strokeWidth={1.5} strokeDasharray="6 2" dot={false} name="Trend" />}
                    {/* Actual weight — only plotted where weight exists */}
                    <Line dataKey="weight" stroke="#90caf9" strokeWidth={2.5} dot={{ r: 4, fill: '#90caf9' }} connectNulls={false} name="Actual" />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Calories chart */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography fontWeight={600} mb={2}>Calories / day</Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={nutritionData} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="label" tick={{ fill: '#9e9e9e', fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis domain={[0, 3000]} tick={{ fill: '#9e9e9e', fontSize: 11 }} width={38} />
                    <Tooltip content={<NutrTooltip />} />
                    <ReferenceLine y={CAL_CEILING} stroke="#a5d6a7" strokeDasharray="4 2" strokeWidth={1.5}
                      label={{ value: `${CAL_CEILING}`, fill: '#a5d6a7', fontSize: 11, position: 'insideTopRight' }} />
                    <Bar dataKey="calories" radius={[3, 3, 0, 0]} name="Calories">
                      {nutritionData.map((d, i) => (
                        <Cell key={i} fill={d.calories > CAL_CEILING ? '#ef9a9a' : '#42a5f5'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <Stack direction="row" spacing={2} mt={1}>
                  <Typography variant="caption" sx={{ color: '#42a5f5' }}>■ On track (≤{CAL_CEILING})</Typography>
                  <Typography variant="caption" sx={{ color: '#ef9a9a' }}>■ Over target</Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Protein chart */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography fontWeight={600} mb={2}>Protein / day</Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={nutritionData} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="label" tick={{ fill: '#9e9e9e', fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis domain={[0, 250]} tick={{ fill: '#9e9e9e', fontSize: 11 }} width={38} tickFormatter={v => `${v}g`} />
                    <Tooltip content={<NutrTooltip />} />
                    <ReferenceLine y={PROTEIN_TARGET} stroke="#80cbc4" strokeDasharray="4 2" strokeWidth={1.5}
                      label={{ value: `${PROTEIN_TARGET}g`, fill: '#80cbc4', fontSize: 11, position: 'insideTopRight' }} />
                    <Bar dataKey="protein" radius={[3, 3, 0, 0]} name="Protein">
                      {nutritionData.map((d, i) => (
                        <Cell key={i} fill={d.protein >= PROTEIN_TARGET ? '#80cbc4' : '#ce93d8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <Stack direction="row" spacing={2} mt={1}>
                  <Typography variant="caption" sx={{ color: '#80cbc4' }}>■ On target ({PROTEIN_TARGET}g+)</Typography>
                  <Typography variant="caption" sx={{ color: '#ce93d8' }}>■ Below target</Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Daily log table */}
          <Grid size={{ xs: 12 }}>
            <Card sx={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography fontWeight={600} mb={2}>Cut log</Typography>
                <Box sx={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Date', 'Weight', 'Δ', 'Calories', 'Protein', 'Status'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '6px 12px', color: '#9e9e9e', fontSize: 12, fontWeight: 500, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const nutrByDate = new Map(nutritionData.map(d => [d.date, d]));
                        const wtByDate   = new Map(weightData.map(d => [d.date, d.weight]));
                        // All dates from cut start to today
                        const days = [];
                        for (let i = 0; i <= daysIn; i++) {
                          days.push(format(addDays(parseISO(CUT_START), i), 'yyyy-MM-dd'));
                        }
                        let prevWeight: number | null = null;
                        return days.reverse().map((date, idx) => {
                          const n = nutrByDate.get(date);
                          const w = wtByDate.get(date) ?? null;
                          const delta = w != null && prevWeight != null ? w - prevWeight : null;
                          if (w != null) prevWeight = w;
                          const calOk = n ? n.calories <= CAL_CEILING : null;
                          const proOk = n ? n.protein >= PROTEIN_TARGET : null;
                          const anyData = w != null || n != null;
                          return (
                            <tr key={date} style={{ opacity: anyData ? 1 : 0.35 }}>
                              <td style={{ padding: '5px 12px', fontSize: 13, color: '#e0e0e0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                {format(parseISO(date), 'EEE M/d')}
                              </td>
                              <td style={{ padding: '5px 12px', fontSize: 13, color: w != null ? '#90caf9' : '#555', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                {w != null ? `${w} lbs` : '—'}
                              </td>
                              <td style={{ padding: '5px 12px', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.04)',
                                color: delta == null ? '#555' : delta < 0 ? '#a5d6a7' : '#ef9a9a' }}>
                                {delta != null ? (delta < 0 ? `−${Math.abs(delta).toFixed(1)}` : `+${delta.toFixed(1)}`) : '—'}
                              </td>
                              <td style={{ padding: '5px 12px', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.04)',
                                color: n ? (calOk ? '#42a5f5' : '#ef9a9a') : '#555' }}>
                                {n ? n.calories : '—'}
                              </td>
                              <td style={{ padding: '5px 12px', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.04)',
                                color: n ? (proOk ? '#80cbc4' : '#ce93d8') : '#555' }}>
                                {n ? `${n.protein}g` : '—'}
                              </td>
                              <td style={{ padding: '5px 12px', fontSize: 12, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                {!anyData ? <span style={{ color: '#555' }}>no log</span> : (
                                  <Stack direction="row" spacing={0.5}>
                                    {n && <Chip label={calOk ? 'cal ✓' : 'cal ✗'} size="small" sx={{ height: 18, fontSize: 10,
                                      background: calOk ? 'rgba(66,165,245,0.15)' : 'rgba(239,154,154,0.15)',
                                      color: calOk ? '#42a5f5' : '#ef9a9a' }} />}
                                    {n && <Chip label={proOk ? 'pro ✓' : 'pro ✗'} size="small" sx={{ height: 18, fontSize: 10,
                                      background: proOk ? 'rgba(128,203,196,0.15)' : 'rgba(206,147,216,0.15)',
                                      color: proOk ? '#80cbc4' : '#ce93d8' }} />}
                                  </Stack>
                                )}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default CutPage;
