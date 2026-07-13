import React from 'react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { LocalFireDepartment, HistoryToggleOff, ChevronRight } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useJournal } from '../../hooks/useJournal';

const agoLabel = (days: number) => {
  if (days < 45) return `${days}d ago`;
  if (days < 400) return `${Math.round(days / 30)}mo ago`;
  const y = Math.floor(days / 365);
  return y === 1 ? '1yr ago' : `${y}yr ago`;
};

// Home-page nudge: journaling streak + an "on this day" teaser. The daily hook
// that both prompts the habit and rewards it. Links to the Reflections page.
const JournalNudge: React.FC = () => {
  const { streak, onThisDay, entries, loading } = useJournal();
  const navigate = useNavigate();

  if (loading || entries.length === 0) return null;

  const teaser = onThisDay[0];
  const streakColor = streak.journaledToday ? '#4CAF50' : streak.current > 0 ? '#FFB74D' : '#7d8590';

  return (
    <Card
      onClick={() => navigate('/journal')}
      sx={{ cursor: 'pointer', '&:hover': { transform: 'none', borderColor: 'rgba(255,255,255,0.16)' } }}
    >
      <CardContent sx={{ py: '16px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          {/* Streak */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <LocalFireDepartment sx={{ fontSize: 22, color: streakColor }} />
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ color: streakColor, lineHeight: 1 }}>
                {streak.current}
              </Typography>
              <Typography variant="caption" color="text.secondary">day streak</Typography>
            </Box>
          </Box>

          <Box sx={{ width: '1px', alignSelf: 'stretch', bgcolor: 'rgba(255,255,255,0.08)', mx: 0.5 }} />

          {/* On this day teaser */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {teaser ? (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                  <HistoryToggleOff sx={{ fontSize: 14, color: '#764ba2' }} />
                  <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 0.5 }}>
                    ON THIS DAY
                  </Typography>
                  <Chip size="small" label={agoLabel(teaser.daysAgo)} sx={{ height: 16, fontSize: '0.58rem', bgcolor: 'rgba(118,75,162,0.18)', color: '#b39ddb' }} />
                </Box>
                <Typography variant="body2" noWrap>{teaser.one_liner || teaser.raw_text.slice(0, 90)}</Typography>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {streak.journaledToday ? 'Journaled today ✓ — nice.' : 'Journal today to keep the streak going.'}
              </Typography>
            )}
          </Box>

          <ChevronRight sx={{ color: 'text.secondary' }} />
        </Box>
      </CardContent>
    </Card>
  );
};

export default JournalNudge;
