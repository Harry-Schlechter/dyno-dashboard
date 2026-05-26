import { Box, Card, CardContent, Typography } from '@mui/material';

// Placeholder for step 4 — will fetch agent_briefings, tasks, latest insight, macros, weather, calendar, streaks.
export function NowTab() {
  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <PlaceholderCard title="Today's briefing" hint="agent_briefings → latest kind=morning" />
      <PlaceholderCard title="Top tasks" hint="tasks where status=pending, sorted by priority" />
      <PlaceholderCard title="Latest insight" hint="agent_observations realtime; pulses on new" />
      <PlaceholderCard title="Macros" hint="meals today vs goals → mini ring" />
      <PlaceholderCard title="Weather + next event" hint="weather API + google_calendar next event" />
      <PlaceholderCard title="Streaks" hint="sleep / workouts / journal logged streaks" />
    </Box>
  );
}

function PlaceholderCard({ title, hint }: { title: string; hint: string }) {
  return (
    <Card>
      <CardContent sx={{ '&:last-child': { pb: 1.5 }, py: 1.5 }}>
        <Typography variant="h5" sx={{ mb: 0.5 }}>{title}</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{hint}</Typography>
      </CardContent>
    </Card>
  );
}
