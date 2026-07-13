import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { LocalFireDepartment } from '@mui/icons-material';

interface Props {
  current: number;
  journaledToday: boolean;
  lastDate: string | null;
  totalEntries: number;
}

// Journaling habit tracker: current streak + today's status. The nudge.
const JournalStreakCard: React.FC<Props> = ({ current, journaledToday, lastDate, totalEntries }) => {
  const color = journaledToday ? '#4CAF50' : current > 0 ? '#FFB74D' : '#7d8590';
  return (
    <Card sx={{ height: '100%', '&:hover': { transform: 'none' } }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>Journaling streak</Typography>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
          <LocalFireDepartment sx={{ fontSize: 30, color }} />
          <Typography variant="h2" fontWeight={800} sx={{ color, lineHeight: 1 }}>{current}</Typography>
          <Typography variant="body1" color="text.secondary">day{current === 1 ? '' : 's'}</Typography>
        </Box>
        <Typography variant="body2" sx={{ mt: 1, color: journaledToday ? '#4CAF50' : 'text.secondary' }}>
          {journaledToday
            ? "You journaled today ✓"
            : current > 0
              ? "Journal today to keep the streak alive"
              : "Start a streak — journal today"}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          {totalEntries} entries total{lastDate ? ` · last on ${lastDate}` : ''}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default JournalStreakCard;
