import React from 'react';
import { Card, CardContent, Typography, Box, Chip, Stack } from '@mui/material';
import { HistoryToggleOff } from '@mui/icons-material';
import { JournalEntry } from '../../hooks/useJournal';

type OnThisDayEntry = JournalEntry & { daysAgo: number };

const agoLabel = (days: number) => {
  if (days < 45) return `${days} days ago`;
  if (days < 400) return `${Math.round(days / 30)} months ago`;
  const y = Math.floor(days / 365);
  return y === 1 ? '1 year ago' : `${y} years ago`;
};

// "On this day" — prior journal entries sharing today's date. Safe by construction:
// it only surfaces what you WROTE on this date, never a life-origin claim.
const OnThisDayCard: React.FC<{ entries: OnThisDayEntry[]; onOpen?: (date: string) => void }> = ({ entries, onOpen }) => {
  return (
    <Card sx={{ height: '100%', '&:hover': { transform: 'none' } }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
          <HistoryToggleOff sx={{ fontSize: 18, color: '#764ba2' }} />
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>On this day</Typography>
        </Box>

        {entries.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Nothing from this date in your journal yet — it fills in as you keep writing.
          </Typography>
        ) : (
          <Stack spacing={1.75}>
            {entries.map((e) => (
              <Box
                key={e.id}
                onClick={() => onOpen?.(e.date)}
                sx={{ cursor: onOpen ? 'pointer' : 'default', '&:hover .otd-line': { color: 'text.primary' } }}
              >
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.25 }}>
                  <Chip size="small" label={agoLabel(e.daysAgo)} sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'rgba(118,75,162,0.18)', color: '#b39ddb' }} />
                  <Typography variant="caption" color="text.secondary">{e.date}</Typography>
                </Box>
                <Typography className="otd-line" variant="body2" sx={{ transition: 'color 0.2s' }}>
                  {e.one_liner || e.raw_text.slice(0, 140) + '…'}
                </Typography>
                {e.highlights?.length > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                    ✦ {e.highlights[0]}
                  </Typography>
                )}
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

export default OnThisDayCard;
