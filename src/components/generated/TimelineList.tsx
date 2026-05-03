import React from 'react';
import { Box, Typography, Chip } from '@mui/material';

export interface TimelineEntry {
  /** Free-form date or date range — left rail. */
  when: string;
  title: string;
  description?: string;
  status?: 'done' | 'current' | 'upcoming';
  tag?: string;
}

interface Props {
  entries: TimelineEntry[];
}

const STATUS_COLOR: Record<NonNullable<TimelineEntry['status']>, string> = {
  done:     '#4CAF50',
  current:  '#5B8DEF',
  upcoming: '#7d8590',
};

const TimelineList: React.FC<Props> = ({ entries }) => (
  <Box sx={{ position: 'relative', pl: { xs: 1.5, sm: 2.5 } }}>
    <Box
      sx={{
        position: 'absolute', left: { xs: 7, sm: 11 }, top: 8, bottom: 8,
        width: 1, bgcolor: 'rgba(255,255,255,0.08)',
      }}
    />
    {entries.map((e, i) => {
      const color = STATUS_COLOR[e.status ?? 'upcoming'];
      const isCurrent = e.status === 'current';
      return (
        <Box key={i} sx={{ position: 'relative', pl: { xs: 2.5, sm: 3 }, pb: i === entries.length - 1 ? 0 : 2 }}>
          <Box
            sx={{
              position: 'absolute',
              left: { xs: -2, sm: -1 },
              top: 4,
              width: isCurrent ? 14 : 10,
              height: isCurrent ? 14 : 10,
              borderRadius: '50%',
              bgcolor: color,
              boxShadow: isCurrent ? `0 0 0 4px ${color}33` : 'none',
              border: isCurrent ? `2px solid #05070b` : 'none',
            }}
          />
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap', rowGap: 0.25 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', fontWeight: 500 }}>
              {e.when}
            </Typography>
            {e.tag && (
              <Chip
                size="small"
                label={e.tag}
                sx={{ height: 16, fontSize: '0.6rem', bgcolor: `${color}1a`, color }}
              />
            )}
          </Box>
          <Typography variant="body2" fontWeight={isCurrent ? 700 : 500} sx={{ fontSize: '0.9rem', mt: 0.25 }}>
            {e.title}
          </Typography>
          {e.description && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, fontSize: '0.78rem', lineHeight: 1.4 }}>
              {e.description}
            </Typography>
          )}
        </Box>
      );
    })}
  </Box>
);

export default TimelineList;
