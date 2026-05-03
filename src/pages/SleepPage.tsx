import React, { useMemo, useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Stack, ToggleButton, ToggleButtonGroup, Chip,
} from '@mui/material';
import { Bedtime, NightsStay, WbSunny } from '@mui/icons-material';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceArea, BarChart, Bar, Cell,
} from 'recharts';
import { format, subDays } from 'date-fns';
import { useSupabase } from '../hooks/useSupabase';
import {
  bedtimeMinutes, waketimeMinutes, midpointMinutes, circularStd, circularMean, SleepRow,
} from '../lib/metricResolver';
import LoadingSkeleton from '../components/common/LoadingSkeleton';

type Window = '7d' | '30d' | '90d' | '1y';
const WINDOW_DAYS: Record<Window, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };

const SLEEP_BANDS = [
  { min: 0,   max: 4,   label: '<4h disaster',  color: '#7d2424' },
  { min: 4,   max: 5,   label: '4-5h bad',       color: '#a83838' },
  { min: 5,   max: 6,   label: '5-6h not great', color: '#cc6633' },
  { min: 6,   max: 6.5, label: '6-6.5h low mid', color: '#d18a3d' },
  { min: 6.5, max: 7,   label: '6.5-7h high mid',color: '#c9a93b' },
  { min: 7,   max: 7.5, label: '7-7.5h better',  color: '#7eb058' },
  { min: 7.5, max: 8,   label: '7.5-8h good 9/10', color: '#4caf50' },
  { min: 8,   max: 24,  label: '8h+ great 10/10',  color: '#2e7d32' },
];

const colorForHours = (h: number | null): string => {
  if (h === null) return '#444';
  for (const b of SLEEP_BANDS) if (h >= b.min && h < b.max) return b.color;
  return '#2e7d32';
};

const minutesToClock = (m: number | null): string => {
  if (m === null || isNaN(m)) return '—';
  const h24 = Math.floor(m / 60) % 24;
  const min = Math.floor(m % 60);
  const ampm = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  return `${h12}:${min.toString().padStart(2, '0')} ${ampm}`;
};

const labelForStd = (std: number): { label: string; color: string } => {
  if (std < 15) return { label: 'rock solid', color: '#2e7d32' };
  if (std < 30) return { label: 'very consistent', color: '#4caf50' };
  if (std < 60) return { label: 'decent', color: '#c9a93b' };
  if (std < 90) return { label: 'inconsistent', color: '#d18a3d' };
  if (std < 120) return { label: 'bad', color: '#a83838' };
  return { label: 'chaos', color: '#7d2424' };
};

const SleepPage: React.FC = () => {
  const [win, setWin] = useState<Window>('30d');

  const { data, loading } = useSupabase<SleepRow>({
    table: 'sleep',
    order: { column: 'date', ascending: false },
    limit: 500,
  });

  const today = useMemo(() => new Date(), []);
  const windowStart = useMemo(() => format(subDays(today, WINDOW_DAYS[win] - 1), 'yyyy-MM-dd'), [today, win]);

  const filtered = useMemo(
    () => data.filter(d => d.date >= windowStart).sort((a, b) => a.date.localeCompare(b.date)),
    [data, windowStart],
  );

  const lastNight = data[0] ?? null;

  // Per-window stats
  const stats = useMemo(() => {
    const rows = filtered.filter(s => s.went_to_bed_at && s.woke_up_at);
    if (rows.length === 0) {
      const hoursOnly = filtered.filter(s => s.hours != null);
      return {
        n: hoursOnly.length,
        avgHours: hoursOnly.length ? hoursOnly.reduce((s, r) => s + (r.hours as number), 0) / hoursOnly.length : null,
        avgBedtime: null, avgWaketime: null, avgMidpoint: null,
        bedStd: null, wakeStd: null, midStd: null,
      };
    }
    const beds = rows.map(r => bedtimeMinutes(r.went_to_bed_at!));
    const wakes = rows.map(r => waketimeMinutes(r.woke_up_at!));
    const mids = rows.map(r => midpointMinutes(r.went_to_bed_at!, r.woke_up_at!));
    const hours = filtered.filter(s => s.hours != null).map(s => s.hours as number);
    return {
      n: rows.length,
      avgHours: hours.length ? hours.reduce((a, b) => a + b, 0) / hours.length : null,
      avgBedtime: circularMean(beds),
      avgWaketime: circularMean(wakes),
      avgMidpoint: circularMean(mids),
      bedStd: circularStd(beds),
      wakeStd: circularStd(wakes),
      midStd: circularStd(mids),
    };
  }, [filtered]);

  // Step-band histogram
  const histogram = useMemo(() => {
    const counts = SLEEP_BANDS.map(b => ({ ...b, count: 0 }));
    for (const r of filtered) {
      if (r.hours == null) continue;
      for (const b of counts) {
        if (r.hours >= b.min && r.hours < b.max) { b.count++; break; }
      }
    }
    return counts;
  }, [filtered]);

  // Bedtime/wake-time scatter data
  const scatterData = useMemo(() => {
    return filtered
      .filter(r => r.went_to_bed_at && r.woke_up_at)
      .map(r => {
        let bed = bedtimeMinutes(r.went_to_bed_at!);
        // Display 0-6am as 24-30 so the scatter doesn't wrap visually
        if (bed < 12 * 60) bed += 24 * 60;
        return {
          date: r.date,
          bedtime: bed,
          waketime: waketimeMinutes(r.woke_up_at!),
          hours: r.hours,
        };
      });
  }, [filtered]);

  const winLabel: Record<Window, string> = { '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days', '1y': 'Last year' };

  if (loading) return <LoadingSkeleton variant="card" count={3} />;

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Sleep</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Hours, bedtime, wake-time, and consistency
          </Typography>
        </Box>
        <ToggleButtonGroup size="small" exclusive value={win} onChange={(_, v) => v && setWin(v)}>
          <ToggleButton value="7d" sx={{ textTransform: 'none' }}>7d</ToggleButton>
          <ToggleButton value="30d" sx={{ textTransform: 'none' }}>30d</ToggleButton>
          <ToggleButton value="90d" sx={{ textTransform: 'none' }}>90d</ToggleButton>
          <ToggleButton value="1y" sx={{ textTransform: 'none' }}>1y</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Grid container spacing={2.5}>
        {/* Last night card */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ '&:hover': { transform: 'none' }, height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <NightsStay sx={{ fontSize: 18, color: '#764ba2' }} />
                <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>Last night</Typography>
              </Box>
              {!lastNight || lastNight.hours == null ? (
                <Typography variant="body2" color="text.secondary">No sleep logged</Typography>
              ) : (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    <Typography variant="h2" fontWeight={700} sx={{ color: colorForHours(lastNight.hours), lineHeight: 1 }}>
                      {lastNight.hours.toFixed(1)}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">hours</Typography>
                  </Box>
                  <Stack direction="row" spacing={3} sx={{ mt: 1.5 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Bedtime</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {lastNight.went_to_bed_at ? minutesToClock(bedtimeMinutes(lastNight.went_to_bed_at)) : '—'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Wake</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {lastNight.woke_up_at ? minutesToClock(waketimeMinutes(lastNight.woke_up_at)) : '—'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Midpoint</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {(lastNight.went_to_bed_at && lastNight.woke_up_at)
                          ? minutesToClock(midpointMinutes(lastNight.went_to_bed_at, lastNight.woke_up_at))
                          : '—'}
                      </Typography>
                    </Box>
                  </Stack>
                  <Chip
                    label={SLEEP_BANDS.find(b => lastNight.hours! >= b.min && lastNight.hours! < b.max)?.label || ''}
                    sx={{
                      mt: 2, height: 22, fontSize: '0.7rem',
                      bgcolor: `${colorForHours(lastNight.hours)}33`,
                      color: colorForHours(lastNight.hours),
                      border: `1px solid ${colorForHours(lastNight.hours)}66`,
                    }}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Averages table */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ '&:hover': { transform: 'none' }, height: '100%' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>
                Averages — {winLabel[win]}
              </Typography>
              <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                <Row label="Hours slept" value={stats.avgHours !== null ? `${stats.avgHours.toFixed(1)}h` : '—'} />
                <Row label="Bedtime" value={minutesToClock(stats.avgBedtime)} icon={<Bedtime sx={{ fontSize: 14, color: '#764ba2' }} />} />
                <Row label="Wake time" value={minutesToClock(stats.avgWaketime)} icon={<WbSunny sx={{ fontSize: 14, color: '#FFB74D' }} />} />
                <Row label="Midpoint of sleep" value={minutesToClock(stats.avgMidpoint)} />
                <Row label="Nights with full data" value={`${stats.n}`} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Consistency block */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ '&:hover': { transform: 'none' } }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                <Typography variant="h6">Consistency</Typography>
                {stats.bedStd !== null && (
                  <Chip
                    label={labelForStd((stats.bedStd + (stats.wakeStd ?? 0)) / 2).label}
                    sx={{
                      bgcolor: `${labelForStd((stats.bedStd + (stats.wakeStd ?? 0)) / 2).color}33`,
                      color: labelForStd((stats.bedStd + (stats.wakeStd ?? 0)) / 2).color,
                      border: `1px solid ${labelForStd((stats.bedStd + (stats.wakeStd ?? 0)) / 2).color}66`,
                      height: 24, fontWeight: 600,
                    }}
                  />
                )}
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mt: 1 }}>
                <ConsistencyStat label="Bedtime variance"  std={stats.bedStd}  />
                <ConsistencyStat label="Wake-time variance" std={stats.wakeStd} />
                <ConsistencyStat label="Midpoint variance"  std={stats.midStd}  />
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                Lower std deviation = more consistent. Sleep researchers consider midpoint variance the cleanest single measure of circadian regularity.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Step-band histogram */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ '&:hover': { transform: 'none' }, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Hours by score band</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={histogram} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis type="number" stroke="#7d8590" fontSize={11} />
                  <YAxis type="category" dataKey="label" stroke="#7d8590" fontSize={10} width={120} />
                  <Tooltip
                    formatter={(v: number) => [`${v} night${v === 1 ? '' : 's'}`, 'Count']}
                    contentStyle={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {histogram.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Bedtime/wake-time scatter */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ '&:hover': { transform: 'none' }, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Bedtime vs wake time</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    type="number" dataKey="bedtime" name="Bedtime"
                    domain={[18 * 60, 30 * 60]}
                    ticks={[18 * 60, 21 * 60, 24 * 60, 27 * 60, 30 * 60]}
                    tickFormatter={(v: number) => minutesToClock(v % (24 * 60))}
                    stroke="#7d8590" fontSize={10}
                  />
                  <YAxis
                    type="number" dataKey="waketime" name="Wake time"
                    domain={[6 * 60, 14 * 60]}
                    ticks={[6 * 60, 8 * 60, 10 * 60, 12 * 60, 14 * 60]}
                    tickFormatter={(v: number) => minutesToClock(v)}
                    stroke="#7d8590" fontSize={10}
                  />
                  <ZAxis type="number" dataKey="hours" range={[40, 200]} />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    formatter={(v: any, name: string) => {
                      if (name === 'Bedtime' || name === 'Wake time') return [minutesToClock(v % (24 * 60)), name];
                      if (name === 'hours') return [`${v}h`, 'Hours'];
                      return [v, name];
                    }}
                    labelFormatter={() => ''}
                    contentStyle={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}
                  />
                  <ReferenceArea x1={22 * 60} x2={25 * 60} y1={6 * 60} y2={9 * 60} fill="#4CAF50" fillOpacity={0.06} />
                  <Scatter data={scatterData} fill="#5B8DEF">
                    {scatterData.map((d, i) => <Cell key={i} fill={colorForHours(d.hours)} />)}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Each dot is one night. Green tint = healthy bedtime/wake band (10pm-1am / 6-9am).
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

const Row: React.FC<{ label: string; value: string; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      {icon}
      <Typography variant="body2" color="text.secondary">{label}</Typography>
    </Box>
    <Typography variant="body2" fontWeight={600}>{value}</Typography>
  </Box>
);

const ConsistencyStat: React.FC<{ label: string; std: number | null }> = ({ label, std }) => {
  const meta = std !== null ? labelForStd(std) : null;
  return (
    <Box sx={{ flex: 1 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
        <Typography variant="h4" fontWeight={700} sx={{ color: meta?.color ?? 'text.secondary' }}>
          {std !== null ? `${Math.round(std)}` : '—'}
        </Typography>
        {std !== null && <Typography variant="caption" color="text.secondary">min</Typography>}
      </Box>
    </Box>
  );
};

export default SleepPage;
