import React from 'react';
import { Box, Typography, Grid } from '@mui/material';
import { format } from 'date-fns';
import NetWorthWidget from '../components/home/NetWorthWidget';
import YesterdayAndAveragesWidget from '../components/home/YesterdayAndAveragesWidget';
import InsightsFeed from '../components/home/InsightsFeed';
import PersonaActivityStrip from '../components/home/PersonaActivityStrip';
import RecoveryRing from '../components/home/RecoveryRing';
import JournalNudge from '../components/home/JournalNudge';
import TodayPanel from '../components/home/TodayPanel';
import BriefingCard from '../components/home/BriefingCard';
import TopRecommendations from '../components/home/TopRecommendations';
import StreakBadges from '../components/home/StreakBadges';

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 18) return 'Good afternoon';
  if (hour >= 18 && hour < 22) return 'Good evening';
  return 'Good night';
};

const HomePage: React.FC = () => {
  return (
    <Box>
      {/* Greeting + streak badges (top-right) */}
      <Box sx={{ mb: { xs: 2, sm: 3 }, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
            {getGreeting()}, Harry
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </Typography>
        </Box>
        <StreakBadges />
      </Box>

      {/* ── TODAY-FOCUSED TOP SECTION ─────────────────────────────────────── */}
      {/* 1. Morning briefing  2. Top 3 for today  3. Recovery | Net worth (+
          this week's spend) | Yesterday-at-a-glance + 7-day averages, stacked */}
      <Box sx={{ mb: { xs: 3, sm: 4 } }}>
        <Box sx={{ mb: 2.5 }}>
          <BriefingCard />
        </Box>

        <Box sx={{ mb: 2.5 }}>
          <TopRecommendations />
        </Box>

        <Grid container spacing={{ xs: 1.5, sm: 2 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <RecoveryRing />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <NetWorthWidget />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }} sx={{ minWidth: 0 }}>
            <YesterdayAndAveragesWidget />
          </Grid>
        </Grid>
      </Box>

      {/* ── EVERYTHING ELSE ───────────────────────────────────────────────── */}
      <Grid container spacing={{ xs: 2, sm: 2.5 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Box sx={{ mb: 3 }}>
            <TodayPanel />
          </Box>

          <Box sx={{ mb: 3 }}>
            <JournalNudge />
          </Box>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Box sx={{ position: { lg: 'sticky' }, top: { lg: 16 } }}>
            <InsightsFeed limit={8} />
          </Box>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5, display: 'block', mb: 1, mt: 2 }}>
            Today's agents
          </Typography>
          <PersonaActivityStrip />
        </Grid>
      </Grid>
    </Box>
  );
};

export default HomePage;
