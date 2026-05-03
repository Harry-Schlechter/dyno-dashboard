import React from 'react';
import { Box, Typography } from '@mui/material';

interface Props {
  title: string;
  hint?: string;
}

const SectionHeader: React.FC<Props> = ({ title, hint }) => (
  <Box sx={{ mb: 1.5, mt: { xs: 2, sm: 3 } }}>
    <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5, display: 'block' }}>
      {title}
    </Typography>
    {hint && (
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, fontSize: '0.75rem' }}>
        {hint}
      </Typography>
    )}
  </Box>
);

export default SectionHeader;
