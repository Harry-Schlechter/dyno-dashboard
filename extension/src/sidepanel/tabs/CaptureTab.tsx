import { Box, Card, CardContent, Typography } from '@mui/material';

// Placeholder for step 5+ — focus header, capture box, tasks list, queue, bookmarks.
export function CaptureTab() {
  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <PlaceholderCard title="Focus session" hint="focus_sessions: title + timer + edit/clear" />
      <PlaceholderCard title="Capture box" hint="text + tab context auto-attached + agent picker" />
      <PlaceholderCard title="All tasks" hint="tasks table, scrollable, inline complete" />
      <PlaceholderCard title="Queue from agents" hint="agent_queue: items pushed back to you" />
      <PlaceholderCard title="Bookmarks" hint="chrome.bookmarks, searchable, grouped" />
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
