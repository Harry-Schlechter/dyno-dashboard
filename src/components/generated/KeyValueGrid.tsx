import React from 'react';
import { Box, Typography } from '@mui/material';

interface Pair {
  label: string;
  value: React.ReactNode;
}

interface Props {
  items: Pair[];
  /** Columns at the md+ breakpoint. Default 2. */
  columns?: 1 | 2 | 3;
}

const KeyValueGrid: React.FC<Props> = ({ items, columns = 2 }) => (
  <Box
    sx={{
      display: 'grid',
      gap: 1.25,
      gridTemplateColumns: {
        xs: '1fr',
        sm: columns >= 2 ? 'repeat(2, 1fr)' : '1fr',
        md: `repeat(${columns}, 1fr)`,
      },
    }}
  >
    {items.map((p, i) => (
      <Box key={i} sx={{ pb: 1, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1 }}>
          {p.label}
        </Typography>
        <Typography variant="body2" fontWeight={500} sx={{ mt: 0.25, wordBreak: 'break-word' }}>
          {p.value}
        </Typography>
      </Box>
    ))}
  </Box>
);

export default KeyValueGrid;
