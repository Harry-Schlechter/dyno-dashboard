import React from 'react';
import { Box, Typography, Grid } from '@mui/material';
import { format } from 'date-fns';
import NetWorthWidget from '../components/home/NetWorthWidget';
import SleepWidget from '../components/home/SleepWidget';
import MealsCaloriesWidget from '../components/home/MealsCaloriesWidget';
import WeekSpendWidget from '../components/home/WeekSpendWidget';
import DailySummaryStrip from '../components/home/DailySummaryStrip';
import InsightsFeed from '../components/home/InsightsFeed';
import PersonaActivityStrip from '../components/home/PersonaActivityStrip';
import VitalsStrip from '../components/home/VitalsStrip';
import RecoveryRing from '../components/home/RecoveryRing';
import JournalNudge from '../components/home/JournalNudge';
import TomorrowForecast from '../components/home/TomorrowForecast';
import TodayPanel from '../components/home/TodayPanel';
import BriefingCard from '../components/home/BriefingCard';
import { IS_DEMO } from '../lib/demoMode';

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
      {/* Greeting */}
      <Box sx={{ mb: { xs: 2, sm: 3 } }}>
        <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
          {getGreeting()}, {IS_DEMO ? 'Sample' : 'Harry'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </Typography>
      </Box>

      <Grid container spacing={{ xs: 2, sm: 2.5 }}>
        {/* Briefing card (replaces TodayNarrative) — agent-written, structured */}
        <Grid size={{ xs: 12 }}>
          <BriefingCard />
        </Grid>

        {/* Left column: today + vitals + at-a-glance widgets */}
        <Grid size={{ xs: 12, lg: 8 }}>
          {/* Today panel — schedule + tasks */}
          <Box sx={{ mb: 3 }}>
            <TodayPanel />
          </Box>

          {/* Vitals — replaces Life Score */}
          <Box sx={{ mb: 3 }}>
            <VitalsStrip />
          </Box>

          {/* Recovery score (Whoop-style) — compact; full detail lives on Fitness */}
          <Box sx={{ mb: 3 }}>
            <RecoveryRing />
          </Box>

          {/* Tomorrow's recovery forecast (self-scored) */}
          <Box sx={{ mb: 3 }}>
            <TomorrowForecast />
          </Box>

          {/* Journaling nudge — streak + on this day */}
          <Box sx={{ mb: 3 }}>
            <JournalNudge />
          </Box>

          {/* Yesterday at a glance */}
          <Box sx={{ mb: 3 }}>
            <DailySummaryStrip />
          </Box>

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
      </Grid>
    </Box>
  );
};

export default HomePage;
