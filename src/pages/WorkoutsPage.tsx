import React, { useMemo, useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Stack, ToggleButton, ToggleButtonGroup, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Tab,
} from '@mui/material';
import { SportsBasketball, Terrain, FitnessCenter, DirectionsRun, EmojiEvents, GolfCourse } from '@mui/icons-material';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, Cell,
} from 'recharts';
import { format, subDays, startOfWeek } from 'date-fns';
import { useSupabase } from '../hooks/useSupabase';
import AskSpecialistButton from '../components/chat/AskSpecialistButton';
import {
  detectPRs, sessionsForExercise, topExercisesByVolume, SetWithDate, ExerciseSet,
} from '../lib/lifting';
import { formatDateShort } from '../lib/formatters';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import AgentVoiceCard from '../components/common/AgentVoiceCard';
import InsightsFeed from '../components/home/InsightsFeed';
import CollapsibleSection from '../components/common/CollapsibleSection';
import ActivityHeatmap, { HeatmapEntry } from '../components/common/ActivityHeatmap';
import GolfSection from '../components/workouts/GolfSection';
import RecoveryRing from '../components/home/RecoveryRing';
import RecoveryStrip from '../components/home/RecoveryStrip';
import LatestWorkoutCard from '../components/workouts/LatestWorkoutCard';

// Activity type matchers — keep in sync with metricResolver.ts
const isBasketball = (n: string | null) => !!n && /basketball/i.test(n);
const isClimbing   = (n: string | null) => !!n && /climb|boulder/i.test(n);
const isSoccer     = (n: string | null) => !!n && /soccer/i.test(n);
const isGolf       = (n: string | null) => !!n && /golf/i.test(n);
const isLifting    = (n: string | null) => !!n && /push|pull|legs?\b|gym\b|bench|full body|upper|lower|squat|deadlift/i.test(n);
const isCardioOther = (n: string | null) => !!n && /walk|hike|hiking|run\b|running|cycling|bike/i.test(n);

interface Workout {
  id: string;
  date: string;
  name: string | null;
  duration_min: number | null;
  notes: string | null;
  source?: 'manual' | 'google_health' | 'agent';
  activity_type?: string | null;
  review_status?: 'needs_review' | 'confirmed';
  avg_hr?: number | null;
  max_hr?: number | null;
  session_start?: string | null;
}

const SportWidget: React.FC<{
  icon: React.ReactNode;
  label: string;
  color: string;
  workouts: Workout[];
  matcher: (n: string | null) => boolean;
}> = ({ icon, label, color, workouts, matcher }) => {
  const today = useMemo(() => new Date(), []);
  const filt = workouts.filter(w => matcher(w.name));

  const cnt = (days: number) => {
    const cutoff = format(subDays(today, days - 1), 'yyyy-MM-dd');
    return filt.filter(w => w.date >= cutoff).length;
  };
  const hrs = (days: number) => {
    const cutoff = format(subDays(today, days - 1), 'yyyy-MM-dd');
    return filt
      .filter(w => w.date >= cutoff && w.duration_min)
      .reduce((s, w) => s + (w.duration_min as number), 0) / 60;
  };

  return (
    <Card sx={{ '&:hover': { transform: 'none' }, height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box sx={{ color }}>{icon}</Box>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2 }}>{label}</Typography>
        </Box>
        <Typography variant="h3" fontWeight={700} sx={{ color, lineHeight: 1 }}>{cnt(7)}</Typography>
        <Typography variant="caption" color="text.secondary">sessions this week</Typography>

        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
            <Stat label="Last 30d"  value={`${cnt(30)} sess`}  sub={`${hrs(30).toFixed(1)}h`} />
            <Stat label="Last 90d"  value={`${cnt(90)} sess`}  sub={`${hrs(90).toFixed(1)}h`} />
            <Stat label="Last year" value={`${cnt(365)} sess`} sub={`${hrs(365).toFixed(1)}h`} />
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
};

const Stat: React.FC<{ label: string; value: string; sub: string }> = ({ label, value, sub }) => (
  <Box>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{label}</Typography>
    <Typography variant="body2" fontWeight={600}>{value}</Typography>
    <Typography variant="caption" color="text.secondary">{sub}</Typography>
  </Box>
);

// Fitbit-derived sessions the trainer hasn't tagged yet. Prompts Harry to tell
// the agent what they were ("I played basketball") so they get named + confirmed.
const PLACEHOLDER_NAME = 'Active session (needs review)';
const NeedsReviewCard: React.FC<{ workouts: Workout[] }> = ({ workouts }) => {
  // "Named = tagged": a session only truly needs review if it still has the
  // auto-generated placeholder name. Once it has a real name it's effectively tagged.
  const pending = workouts.filter(
    w => w.review_status === 'needs_review' && (!w.name || w.name === PLACEHOLDER_NAME),
  );
  if (pending.length === 0) return null;

  return (
    <Card sx={{ mb: 3, borderLeft: '3px solid #FF9800' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="subtitle2" fontWeight={700}>
            {pending.length} session{pending.length > 1 ? 's' : ''} to tag
          </Typography>
          <Chip size="small" label="from Fitbit" sx={{ height: 18, fontSize: '0.6rem' }} />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          Auto-detected from your active minutes. Tell the trainer what each was (e.g. "I played
          basketball") and it'll name + tag them.
        </Typography>
        <Stack spacing={1}>
          {pending.map(w => {
            const t = w.session_start ? format(new Date(w.session_start), 'MMM d, h:mm a') : w.date;
            return (
              <Box key={w.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Typography variant="body2" fontWeight={600}>{t}</Typography>
                <Typography variant="caption" color="text.secondary">
                  ~{w.duration_min ?? '?'} min
                  {w.avg_hr ? ` · HR ${w.avg_hr}${w.max_hr ? `/${w.max_hr}` : ''}` : ''}
                </Typography>
              </Box>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
};

const WorkoutsPage: React.FC = () => {
  const { data: workouts, loading: wLoading } = useSupabase<Workout>({
    table: 'workouts',
    order: { column: 'date', ascending: false },
    limit: 500,
  });
  const { data: exercises, loading: eLoading } = useSupabase<ExerciseSet & { workout_id: string }>({
    table: 'workout_exercises',
    limit: 2000,
    skipUserFilter: true, // joins via workout_id, no user_id column
  });

  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [tab, setTab] = useState<'overview' | 'lifting' | 'golf'>('overview');

  // Workout intensity heatmap — duration (or count) per day
  const workoutHeatmap: HeatmapEntry[] = useMemo(() => {
    const byDay = new Map<string, { mins: number; count: number }>();
    for (const w of workouts) {
      const cur = byDay.get(w.date) ?? { mins: 0, count: 0 };
      cur.mins += w.duration_min ?? 0;
      cur.count += 1;
      byDay.set(w.date, cur);
    }
    return Array.from(byDay.entries()).map(([date, { mins, count }]) => ({
      date,
      value: mins > 0 ? mins : count * 30, // fall back to ~30min per session if duration unset
      label: mins > 0 ? `${mins} min · ${count} session${count > 1 ? 's' : ''}` : `${count} session${count > 1 ? 's' : ''}`,
    }));
  }, [workouts]);

  // Join exercises to workout dates for analytics
  const setsWithDate = useMemo<SetWithDate[]>(() => {
    const dateMap = new Map<string, string>();
    for (const w of workouts) dateMap.set(w.id, w.date);
    return exercises
      .map(s => ({ ...s, date: dateMap.get(s.workout_id) || '' }))
      .filter(s => s.date) as SetWithDate[];
  }, [workouts, exercises]);

  // Lifting sessions per week (for the sessions trend chart)
  const liftingTrend = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const w of workouts) {
      if (!isLifting(w.name)) continue;
      const wkStart = format(startOfWeek(new Date(w.date + 'T00:00:00'), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      buckets.set(wkStart, (buckets.get(wkStart) ?? 0) + 1);
    }
    const arr = [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([wk, n]) => ({ week: wk, sessions: n }));
    // Compute 4-week and 12-week trailing moving averages
    const out = arr.map((row, i) => {
      const last4 = arr.slice(Math.max(0, i - 3), i + 1);
      const last12 = arr.slice(Math.max(0, i - 11), i + 1);
      return {
        week: row.week,
        sessions: row.sessions,
        ma4: last4.reduce((s, r) => s + r.sessions, 0) / last4.length,
        ma12: last12.reduce((s, r) => s + r.sessions, 0) / last12.length,
      };
    });
    return out;
  }, [workouts]);

  const topLifts = useMemo(() => topExercisesByVolume(setsWithDate, 8).filter(e => e.sessions >= 3), [setsWithDate]);

  // Default selected exercise = top lift
  const activeExercise = selectedExercise || topLifts[0]?.exercise || null;
  const exerciseSessions = useMemo(
    () => activeExercise ? sessionsForExercise(setsWithDate, activeExercise) : [],
    [setsWithDate, activeExercise],
  );

  const recentPRs = useMemo(() => detectPRs(setsWithDate).slice(0, 8), [setsWithDate]);

  const loading = wLoading || eLoading;
  const fitnessContext = useMemo(() => {
    const recent = (workouts || []).slice(0, 12)
      .map((w: any) => `${w.date}: ${w.activity_type || w.name || 'workout'}${w.duration_min ? ' ' + w.duration_min + 'min' : ''}${w.avg_hr ? ' avgHR ' + w.avg_hr : ''}`).join('; ');
    return `Fitness page. Recent workouts: ${recent || 'none'}.`;
  }, [workouts]);

  if (loading) return <LoadingSkeleton variant="card" count={3} />;

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Fitness</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Recovery, workouts, sport sessions, golf, lifting trends, and personal records
          </Typography>
        </Box>
        <AskSpecialistButton context={fitnessContext} />
      </Box>

      {/* Tabs: Overview / Lifting / Golf */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, borderBottom: '1px solid rgba(255,255,255,0.08)', minHeight: 40 }}
      >
        <Tab value="overview" label="Overview" sx={{ textTransform: 'none', minHeight: 40 }} />
        <Tab value="lifting" label="Lifting" sx={{ textTransform: 'none', minHeight: 40 }} />
        <Tab value="golf" label="Golf" sx={{ textTransform: 'none', minHeight: 40 }} />
      </Tabs>

      {tab === 'overview' && (
      <>
      {/* Latest readings — recovery score + recovery vitals */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 5 }}>
          <RecoveryRing />
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <RecoveryStrip />
        </Grid>
      </Grid>

      {/* Latest workout */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <LatestWorkoutCard />
        </Grid>
      </Grid>

      {/* Fitbit-derived sessions awaiting a tag */}
      <NeedsReviewCard workouts={workouts} />

      {/* Trainer voice + insights (collapsible) */}
      <CollapsibleSection title="Your trainer & training insights">
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, md: 6 }}>
            <AgentVoiceCard agentId="trainer" />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <InsightsFeed
              agentId="trainer"
              kinds={['milestone', 'pattern', 'anomaly', 'recommendation', 'warning']}
              limit={5}
              title="Training insights"
              emptyMessage="Trainer is tracking PRs and volume — nothing notable yet."
            />
          </Grid>
        </Grid>
      </CollapsibleSection>

      {/* Sport widgets */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <SportWidget icon={<FitnessCenter />} label="Lifting" color="#E57373" workouts={workouts} matcher={isLifting} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <SportWidget icon={<SportsBasketball />} label="Basketball" color="#FF9800" workouts={workouts} matcher={isBasketball} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <SportWidget icon={<DirectionsRun />} label="Soccer" color="#4CAF50" workouts={workouts} matcher={isSoccer} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <SportWidget icon={<Terrain />} label="Climbing" color="#5B8DEF" workouts={workouts} matcher={isClimbing} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <SportWidget icon={<GolfCourse />} label="Golf" color="#43A047" workouts={workouts} matcher={isGolf} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <SportWidget icon={<DirectionsRun />} label="Other cardio" color="#90CAF9" workouts={workouts} matcher={isCardioOther} />
        </Grid>
      </Grid>
      </>
      )}

      {tab === 'golf' && <GolfSection />}

      {tab === 'lifting' && (
      <Grid container spacing={2.5}>
        {/* Sessions trend */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ '&:hover': { transform: 'none' } }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
                <Typography variant="h6">Lifting sessions per week</Typography>
                <Stack direction="row" spacing={1.5}>
                  <LegendDot color="#5B8DEF" label="Sessions" />
                  <LegendDot color="#FF9800" label="4-wk avg" />
                  <LegendDot color="#4CAF50" label="12-wk avg" />
                </Stack>
              </Box>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={liftingTrend}>
                  <defs>
                    <linearGradient id="liftGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#5B8DEF" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#5B8DEF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="week" tickFormatter={v => format(new Date(v + 'T00:00:00'), 'MMM d')} stroke="rgba(255,255,255,0.12)" tickLine={false} tick={{ fill: "#8b96a5", fontSize: 10 }} />
                  <YAxis stroke="rgba(255,255,255,0.12)" tickLine={false} tick={{ fill: "#8b96a5", fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    labelFormatter={v => `Week of ${format(new Date(v + 'T00:00:00'), 'MMM d, yyyy')}`}
                    contentStyle={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }} itemStyle={{ color: "#e6edf3" }} labelStyle={{ color: "#8b96a5", fontWeight: 600 }}
                  />
                  <Area type="monotone" dataKey="sessions" name="Sessions" stroke="#5B8DEF" fill="url(#liftGrad)" strokeWidth={2} />
                  <Line type="monotone" dataKey="ma4" name="4-wk avg" stroke="#FF9800" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="ma12" name="12-wk avg" stroke="#4CAF50" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent PRs feed */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ '&:hover': { transform: 'none' }, height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <EmojiEvents sx={{ color: '#FFB74D', fontSize: 20 }} />
                <Typography variant="h6">Recent PRs</Typography>
              </Box>
              {recentPRs.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No PRs detected yet. Log more sets to start tracking est. 1RM progression.
                </Typography>
              ) : (
                <Stack spacing={1.25}>
                  {recentPRs.map((pr, i) => (
                    <Box key={i} sx={{ p: 1.25, borderRadius: 2, bgcolor: 'rgba(255,183,77,0.06)', border: '1px solid rgba(255,183,77,0.18)' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <Typography variant="body2" fontWeight={600}>{pr.exercise}</Typography>
                        <Typography variant="caption" color="text.secondary">{formatDateShort(pr.date)}</Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: '#FFB74D' }}>
                        Est. 1RM {Math.round(pr.best1RM)}lb
                        {pr.improvementPct !== null && ` (+${pr.improvementPct.toFixed(1)}% vs ${Math.round(pr.prevBest1RM!)}lb)`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Top set: {pr.topWeight}lb × {pr.topWeightReps}r
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Per-lift progression */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ '&:hover': { transform: 'none' } }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                <Typography variant="h6">Lift progression</Typography>
                <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                  {topLifts.map(l => (
                    <Chip
                      key={l.exercise}
                      label={`${l.exercise} (${l.sessions})`}
                      size="small"
                      onClick={() => setSelectedExercise(l.exercise)}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: activeExercise === l.exercise ? 'rgba(91,141,239,0.18)' : 'rgba(255,255,255,0.04)',
                        color: activeExercise === l.exercise ? '#5B8DEF' : 'text.primary',
                        border: activeExercise === l.exercise ? '1px solid rgba(91,141,239,0.5)' : '1px solid rgba(255,255,255,0.08)',
                      }}
                    />
                  ))}
                </Stack>
              </Box>

              {exerciseSessions.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No sessions logged for this lift yet.</Typography>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={exerciseSessions}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" tickFormatter={v => format(new Date(v + 'T00:00:00'), 'MMM d')} stroke="rgba(255,255,255,0.12)" tickLine={false} tick={{ fill: "#8b96a5", fontSize: 10 }} />
                    <YAxis yAxisId="left"  stroke="rgba(255,255,255,0.12)" tickLine={false} tick={{ fill: "#8b96a5", fontSize: 10 }} label={{ value: 'Est. 1RM (lb)', angle: -90, position: 'insideLeft', fill: '#7d8590', fontSize: 11 }} />
                    <YAxis yAxisId="right" stroke="rgba(255,255,255,0.12)" tickLine={false} tick={{ fill: "#8b96a5", fontSize: 10 }} orientation="right" label={{ value: 'Volume (lb)', angle: 90, position: 'insideRight', fill: '#7d8590', fontSize: 11 }} />
                    <Tooltip
                      labelFormatter={v => format(new Date(v + 'T00:00:00'), 'MMM d, yyyy')}
                      formatter={(v: number, name: string) => [Math.round(v), name]}
                      contentStyle={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }} itemStyle={{ color: "#e6edf3" }} labelStyle={{ color: "#8b96a5", fontWeight: 600 }}
                    />
                    <Line yAxisId="left"  type="monotone" dataKey="best1RM" name="Est. 1RM" stroke="#5B8DEF" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line yAxisId="right" type="monotone" dataKey="volume" name="Volume" stroke="#764ba2" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {workoutHeatmap.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Card sx={{ '&:hover': { transform: 'none' } }}>
              <CardContent>
                <ActivityHeatmap
                  data={workoutHeatmap}
                  days={84}
                  fillColor="#4CAF50"
                  title="Training intensity over 12 weeks"
                  thresholds={[20, 45, 75, 120]}
                  legend="Darker = more minutes (or sessions). Empty = rest day."
                />
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
      )}
    </Box>
  );
};

const LegendDot: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
    <Typography variant="caption" color="text.secondary">{label}</Typography>
  </Box>
);

export default WorkoutsPage;
