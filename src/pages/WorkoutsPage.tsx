import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useWorkouts } from '../hooks/useWorkouts';
import { formatDate, formatDuration, formatDateShort } from '../lib/formatters';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorMessage from '../components/common/ErrorMessage';

const WorkoutsPage: React.FC = () => {
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const { workouts, exercises, prs, loading, error, refetch } = useWorkouts(range);

  const workoutCards = useMemo(() => {
    return workouts.map(w => ({
      ...w,
      exercises: exercises.filter(e => e.workout_id === w.id),
    }));
  }, [workouts, exercises]);

  const volumeData = useMemo(() => {
    return workouts.slice().reverse().map(w => {
      const wExercises = exercises.filter(e => e.workout_id === w.id);
      const volume = wExercises.reduce((sum, e) => sum + (e.weight_lbs || 0) * (e.reps || 0), 0);
      return { date: formatDateShort(w.date), volume, name: w.name };
    });
  }, [workouts, exercises]);

  if (loading) return <LoadingSkeleton variant="card" count={3} />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h3" fontWeight={700}>Workouts</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Your training log and progress</Typography>
        </Box>
        <ToggleButtonGroup value={range} exclusive onChange={(_, v) => v && setRange(v)} size="small">
          <ToggleButton value="7d">7D</ToggleButton>
          <ToggleButton value="30d">30D</ToggleButton>
          <ToggleButton value="90d">90D</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Grid container spacing={3}>
        {/* Volume Trend */}
        {volumeData.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Card sx={{ '&:hover': { transform: 'none' } }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Volume Trend (lbs x reps)</Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={volumeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" stroke="#7d8590" fontSize={12} />
                    <YAxis stroke="#7d8590" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#121821', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
                    <Bar dataKey="volume" fill="#5B8DEF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* PRs Table */}
        {prs.length > 0 && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ '&:hover': { transform: 'none' } }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Exercise PRs</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Exercise</TableCell>
                        <TableCell align="right">Weight</TableCell>
                        <TableCell align="right">Reps</TableCell>
                        <TableCell align="right">Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {prs.slice(0, 15).map((pr, i) => (
                        <TableRow key={i}>
                          <TableCell>{pr.exercise_name}</TableCell>
                          <TableCell align="right">{pr.max_weight} lbs</TableCell>
                          <TableCell align="right">{pr.max_reps}</TableCell>
                          <TableCell align="right">{formatDateShort(pr.date)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Stats */}
        <Grid size={{ xs: 12, md: prs.length > 0 ? 6 : 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Summary</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h4" fontWeight={700} color="#5B8DEF">{workouts.length}</Typography>
                    <Typography variant="caption" color="text.secondary">Workouts</Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h4" fontWeight={700} color="#4CAF50">
                      {workouts.reduce((sum, w) => sum + (w.duration_min || 0), 0)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Total Minutes</Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Workout History Cards */}
        <Grid size={{ xs: 12 }}>
          <Typography variant="overline" sx={{ letterSpacing: 1.5 }}>Recent Workouts</Typography>
        </Grid>
        {workoutCards.map((w) => (
          <Grid size={{ xs: 12, md: 6 }} key={w.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>{w.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{formatDate(w.date)}</Typography>
                  </Box>
                  {w.duration_min && <Chip label={formatDuration(w.duration_min)} size="small" variant="outlined" />}
                </Box>
                {w.exercises.length > 0 && (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Exercise</TableCell>
                          <TableCell align="right">Set</TableCell>
                          <TableCell align="right">Reps</TableCell>
                          <TableCell align="right">Weight</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {w.exercises.map((e) => (
                          <TableRow key={e.id}>
                            <TableCell>
                              {e.exercise_name}
                              {e.is_pr && <Chip label="PR" size="small" color="warning" sx={{ ml: 1 }} />}
                            </TableCell>
                            <TableCell align="right">{e.set_number}</TableCell>
                            <TableCell align="right">{e.reps}</TableCell>
                            <TableCell align="right">{e.weight_lbs ? `${e.weight_lbs} lbs` : '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
                {w.notes && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{w.notes}</Typography>}
              </CardContent>
            </Card>
          </Grid>
        ))}
        {workouts.length === 0 && (
          <Grid size={{ xs: 12 }}>
            <Typography color="text.secondary">No workouts in this period</Typography>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default WorkoutsPage;
