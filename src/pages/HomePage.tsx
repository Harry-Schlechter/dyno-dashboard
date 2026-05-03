import React, { useMemo } from 'react';
import { Box, Typography, Grid, Card, CardContent, Stack, Chip, Alert } from '@mui/material';
import { format, subDays } from 'date-fns';
import { useLifeScore } from '../hooks/useLifeScore';
import { useScoreSnapshot } from '../hooks/useScoreSnapshot';
import LifeScoreTile from '../components/home/LifeScoreTile';
import NetWorthWidget from '../components/home/NetWorthWidget';
import SleepWidget from '../components/home/SleepWidget';
import MealsCaloriesWidget from '../components/home/MealsCaloriesWidget';
import WeekSpendWidget from '../components/home/WeekSpendWidget';
import DailySummaryStrip from '../components/home/DailySummaryStrip';
import TodayNarrative from '../components/home/TodayNarrative';
import InsightsFeed from '../components/home/InsightsFeed';
import PersonaActivityStrip from '../components/home/PersonaActivityStrip';
import ActivityHeatmap, { HeatmapEntry } from '../components/common/ActivityHeatmap';
import LoadingSkeleton from '../components/common/LoadingSkeleton';

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 18) return 'Good afternoon';
  if (hour >= 18 && hour < 22) return 'Good evening';
  return 'Good night';
};

const HomePage: React.FC = () => {
  const { results, dailyScoreOn, loading, error, goalsTableMissing } = useLifeScore();

  const dailyResult = results[0];

  // Persist today's score so trend charts can read history
  useScoreSnapshot({
    score: dailyResult?.score ?? null,
    goalScores: dailyResult?.goalScores ?? [],
  });

  const scoreHeatmap: HeatmapEntry[] = useMemo(() => {
    const out: HeatmapEntry[] = [];
    for (let i = 0; i < 90; i++) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const s = dailyScoreOn(d);
      if (s !== null) out.push({ date: d, value: s, label: `score ${Math.round(s)}` });
    }
    return out;
  }, [dailyScoreOn]);

  if (loading) return <LoadingSkeleton variant="card" count={4} />;

  return (
    <Box>
      {/* Greeting */}
      <Box sx={{ mb: { xs: 2, sm: 3 } }}>
        <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
          {getGreeting()}, Harry
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </Typography>
      </Box>

      {goalsTableMissing && (
        <Alert severity="info" sx={{ mb: 2 }}>
          The <code>goals</code> table doesn't exist yet. Run{' '}
          <code>migrations/001_goals.sql</code> in Supabase to enable Life Score.
        </Alert>
      )}
      {error && !goalsTableMissing && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      {/* Two-column on desktop: narrative+score+widgets on left, insights on right.
          Stacks on mobile (insights first after narrative). */}
      <Grid container spacing={{ xs: 2, sm: 2.5 }}>
        {/* TODAY NARRATIVE — full width above the fold on mobile */}
        <Grid size={{ xs: 12 }}>
          <TodayNarrative />
        </Grid>

        {/* Left column: score + at-a-glance + activity */}
        <Grid size={{ xs: 12, lg: 8 }}>
          {/* Life Score tiles */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5, display: 'block', mb: 1 }}>
              Life Score
            </Typography>
            <Grid container spacing={{ xs: 1, sm: 2 }}>
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
          </Box>

          {/* Yesterday at a glance */}
          <Box sx={{ mb: 3 }}>
            <DailySummaryStrip />
          </Box>

          {/* Yesterday's daily-goal breakdown */}
          {dailyResult?.goalScores.length > 0 && (
            <Card sx={{ mb: 3, '&:hover': { transform: 'none' } }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>
                  Yesterday's goals
                </Typography>
                <Stack spacing={1.5} sx={{ mt: 1 }}>
                  {dailyResult.goalScores.map(gs => {
                    const score = gs.score;
                    const color = score === null
                      ? '#7d8590'
                      : score >= 80 ? '#4CAF50' : score >= 60 ? '#5B8DEF' : score >= 40 ? '#FF9800' : '#F44336';
                    const targetLabel = (() => {
                      switch (gs.goal.target_type) {
                        case 'min': return `≥ ${gs.goal.target_value}`;
                        case 'max': return `≤ ${gs.goal.target_value}`;
                        case 'band': return `${gs.goal.target_value}–${gs.goal.target_max}`;
                        default: return '';
                      }
                    })();
                    const isAbsolved = !!gs.absolvedBy?.length;
                    const isContextOnly = !!gs.goal.score_only_for_absolution;
                    return (
                      <Box key={gs.goal.id} sx={{ opacity: isAbsolved || isContextOnly ? 0.55 : 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.25, gap: 1 }}>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'baseline', flexWrap: 'wrap', minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={500} sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                              {gs.goal.label}
                            </Typography>
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
                          <Stack direction="row" spacing={1.5} alignItems="baseline" sx={{ flexShrink: 0 }}>
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
                        <Box sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                          <Box sx={{
                            height: '100%',
                            width: `${Math.min(100, score ?? 0)}%`,
                            bgcolor: color,
                            transition: 'width 0.4s',
                          }} />
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* At-a-glance widgets */}
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5, display: 'block', mb: 1 }}>
            At a glance
          </Typography>
          <Grid container spacing={{ xs: 1.5, sm: 2 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <NetWorthWidget />
            </Grid>
            <Grid size={{ xs: 6, sm: 6, md: 2 }} sx={{ minWidth: 0 }}>
              <SleepWidget />
            </Grid>
            <Grid size={{ xs: 6, sm: 6, md: 2 }} sx={{ minWidth: 0 }}>
              <MealsCaloriesWidget />
            </Grid>
            <Grid size={{ xs: 12, sm: 12, md: 2 }}>
              <WeekSpendWidget />
            </Grid>
          </Grid>
        </Grid>

        {/* Right column: insights feed (sticky on desktop) */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Box sx={{ position: { lg: 'sticky' }, top: { lg: 16 } }}>
            <InsightsFeed limit={8} />
          </Box>
        </Grid>

        {/* Persona activity strip — full width, scrollable on mobile */}
        <Grid size={{ xs: 12 }}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5, display: 'block', mb: 1, mt: 2 }}>
            Today's agents
          </Typography>
          <PersonaActivityStrip />
        </Grid>

        {/* 90-day score heatmap */}
        {scoreHeatmap.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Card sx={{ '&:hover': { transform: 'none' }, mt: 1 }}>
              <CardContent>
                <ActivityHeatmap
                  data={scoreHeatmap}
                  days={90}
                  fillColor="#5B8DEF"
                  title="Score over the last 90 days"
                  thresholds={[40, 60, 75, 90]}
                  legend="Darker = higher daily score. Empty = no data."
                />
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default HomePage;
