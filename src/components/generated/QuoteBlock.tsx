import React from 'react';
import { Box, Typography } from '@mui/material';

interface Props {
  text: string;
  attribution?: string;
}

const QuoteBlock: React.FC<Props> = ({ text, attribution }) => (
  <Box
    sx={{
      borderLeft: '3px solid #5B8DEF',
      pl: 2,
      py: 1,
      my: 1,
    }}
  >
    <Typography variant="body1" sx={{ fontStyle: 'italic', fontSize: { xs: '0.9rem', sm: '1rem' }, lineHeight: 1.5 }}>
      "{text}"
    </Typography>
    {attribution && (
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontSize: '0.78rem' }}>
        — {attribution}
      </Typography>
    )}
  </Box>
);

export default QuoteBlock;
