import React, { useMemo } from 'react';
import { Box, Typography, Grid, Card, CardContent, Chip, Stack, Alert } from '@mui/material';
import { Bedtime, Restaurant, FitnessCenter, SentimentSatisfied, WaterDrop } from '@mui/icons-material';
import { format } from 'date-fns';
import { useSleep } from '../hooks/useSleep';
import { useNutrition } from '../hooks/useNutrition';
import { useWorkouts } from '../hooks/useWorkouts';
import { useDailyLogs } from '../hooks/useDailyLogs';
import { useSupabase } from '../hooks/useSupabase';
import { calculateLifeScore, getScoreColor, getScoreLabel } from '../lib/scores';
import { formatNumber, getToday } from '../lib/formatters';
import ScoreRing from '../components/common/ScoreRing';
import StatCard from '../components/common/StatCard';
import LoadingSkeleton from '../components/common/LoadingSkeleton';

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 18) return 'Good Afternoon';
  if (hour >= 18 && hour < 22) return 'Good Evening';
  return 'Good Night';
};

const HomePage: React.FC = () => {
  const { lastNight, data: sleepData, loading: sleepLoading } = useSleep('7d');
  const { todayMacros, dailyMacros, loading: nutritionLoading } = useNutrition('7d');
  const { workouts, loading: workoutsLoading } = useWorkouts('7d');
  const { today: todayLog, data: logs, loading: logsLoading } = useDailyLogs('7d');
  const { data: hydrationData } = useSupabase<{ date: string; total_oz: number }>({ table: 'daily_hydration', isView: true });

  const loading = sleepLoading || nutritionLoading || workoutsLoading || logsLoading;

  const todayStr = getToday();
  const todayWorkout = workouts.find(w => w.date === todayStr);
  const todayHydration = hydrationData.find(h => h.date === todayStr);

  const lifeScore = useMemo(() => {
    return calculateLifeScore({
      sleep: lastNight ? { hours: lastNight.hours, quality: lastNight.quality } : undefined,
      nutrition: todayMacros.total_calories > 0 ? { calories: todayMacros.total_calories, protein: todayMacros.total_protein } : undefined,
      exerciseDone: !!todayWorkout,
      mood: todayLog?.mood,
      hydration: todayHydration?.total_oz,
      journalDone: !!todayLog?.journal,
    });
  }, [lastNight, todayMacros, todayWorkout, todayLog, todayHydration]);

  const missing: string[] = [];
  if (!lastNight || lastNight.date !== todayStr) missing.push('Sleep');
  if (todayMacros.total_calories === 0) missing.push('Meals');
  if (!todayWorkout) missing.push('Workout');
  if (!todayLog?.mood) missing.push('Mood');
  if (!todayHydration) missing.push('Hydration');
  if (!todayLog?.journal) missing.push('Journal');

  if (loading) return <LoadingSkeleton variant="card" count={4} />;

  return (
    <Box>
      {/* Greeting Header — gradient text like personalos */}
      <Box sx={{ mb: 3, mt: -1 }}>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 700,
            background: (theme: any) =>
              `linear-gradient(135deg, ${theme.palette.primary.main} 0%, color-mix(in srgb, ${theme.palette.primary.main} 70%, #a855f7) 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {getGreeting()}, Harry
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mt: 0.5, fontSize: '1rem', fontWeight: 500 }}
        >
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </Typography>
      </Box>

      {/* Life Score + Breakdown */}
      <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ textAlign: 'center', py: 3 }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary">Life Score</Typography>
              <Box sx={{ my: 2 }}>
                <ScoreRing value={lifeScore.total} size={160} strokeWidth={12} color={getScoreColor(lifeScore.total)} />
              </Box>
              <Typography variant="h6" sx={{ color: getScoreColor(lifeScore.total) }}>
                {getScoreLabel(lifeScore.total)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Score Breakdown</Typography>
              <Grid container spacing={2}>
                {[
                  { label: 'Sleep', value: lifeScore.sleep, max: 20, color: '#5B8DEF' },
                  { label: 'Nutrition', value: lifeScore.nutrition, max: 20, color: '#4CAF50' },
                  { label: 'Exercise', value: lifeScore.exercise, max: 20, color: '#FF9800' },
                  { label: 'Mood', value: lifeScore.mood, max: 15, color: '#764ba2' },
                  { label: 'Hydration', value: lifeScore.hydration, max: 15, color: '#90CAF9' },
                  { label: 'Journal', value: lifeScore.journal, max: 10, color: '#E57373' },
                ].map((item) => (
                  <Grid size={{ xs: 4, sm: 2 }} key={item.label}>
                    <ScoreRing value={item.value} maxValue={item.max} size={70} strokeWidth={6} color={item.color} label={item.label} />
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Today's Snapshot */}
        <Grid size={{ xs: 12 }}>
          <Typography variant="overline" sx={{ letterSpacing: 1.5 }}>Today's Snapshot</Typography>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard title="Sleep" value={lastNight ? `${lastNight.hours.toFixed(1)}h` : '--'} subtitle={lastNight ? `Quality: ${lastNight.quality}/5` : 'Not logged'} color="#5B8DEF" icon={<Bedtime />} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard title="Calories" value={todayMacros.total_calories ? formatNumber(todayMacros.total_calories) : '--'} subtitle="/ 2,250 target" color="#4CAF50" icon={<Restaurant />} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard title="Protein" value={todayMacros.total_protein ? `${formatNumber(todayMacros.total_protein)}g` : '--'} subtitle="/ 170g target" color="#FF9800" icon={<Restaurant />} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard title="Workout" value={todayWorkout ? '✓' : '—'} subtitle={todayWorkout?.name || 'Not logged'} color={todayWorkout ? '#4CAF50' : '#7d8590'} icon={<FitnessCenter />} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard title="Mood" value={todayLog?.mood ? `${todayLog.mood}/5` : '--'} subtitle={todayLog?.energy ? `Energy: ${todayLog.energy}/5` : ''} color="#764ba2" icon={<SentimentSatisfied />} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard title="Hydration" value={todayHydration ? `${formatNumber(todayHydration.total_oz)} oz` : '--'} subtitle="/ 100 oz target" color="#90CAF9" icon={<WaterDrop />} />
        </Grid>

        {/* Missing Today */}
        {missing.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Alert severity="info" sx={{ borderRadius: 3, bgcolor: 'rgba(91, 141, 239, 0.08)', border: '1px solid rgba(91, 141, 239, 0.2)' }}>
              <Typography variant="subtitle2" gutterBottom>Missing today:</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {missing.map(m => <Chip key={m} label={m} size="small" variant="outlined" />)}
              </Stack>
            </Alert>
          </Grid>
        )}

        {/* 7-Day Trends */}
        <Grid size={{ xs: 12 }}>
          <Typography variant="overline" sx={{ letterSpacing: 1.5 }}>7-Day Trends</Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard title="Sleep Hours" value={lastNight ? `${lastNight.hours.toFixed(1)}h` : '--'} trend={sleepData.slice().reverse()} trendKey="hours" color="#5B8DEF" />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard title="Calories" value={todayMacros.total_calories ? formatNumber(todayMacros.total_calories) : '--'} trend={dailyMacros.slice().reverse()} trendKey="total_calories" color="#4CAF50" />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard title="Mood" value={todayLog?.mood ? `${todayLog.mood}/5` : '--'} trend={logs.slice().reverse()} trendKey="mood" color="#764ba2" />
        </Grid>
      </Grid>
    </Box>
  );
};

export default HomePage;
