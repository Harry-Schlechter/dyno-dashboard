import React from 'react';
import { Box, Typography, Grid, Card, CardContent, Stack, Chip, Alert } from '@mui/material';
import { format } from 'date-fns';
import { useLifeScore } from '../hooks/useLifeScore';
import LifeScoreTile from '../components/home/LifeScoreTile';
import NetWorthWidget from '../components/home/NetWorthWidget';
import SleepWidget from '../components/home/SleepWidget';
import MealsCaloriesWidget from '../components/home/MealsCaloriesWidget';
import WeekSpendWidget from '../components/home/WeekSpendWidget';
import DailySummaryStrip from '../components/home/DailySummaryStrip';
import LoadingSkeleton from '../components/common/LoadingSkeleton';

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 18) return 'Good Afternoon';
  if (hour >= 18 && hour < 22) return 'Good Evening';
  return 'Good Night';
};

const HomePage: React.FC = () => {
  const { results, loading, error, goalsTableMissing } = useLifeScore();

  if (loading) return <LoadingSkeleton variant="card" count={4} />;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>{getGreeting()}, Harry</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </Typography>
      </Box>

      {goalsTableMissing && (
        <Alert severity="info" sx={{ mb: 3 }}>
          The <code>goals</code> table doesn't exist yet. Run{' '}
          <code>migrations/001_goals.sql</code> in Supabase to enable Life Score, then have your
          AI agent populate it.
        </Alert>
      )}

      {error && !goalsTableMissing && (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      )}

      {/* 4 Life Score tiles */}
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5, display: 'block', mb: 1 }}>
        Life Score
      </Typography>
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <LifeScoreTile result={results[0]} emphasized />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <LifeScoreTile result={results[1]} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <LifeScoreTile result={results[2]} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <LifeScoreTile result={results[3]} />
        </Grid>
      </Grid>

      {/* Yesterday at a glance — single-line strip */}
      <Box sx={{ mb: 3 }}>
        <DailySummaryStrip />
      </Box>

      {/* Yesterday's daily-goal breakdown — surface what drove the daily score */}
      {results[0].goalScores.length > 0 && (
        <Card sx={{ mb: 3, '&:hover': { transform: 'none' } }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>
              Yesterday's goals
            </Typography>
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              {results[0].goalScores.map(gs => {
                const score = gs.score;
                const color = score === null
                  ? '#7d8590'
                  : score >= 80 ? '#4CAF50' : score >= 60 ? '#5B8DEF' : score >= 40 ? '#FF9800' : '#F44336';
                const targetLabel = (() => {
                  switch (gs.goal.target_type) {
                    case 'min': return `≥ ${gs.goal.target_value}`;
                    case 'max': return `≤ ${gs.goal.target_value}`;
                    case 'band': return `${gs.goal.target_value}–${gs.goal.target_max}`;
                  }
                })();
                const isAbsolved = !!gs.absolvedBy?.length;
                const isContextOnly = !!gs.goal.score_only_for_absolution;
                return (
                  <Box key={gs.goal.id} sx={{ opacity: isAbsolved || isContextOnly ? 0.55 : 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.25 }}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'baseline', flexWrap: 'wrap' }}>
                        <Typography variant="body2" fontWeight={500}>{gs.goal.label}</Typography>
                        <Typography variant="caption" color="text.secondary">target {targetLabel}</Typography>
                        {isAbsolved && (
                          <Chip
                            label={`absolved by ${gs.absolvedBy!.join(', ')}`}
                            size="small"
                            sx={{ height: 16, fontSize: '0.6rem', bgcolor: 'rgba(91,141,239,0.12)', color: '#5B8DEF', border: '1px solid rgba(91,141,239,0.3)' }}
                          />
                        )}
                        {isContextOnly && (
                          <Chip
                            label="context only"
                            size="small"
                            sx={{ height: 16, fontSize: '0.6rem', bgcolor: 'rgba(125,133,144,0.15)', color: 'text.secondary' }}
                          />
                        )}
                      </Box>
                      <Stack direction="row" spacing={1.5} alignItems="baseline">
                        <Typography variant="caption" color="text.secondary">
                          {gs.actual !== null ? gs.actual.toLocaleString(undefined, { maximumFractionDigits: 1 }) : 'no data'}
                        </Typography>
                        {score !== null && (
                          <Chip
                            label={`${Math.round(score)}`}
                            size="small"
                            sx={{
                              height: 20, fontSize: '0.7rem', fontWeight: 700,
                              color, bgcolor: `${color}22`, border: `1px solid ${color}44`,
                            }}
                          />
                        )}
                      </Stack>
                    </Box>
                    <Box
                      sx={{
                        height: 4, borderRadius: 2,
                        bgcolor: 'rgba(255,255,255,0.05)',
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          height: '100%',
                          width: `${Math.min(100, score ?? 0)}%`,
                          bgcolor: color,
                          transition: 'width 0.4s',
                        }}
                      />
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Net worth + contextual widgets */}
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5, display: 'block', mb: 1 }}>
        At a glance
      </Typography>
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 6 }}>
          <NetWorthWidget />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <SleepWidget />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <MealsCaloriesWidget />
        </Grid>
        <Grid size={{ xs: 12, sm: 12, md: 2 }}>
          <WeekSpendWidget />
        </Grid>
      </Grid>
    </Box>
  );
};

export default HomePage;
