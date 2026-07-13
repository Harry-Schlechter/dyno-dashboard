import React, { useMemo, useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Stack, ToggleButton, ToggleButtonGroup, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, LinearProgress,
} from '@mui/material';
import { LocalFireDepartment, Whatshot } from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Cell,
} from 'recharts';
import { format, subDays } from 'date-fns';
import { useSupabase } from '../hooks/useSupabase';
import { formatDateShort } from '../lib/formatters';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import AgentVoiceCard from '../components/common/AgentVoiceCard';
import InsightsFeed from '../components/home/InsightsFeed';
import CollapsibleSection from '../components/common/CollapsibleSection';
import ActivityHeatmap, { HeatmapEntry } from '../components/common/ActivityHeatmap';

type Window = '7d' | '30d' | '90d';
const WINDOW_DAYS: Record<Window, number> = { '7d': 7, '30d': 30, '90d': 90 };

const PROTEIN_TARGET = 170;
const CALORIE_TARGET = 2400; // upper bound for cutting / maintenance

interface Meal {
  id: string;
  date: string;
  meal_type: string | null;
  description: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
}

const NutritionPage: React.FC = () => {
  const [win, setWin] = useState<Window>('30d');
  const { data, loading } = useSupabase<Meal>({
    table: 'meals',
    order: { column: 'date', ascending: false },
    limit: 1000,
  });

  const today = useMemo(() => new Date(), []);
  const windowStart = useMemo(() => format(subDays(today, WINDOW_DAYS[win] - 1), 'yyyy-MM-dd'), [today, win]);
  const filtered = useMemo(() => data.filter(m => m.date >= windowStart), [data, windowStart]);

  // Protein heatmap — full available history, summed per day, value = % of target.
  const proteinHeatmap: HeatmapEntry[] = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const m of data) {
      if (m.protein_g != null) byDay.set(m.date, (byDay.get(m.date) ?? 0) + m.protein_g);
    }
    return Array.from(byDay.entries()).map(([date, p]) => ({
      date,
      value: Math.round((p / PROTEIN_TARGET) * 100),
      label: `${Math.round(p)}g protein (${Math.round((p / PROTEIN_TARGET) * 100)}% of target)`,
    }));
  }, [data]);

  // Daily aggregates within window
  const dailyData = useMemo(() => {
    const map = new Map<string, { date: string; protein: number; calories: number; meals: number }>();
    for (let i = 0; i < WINDOW_DAYS[win]; i++) {
      const d = format(subDays(today, i), 'yyyy-MM-dd');
      map.set(d, { date: d, protein: 0, calories: 0, meals: 0 });
    }
    for (const m of filtered) {
      const day = map.get(m.date);
      if (!day) continue;
      day.protein += m.protein_g ?? 0;
      day.calories += m.calories ?? 0;
      day.meals += 1;
    }
    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered, today, win]);

  // Streak: consecutive days from today (going back) where protein >= target
  const streak = useMemo(() => {
    let count = 0;
    for (let i = 0; i < dailyData.length; i++) {
      const day = dailyData[dailyData.length - 1 - i];
      if (day.meals === 0) break; // no log = streak break (can't tell)
      if (day.protein >= PROTEIN_TARGET) count++;
      else break;
    }
    return count;
  }, [dailyData]);

  // Days hitting target / total logged days
  const compliance = useMemo(() => {
    const logged = dailyData.filter(d => d.meals > 0);
    if (logged.length === 0) return { hit: 0, total: 0, pct: 0 };
    const hit = logged.filter(d => d.protein >= PROTEIN_TARGET).length;
    return { hit, total: logged.length, pct: (hit / logged.length) * 100 };
  }, [dailyData]);

  const todayKey = format(today, 'yyyy-MM-dd');
  const todayData = dailyData.find(d => d.date === todayKey);

  // Days under target (recent)
  const missedDays = useMemo(() => {
    return dailyData
      .filter(d => d.meals > 0 && d.protein < PROTEIN_TARGET)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8);
  }, [dailyData]);

  // Protein-dense meals leaderboard (g protein per 100 cal, only meals with both fields)
  const proteinDense = useMemo(() => {
    return filtered
      .filter(m => m.protein_g != null && m.calories != null && m.calories > 0 && m.protein_g > 0)
      .map(m => ({ ...m, density: ((m.protein_g as number) / (m.calories as number)) * 100 }))
      .sort((a, b) => b.density - a.density)
      .slice(0, 10);
  }, [filtered]);

  // Recent meals list (already sorted desc by date in the hook)
  const recentMeals = useMemo(() => filtered.slice(0, 25), [filtered]);

  const winLabel: Record<Window, string> = { '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days' };

  if (loading) return <LoadingSkeleton variant="card" count={3} />;

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Nutrition</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Protein target: {PROTEIN_TARGET}g/day
          </Typography>
        </Box>
        <ToggleButtonGroup size="small" exclusive value={win} onChange={(_, v) => v && setWin(v)}>
          <ToggleButton value="7d" sx={{ textTransform: 'none' }}>7d</ToggleButton>
          <ToggleButton value="30d" sx={{ textTransform: 'none' }}>30d</ToggleButton>
          <ToggleButton value="90d" sx={{ textTransform: 'none' }}>90d</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <CollapsibleSection title="Your nutritionist & insights">
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, md: 6 }}>
            <AgentVoiceCard agentId="nutritionist" />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <InsightsFeed
              agentId="nutritionist"
              limit={5}
              title="Nutrition insights"
              emptyMessage="Nutritionist is watching macros and meals — nothing flagged yet."
            />
          </Grid>
        </Grid>
      </CollapsibleSection>

      <Grid container spacing={2.5}>
        {/* Today */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ '&:hover': { transform: 'none' }, height: '100%' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>Today</Typography>
              {!todayData || todayData.meals === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Nothing logged yet</Typography>
              ) : (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
                    <Typography variant="h2" fontWeight={700} sx={{ color: todayData.protein >= PROTEIN_TARGET ? '#4CAF50' : '#5B8DEF', lineHeight: 1 }}>
                      {Math.round(todayData.protein)}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">/ {PROTEIN_TARGET}g protein</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (todayData.protein / PROTEIN_TARGET) * 100)}
                    sx={{
                      height: 6, borderRadius: 3, mt: 1.5,
                      bgcolor: 'rgba(255,255,255,0.05)',
                      '& .MuiLinearProgress-bar': { bgcolor: todayData.protein >= PROTEIN_TARGET ? '#4CAF50' : '#5B8DEF' },
                    }}
                  />
                  <Stack direction="row" spacing={3} sx={{ mt: 1.5 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Meals</Typography>
                      <Typography variant="body2" fontWeight={600}>{todayData.meals}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Calories</Typography>
                      <Typography variant="body2" fontWeight={600}>{Math.round(todayData.calories)}</Typography>
                    </Box>
                  </Stack>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Streak */}
        <Grid size={{ xs: 6, md: 4 }}>
          <Card sx={{ '&:hover': { transform: 'none' }, height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Whatshot sx={{ color: '#FF9800', fontSize: 18 }} />
                <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>Streak</Typography>
              </Box>
              <Typography variant="h2" fontWeight={700} sx={{ color: '#FF9800', lineHeight: 1 }}>{streak}</Typography>
              <Typography variant="caption" color="text.secondary">
                {streak === 0 ? 'days hitting target' : streak === 1 ? 'day in a row' : 'days in a row'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Compliance */}
        <Grid size={{ xs: 6, md: 4 }}>
          <Card sx={{ '&:hover': { transform: 'none' }, height: '100%' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>
                {winLabel[win]} compliance
              </Typography>
              <Typography variant="h2" fontWeight={700} sx={{ color: '#5B8DEF', lineHeight: 1, mt: 0.5 }}>
                {Math.round(compliance.pct)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {compliance.hit} of {compliance.total} logged days hit {PROTEIN_TARGET}g
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Daily protein chart */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ '&:hover': { transform: 'none' } }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Daily protein vs target</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" tickFormatter={v => format(new Date(v + 'T00:00:00'), 'MMM d')} stroke="rgba(255,255,255,0.12)" tickLine={false} tick={{ fill: "#8b96a5", fontSize: 10 }} />
                  <YAxis stroke="rgba(255,255,255,0.12)" tickLine={false} tick={{ fill: "#8b96a5", fontSize: 10 }} />
                  <Tooltip
                    labelFormatter={v => format(new Date(v + 'T00:00:00'), 'EEE, MMM d')}
                    formatter={(v: number, name: string) => name === 'protein' ? [`${Math.round(v)}g`, 'Protein'] : [v, name]}
                    contentStyle={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }} itemStyle={{ color: "#e6edf3" }} labelStyle={{ color: "#8b96a5", fontWeight: 600 }}
                  />
                  <ReferenceLine y={PROTEIN_TARGET} stroke="#FF9800" strokeDasharray="6 4" label={{ value: `Target ${PROTEIN_TARGET}g`, position: 'right', fill: '#FF9800', fontSize: 11 }} />
                  <Bar dataKey="protein" radius={[4, 4, 0, 0]}>
                    {dailyData.map((d, i) => (
                      <Cell key={i} fill={d.meals === 0 ? '#2a2f37' : d.protein >= PROTEIN_TARGET ? '#4CAF50' : '#5B8DEF'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Grey bars = no meals logged that day. Green = hit target.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Daily calories chart */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ '&:hover': { transform: 'none' } }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Daily calories vs target</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" tickFormatter={v => format(new Date(v + 'T00:00:00'), 'MMM d')} stroke="rgba(255,255,255,0.12)" tickLine={false} tick={{ fill: "#8b96a5", fontSize: 10 }} />
                  <YAxis stroke="rgba(255,255,255,0.12)" tickLine={false} tick={{ fill: "#8b96a5", fontSize: 10 }} />
                  <Tooltip
                    labelFormatter={v => format(new Date(v + 'T00:00:00'), 'EEE, MMM d')}
                    formatter={(v: number, name: string) => name === 'calories' ? [`${Math.round(v).toLocaleString()} cal`, 'Calories'] : [v, name]}
                    contentStyle={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }} itemStyle={{ color: "#e6edf3" }} labelStyle={{ color: "#8b96a5", fontWeight: 600 }}
                  />
                  <ReferenceLine y={CALORIE_TARGET} stroke="#FF9800" strokeDasharray="6 4" label={{ value: `Target ≤${CALORIE_TARGET.toLocaleString()}`, position: 'right', fill: '#FF9800', fontSize: 11 }} />
                  <Bar dataKey="calories" radius={[4, 4, 0, 0]}>
                    {dailyData.map((d, i) => (
                      <Cell
                        key={i}
                        fill={
                          d.meals === 0
                            ? '#2a2f37'                           // no log → grey
                            : d.calories < 1500
                              ? '#5B8DEF'                          // partial log → blue (low confidence)
                              : d.calories <= CALORIE_TARGET
                                ? '#4CAF50'                         // under target → green
                                : '#FF9800'                         // over target → orange
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Grey = no meals logged. Blue = under 1,500 cal logged (probably partial). Green = under target. Orange = over target.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Days missed */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ '&:hover': { transform: 'none' }, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Recent days under target</Typography>
              {missedDays.length === 0 ? (
                <Typography variant="body2" color="text.secondary">All logged days in this window hit the protein target. 💪</Typography>
              ) : (
                <Stack spacing={1}>
                  {missedDays.map(d => {
                    const pct = (d.protein / PROTEIN_TARGET) * 100;
                    const short = PROTEIN_TARGET - d.protein;
                    return (
                      <Box key={d.date} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ width: 60 }}>{formatDateShort(d.date)}</Typography>
                        <Box sx={{ flex: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(100, pct)}
                            sx={{
                              height: 4, borderRadius: 2,
                              bgcolor: 'rgba(255,255,255,0.04)',
                              '& .MuiLinearProgress-bar': { bgcolor: pct >= 75 ? '#FF9800' : '#F44336', borderRadius: 2 },
                            }}
                          />
                        </Box>
                        <Typography variant="caption" sx={{ width: 100, textAlign: 'right' }}>
                          {Math.round(d.protein)}g <span style={{ color: '#7d8590' }}>(-{Math.round(short)}g)</span>
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Protein-dense meals */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ '&:hover': { transform: 'none' }, height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <LocalFireDepartment sx={{ color: '#F44336', fontSize: 18 }} />
                <Typography variant="h6">Most protein-dense meals</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                Grams protein per 100 calories — your highest-yield meals
              </Typography>
              {proteinDense.length === 0 ? (
                <Typography variant="body2" color="text.secondary">Need both protein and calories logged for ranking.</Typography>
              ) : (
                <Stack spacing={1}>
                  {proteinDense.map(m => (
                    <Box key={m.id} sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <Typography variant="body2" fontWeight={500} sx={{ flex: 1, mr: 1 }} noWrap>
                          {m.description || '(no description)'}
                        </Typography>
                        <Chip
                          label={`${m.density.toFixed(1)}g/100cal`}
                          size="small"
                          sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'rgba(244,67,54,0.15)', color: '#F44336' }}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {formatDateShort(m.date)} · {m.protein_g}g protein, {m.calories} cal
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent meals */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ '&:hover': { transform: 'none' } }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Recent meals</Typography>
              <TableContainer sx={{ maxHeight: 480 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Protein</TableCell>
                      <TableCell align="right">Calories</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentMeals.map(m => (
                      <TableRow key={m.id}>
                        <TableCell><Typography variant="caption">{formatDateShort(m.date)}</Typography></TableCell>
                        <TableCell>
                          {m.meal_type && (
                            <Chip label={m.meal_type} size="small" sx={{ height: 18, fontSize: '0.65rem', textTransform: 'capitalize' }} />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{m.description || '—'}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          {m.protein_g != null ? (
                            <Typography variant="body2" fontWeight={600} sx={{ color: '#5B8DEF' }}>
                              {Math.round(m.protein_g)}g
                            </Typography>
                          ) : <Typography variant="caption" color="text.secondary">—</Typography>}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption" color="text.secondary">
                            {m.calories != null ? Math.round(m.calories) : '—'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {proteinHeatmap.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Card sx={{ '&:hover': { transform: 'none' } }}>
              <CardContent>
                <ActivityHeatmap
                  data={proteinHeatmap}
                  days={84}
                  fillColor="#FF9800"
                  title="Protein adherence over 12 weeks"
                  thresholds={[40, 70, 90, 100]}
                  legend={`Darker = closer to ${PROTEIN_TARGET}g target. Empty = no log.`}
                />
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default NutritionPage;
