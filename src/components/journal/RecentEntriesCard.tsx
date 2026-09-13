import React from 'react';
import { Card, CardContent, Typography, Stack, Box } from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import { JournalEntry } from '../../hooks/useJournal';

const moodEmoji: Record<number, string> = { 1: '😞', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' };

// The agent-written summary of each entry (one_liner + highlights, produced
// during extraction) — this is what "how are we measuring journals" resolves
// to: journal-sync.py already extracts this per entry, it just wasn't shown
// anywhere as a list before now.
const RecentEntriesCard: React.FC<{ entries: JournalEntry[]; limit?: number }> = ({ entries, limit = 8 }) => {
  const recent = entries.slice(0, limit);
  return (
    <Card sx={{ '&:hover': { transform: 'none' } }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5, display: 'block', mb: 1.5 }}>
          Recent entries
        </Typography>
        {recent.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No entries yet.</Typography>
        ) : (
          <Stack spacing={1.5} divider={<Box sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }} />}>
            {recent.map((e) => (
              <Box key={e.id}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1, mb: 0.25 }}>
                  <Typography variant="caption" color="text.secondary">
                    {formatDistanceToNow(new Date(e.date + 'T00:00:00'), { addSuffix: true })}
                  </Typography>
                  {e.mood != null && <Typography sx={{ fontSize: '1rem' }}>{moodEmoji[e.mood] ?? ''}</Typography>}
                </Box>
                <Typography variant="body2">{e.one_liner || e.raw_text.slice(0, 140)}</Typography>
                {e.highlights?.length > 0 && (
                  <Stack spacing={0.2} sx={{ mt: 0.5 }}>
                    {e.highlights.slice(0, 2).map((h, i) => (
                      <Typography key={i} variant="caption" color="text.secondary" sx={{ display: 'block' }}>· {h}</Typography>
                    ))}
                  </Stack>
                )}
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentEntriesCard;
