import React from 'react';
import { Box, Card, CardContent, Typography, Stack, Chip } from '@mui/material';

export interface ItineraryItem {
  /** Free-form time, e.g. "7:30am" or "Morning". */
  time?: string;
  title: string;
  description?: string;
  /** Optional category chip — controls the dot color. */
  kind?: 'food' | 'travel' | 'activity' | 'rest' | 'meeting' | 'other';
  href?: string;
  durationMin?: number;
}

interface Props {
  /** Day label, e.g. "Day 1" or "Saturday". */
  day: string;
  /** Optional date subtitle. */
  date?: string;
  items: ItineraryItem[];
}

const KIND_COLOR: Record<NonNullable<ItineraryItem['kind']>, string> = {
  food:     '#FF9800',
  travel:   '#5B8DEF',
  activity: '#4CAF50',
  rest:     '#9C7BFF',
  meeting:  '#26C6DA',
  other:    '#7d8590',
};

const ItineraryDay: React.FC<Props> = ({ day, date, items }) => (
  <Card sx={{ '&:hover': { transform: 'none' }, height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 2 }}>
        <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.05rem' }}>
          {day}
        </Typography>
        {date && (
          <Typography variant="caption" color="text.secondary">
            {date}
          </Typography>
        )}
      </Box>

      <Stack spacing={1.5}>
        {items.map((it, i) => {
          const color = KIND_COLOR[it.kind ?? 'other'];
          return (
            <Box key={i} sx={{ display: 'flex', gap: 1.5 }}>
              <Box sx={{ flexShrink: 0, width: 60, pt: 0.25 }}>
                {it.time && (
                  <Typography variant="caption" sx={{ fontSize: '0.72rem', color: 'text.secondary', fontWeight: 500 }}>
                    {it.time}
                  </Typography>
                )}
              </Box>
              <Box sx={{ position: 'relative', pl: 1.5, flex: 1, minWidth: 0 }}>
                <Box
                  sx={{
                    position: 'absolute', left: 0, top: 6,
                    width: 8, height: 8, borderRadius: '50%',
                    bgcolor: color,
                  }}
                />
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap', rowGap: 0.25 }}>
                  {it.href ? (
                    <a
                      href={it.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600, fontSize: '0.88rem' }}
                    >
                      {it.title} ↗
                    </a>
                  ) : (
                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.88rem' }}>
                      {it.title}
                    </Typography>
                  )}
                  {it.durationMin !== undefined && (
                    <Chip
                      size="small"
                      label={`${it.durationMin}m`}
                      sx={{ height: 16, fontSize: '0.6rem', bgcolor: `${color}1a`, color }}
                    />
                  )}
                </Box>
                {it.description && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, fontSize: '0.78rem', lineHeight: 1.4 }}>
                    {it.description}
                  </Typography>
                )}
              </Box>
            </Box>
          );
        })}
      </Stack>
    </CardContent>
  </Card>
);

export default ItineraryDay;
