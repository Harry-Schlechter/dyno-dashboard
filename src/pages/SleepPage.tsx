import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Grid, Card, CardContent,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';
import { useSleep } from '../hooks/useSleep';
import { useDailyLogs } from '../hooks/useDailyLogs';
import { formatDate, formatDateShort, formatTime, formatDuration } from '../lib/formatters';
import ScoreRing from '../components/common/ScoreRing';
import StatCard from '../components/common/StatCard';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorMessage from '../components/common/ErrorMessage';

const SleepPage: React.FC = () => {
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const { data: sleepData, lastNight, averages, loading, error, refetch } = useSleep(range);
  useDailyLogs(range);

  const chartData = useMemo(() => {
    return sleepData.slice().reverse().map(s => ({
      date: formatDateShort(s.date),
      hours: s.hours,
      quality: s.quality,
      deep: s.deep_sleep_min,
      rem: s.rem_sleep_min,
    }));
  }, [sleepData]);

  if (loading) return <LoadingSkeleton variant="card" count={3} />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Sleep</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Sleep quality and patterns</Typography>
        </Box>
        <ToggleButtonGroup value={range} exclusive onChange={(_, v) => v && setRange(v)} size="small">
          <ToggleButton value="7d">7D</ToggleButton>
          <ToggleButton value="30d">30D</ToggleButton>
          <ToggleButton value="90d">90D</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
        {/* Last Night */}
        {lastNight && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Last Night</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
                  <ScoreRing value={lastNight.quality} maxValue={5} size={100} strokeWidth={8} color="#5B8DEF" label="Quality" />
                  <Box>
                    <Typography variant="h4" fontWeight={700}>{lastNight.hours.toFixed(1)}h</Typography>
                    <Typography variant="body2" color="text.secondary">{formatDate(lastNight.date)}</Typography>
                  </Box>
                </Box>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">Bedtime</Typography>
                    <Typography variant="body1" fontWeight={600}>{lastNight.went_to_bed_at ? formatTime(lastNight.went_to_bed_at) : '--'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">Wake Time</Typography>
                    <Typography variant="body1" fontWeight={600}>{lastNight.woke_up_at ? formatTime(lastNight.woke_up_at) : '--'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <Typography variant="caption" color="text.secondary">Deep</Typography>
                    <Typography variant="body1" fontWeight={600} color="#5B8DEF">{lastNight.deep_sleep_min ? formatDuration(lastNight.deep_sleep_min) : '--'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <Typography variant="caption" color="text.secondary">REM</Typography>
                    <Typography variant="body1" fontWeight={600} color="#764ba2">{lastNight.rem_sleep_min ? formatDuration(lastNight.rem_sleep_min) : '--'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <Typography variant="caption" color="text.secondary">Core</Typography>
                    <Typography variant="body1" fontWeight={600} color="#4CAF50">{lastNight.core_sleep_min ? formatDuration(lastNight.core_sleep_min) : '--'}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Averages */}
        {averages && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Averages ({range})</Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid size={{ xs: 6 }}>
                    <StatCard title="Avg Hours" value={averages.hours.toFixed(1) + 'h'} color="#5B8DEF" />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <StatCard title="Avg Quality" value={averages.quality.toFixed(1) + '/5'} color="#764ba2" />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <StatCard title="Avg Deep" value={formatDuration(Math.round(averages.deep))} color="#4CAF50" />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <StatCard title="Avg REM" value={formatDuration(Math.round(averages.rem))} color="#FF9800" />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Sleep Hours Trend */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ '&:hover': { transform: 'none' } }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Sleep Hours</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="sleepGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5B8DEF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#5B8DEF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" stroke="#7d8590" fontSize={12} />
                  <YAxis stroke="#7d8590" fontSize={12} domain={[0, 12]} />
                  <Tooltip contentStyle={{ backgroundColor: '#121821', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
                  <Area type="monotone" dataKey="hours" stroke="#5B8DEF" fill="url(#sleepGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Quality Trend */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ '&:hover': { transform: 'none' } }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Sleep Quality</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" stroke="#7d8590" fontSize={12} />
                  <YAxis stroke="#7d8590" fontSize={12} domain={[0, 5]} />
                  <Tooltip contentStyle={{ backgroundColor: '#121821', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
                  <Line type="monotone" dataKey="quality" stroke="#764ba2" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Sleep Stages */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ '&:hover': { transform: 'none' } }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Sleep Stages</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" stroke="#7d8590" fontSize={12} />
                  <YAxis stroke="#7d8590" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#121821', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
                  <Area type="monotone" dataKey="deep" stackId="1" stroke="#5B8DEF" fill="#5B8DEF" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="rem" stackId="1" stroke="#764ba2" fill="#764ba2" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SleepPage;
