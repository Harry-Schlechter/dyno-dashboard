import React, { useMemo } from 'react';
import { Card, CardContent, Typography, Box, Grid, Chip } from '@mui/material';
import { TrendingUp, TrendingDown, Remove, Favorite, MonitorHeart, Air, Bloodtype, Whatshot } from '@mui/icons-material';
import { format, subDays } from 'date-fns';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { useVitals, VitalsEntry } from '../../hooks/useVitals';

// Recovery-focused vitals from Fitbit/Pixel: the signals that actually answer
// "should I train hard or take it easy today?" — resting HR, HRV, SpO2, breathing.
// Mirrors VitalsStrip's tile look but uses daily latest + 7d-baseline framing.

interface Spec {
  label: string;
  icon: React.ReactNode;
  color: string;
  unit: string;
  current: number | null;
  baseline: number | null;      // 7-day rolling average, when available
  spark: { value: number }[];
  direction: 'up_good' | 'down_good' | 'neutral';
  fmt: (v: number) => string;
}

const dfmt = (d: Date) => format(d, 'yyyy-MM-dd');

const sparkOf = (rows: VitalsEntry[], get: (r: VitalsEntry) => number | null, end: Date, days = 14) => {
  const byDate = new Map<string, number>();
  for (const r of rows) {
    const v = get(r);
    if (v !== null && v !== undefined) byDate.set(r.date, v);
  }
  const out: { value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = dfmt(subDays(end, i));
    out.push({ value: byDate.get(d) ?? 0 });
  }
  return out;
};

const Tile: React.FC<{ spec: Spec }> = ({ spec }) => {
  const { label, icon, color, unit, current, baseline, spark, direction, fmt } = spec;
  const delta = current !== null && baseline !== null ? current - baseline : null;

  const trendColor = (() => {
    if (delta === null || Math.abs(delta) < (Math.abs(baseline ?? 0) * 0.02)) return 'text.secondary';
    if (direction === 'neutral') return 'text.secondary';
    const good = direction === 'up_good' ? delta > 0 : delta < 0;
    return good ? '#4CAF50' : '#FF9800';
  })();
  const TrendIcon = delta === null || Math.abs(delta) < (Math.abs(baseline ?? 0) * 0.02)
    ? Remove
    : delta > 0 ? TrendingUp : TrendingDown;

  return (
    <Card sx={{ '&:hover': { transform: 'none' }, height: '100%' }}>
      <CardContent sx={{ pb: '14px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
          <Box sx={{ color, display: 'flex' }}>{icon}</Box>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2, fontSize: '0.65rem' }}>
            {label}
          </Typography>
        </Box>

        {current === null ? (
          <>
            <Typography variant="h4" fontWeight={700} sx={{ color: 'text.secondary', lineHeight: 1 }}>—</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>No data yet</Typography>
          </>
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
              <Typography variant="h4" fontWeight={700} sx={{ color, lineHeight: 1 }}>{fmt(current)}</Typography>
              <Typography variant="caption" color="text.secondary">{unit}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.75 }}>
              <TrendIcon sx={{ fontSize: 14, color: trendColor }} />
              <Typography variant="caption" sx={{ color: trendColor, fontWeight: 600 }}>
                {delta === null ? '—' : `${delta >= 0 ? '+' : ''}${fmt(delta)} vs 7d avg`}
              </Typography>
            </Box>
          </>
        )}

        {spark.some((s) => s.value > 0) && (
          <Box sx={{ mt: 1, height: 28 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spark}>
                <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

const RecoveryStrip: React.FC = () => {
  const { data, latest, recovery } = useVitals('30d');
  const end = useMemo(() => new Date(), []);

  const specs = useMemo<Spec[]>(() => {
    if (!latest) return [];
    return [
      {
        label: 'Resting HR', icon: <Favorite sx={{ fontSize: 16 }} />, color: '#E57373', unit: 'bpm',
        current: latest.resting_hr, baseline: latest.resting_hr_7d_avg,
        spark: sparkOf(data, (r) => r.resting_hr, end), direction: 'down_good', fmt: (v) => v.toFixed(0),
      },
      {
        label: 'HRV', icon: <MonitorHeart sx={{ fontSize: 16 }} />, color: '#4CAF50', unit: 'ms',
        current: latest.hrv_rmssd, baseline: latest.hrv_rmssd_7d_avg,
        spark: sparkOf(data, (r) => r.hrv_rmssd, end), direction: 'up_good', fmt: (v) => v.toFixed(0),
      },
      {
        label: 'SpO₂', icon: <Bloodtype sx={{ fontSize: 16 }} />, color: '#5B8DEF', unit: '%',
        current: latest.spo2_avg, baseline: null,
        spark: sparkOf(data, (r) => r.spo2_avg, end), direction: 'up_good', fmt: (v) => v.toFixed(0),
      },
      {
        label: 'Breathing', icon: <Air sx={{ fontSize: 16 }} />, color: '#4DD0E1', unit: '/min',
        current: latest.breathing_rate_avg, baseline: null,
        spark: sparkOf(data, (r) => r.breathing_rate_avg, end), direction: 'neutral', fmt: (v) => v.toFixed(1),
      },
      {
        label: 'Skin Temp', icon: <Whatshot sx={{ fontSize: 16 }} />, color: '#FFB74D', unit: '°C dev',
        current: latest.skin_temp_deviation, baseline: null,
        spark: sparkOf(data, (r) => r.skin_temp_deviation, end), direction: 'neutral', fmt: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}`,
      },
      {
        label: 'Active Min', icon: <Whatshot sx={{ fontSize: 16 }} />, color: '#66BB6A', unit: 'min',
        current: latest.active_minutes_total, baseline: null,
        spark: sparkOf(data, (r) => r.active_minutes_total, end), direction: 'up_good', fmt: (v) => v.toFixed(0),
      },
    ];
  }, [latest, data, end]);

  if (!latest) return null;

  const recoveryChip = recovery && recovery.status !== 'neutral' ? (
    <Chip
      size="small"
      label={recovery.status === 'recovered' ? 'Recovered' : 'Strained'}
      sx={{
        ml: 1, height: 20, fontSize: '0.65rem', fontWeight: 700,
        bgcolor: recovery.status === 'recovered' ? 'rgba(76,175,80,0.15)' : 'rgba(255,152,0,0.15)',
        color: recovery.status === 'recovered' ? '#4CAF50' : '#FF9800',
      }}
    />
  ) : null;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>
          Recovery — latest reading
        </Typography>
        {recoveryChip}
      </Box>
      <Grid container spacing={{ xs: 1.5, sm: 2 }}>
        {specs.map((s) => (
          <Grid key={s.label} size={{ xs: 6, sm: 4, md: 2 }}>
            <Tile spec={s} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default RecoveryStrip;
