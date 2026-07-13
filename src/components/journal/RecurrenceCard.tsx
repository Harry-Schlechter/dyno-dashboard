import React from 'react';
import { Card, CardContent, Typography, Box, Chip, Tooltip } from '@mui/material';
import { Recurrence } from '../../hooks/useJournal';

// People / topics that RECUR in the journal, shown as mention counts — deliberately
// framed as "in N entries", never "first appeared", since the journal is partial.
const RecurrenceCard: React.FC<{ title: string; items: Recurrence[]; color: string; emptyHint: string }> = ({
  title, items, color, emptyHint,
}) => {
  const max = items[0]?.count ?? 1;
  return (
    <Card sx={{ height: '100%', '&:hover': { transform: 'none' } }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>{title}</Typography>
        {items.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{emptyHint}</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
            {items.slice(0, 16).map((r) => {
              // Scale chip prominence by frequency.
              const weight = 0.4 + 0.6 * (r.count / max);
              return (
                <Tooltip key={r.name} title={`In ${r.count} entries`}>
                  <Chip
                    label={`${r.name} · ${r.count}`}
                    size="small"
                    sx={{
                      height: 24, fontSize: '0.72rem',
                      bgcolor: `${color}${Math.round(weight * 40).toString(16).padStart(2, '0')}`,
                      color,
                      fontWeight: r.count >= max * 0.6 ? 700 : 500,
                    }}
                  />
                </Tooltip>
              );
            })}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default RecurrenceCard;
