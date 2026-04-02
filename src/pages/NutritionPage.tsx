import React, { useState } from 'react';
import { Box, Typography, Grid, Card, CardContent, Chip, Stack, ToggleButton, ToggleButtonGroup, LinearProgress } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useNutrition } from '../hooks/useNutrition';
import { formatNumber, formatDateShort } from '../lib/formatters';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorMessage from '../components/common/ErrorMessage';

const CALORIE_TARGET = 2250;
const PROTEIN_TARGET = 170;

const NutritionPage: React.FC = () => {
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const { todayMeals, todayMacros, dailyMacros, loading, error, refetch } = useNutrition(range);

  if (loading) return <LoadingSkeleton variant="card" count={3} />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  const calPct = Math.min(100, (todayMacros.total_calories / CALORIE_TARGET) * 100);
  const protPct = Math.min(100, (todayMacros.total_protein / PROTEIN_TARGET) * 100);

  const chartData = dailyMacros.slice(0, range === '7d' ? 7 : range === '30d' ? 30 : 90).reverse().map(d => ({
    date: formatDateShort(d.date),
    calories: d.total_calories,
    protein: d.total_protein,
  }));

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Nutrition</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Track your daily intake and macro targets</Typography>
        </Box>
        <ToggleButtonGroup value={range} exclusive onChange={(_, v) => v && setRange(v)} size="small">
          <ToggleButton value="7d">7D</ToggleButton>
          <ToggleButton value="30d">30D</ToggleButton>
          <ToggleButton value="90d">90D</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
        {/* Today's Macros */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Today's Macros</Typography>
              <Stack spacing={3}>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">Calories</Typography>
                    <Typography variant="body2" fontWeight={600}>{formatNumber(todayMacros.total_calories)} / {formatNumber(CALORIE_TARGET)}</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={calPct} sx={{ height: 10, borderRadius: 5, bgcolor: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { bgcolor: calPct > 100 ? '#F44336' : '#4CAF50', borderRadius: 5 } }} />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">Protein</Typography>
                    <Typography variant="body2" fontWeight={600}>{formatNumber(todayMacros.total_protein)}g / {PROTEIN_TARGET}g</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={protPct} sx={{ height: 10, borderRadius: 5, bgcolor: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { bgcolor: '#FF9800', borderRadius: 5 } }} />
                </Box>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 4 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" fontWeight={700} color="#5B8DEF">{formatNumber(todayMacros.total_carbs)}g</Typography>
                      <Typography variant="caption" color="text.secondary">Carbs</Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" fontWeight={700} color="#FF9800">{formatNumber(todayMacros.total_fat)}g</Typography>
                      <Typography variant="caption" color="text.secondary">Fat</Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" fontWeight={700} color="#4CAF50">{formatNumber(todayMacros.total_protein)}g</Typography>
                      <Typography variant="caption" color="text.secondary">Protein</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Today's Meals */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Today's Meals</Typography>
              {todayMeals.length === 0 ? (
                <Typography color="text.secondary">No meals logged today</Typography>
              ) : (
                <Stack spacing={2}>
                  {todayMeals.map((meal) => (
                    <Box key={meal.id} sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Chip label={meal.meal_type} size="small" color="primary" variant="outlined" />
                        <Typography variant="body2" fontWeight={600}>{meal.calories} cal</Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{meal.description}</Typography>
                      <Stack direction="row" spacing={2}>
                        <Typography variant="caption" color="text.secondary">P: {meal.protein_g}g</Typography>
                        <Typography variant="caption" color="text.secondary">C: {meal.carbs_g}g</Typography>
                        <Typography variant="caption" color="text.secondary">F: {meal.fat_g}g</Typography>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Calorie Trend Chart */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ '&:hover': { transform: 'none' } }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Calorie Trend</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" stroke="#7d8590" fontSize={12} />
                  <YAxis stroke="#7d8590" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#121821', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
                  <Bar dataKey="calories" fill="#5B8DEF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Protein Trend */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ '&:hover': { transform: 'none' } }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Protein Trend</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" stroke="#7d8590" fontSize={12} />
                  <YAxis stroke="#7d8590" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#121821', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
                  <Bar dataKey="protein" fill="#FF9800" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default NutritionPage;
