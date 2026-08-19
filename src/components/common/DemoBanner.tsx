import React from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { InfoOutlined } from '@mui/icons-material';
import { isDemo } from '../../lib/auth';

/**
 * Thin persistent strip shown in demo mode so a portfolio visitor always knows
 * the data is fabricated and can get back to the explainer.
 */
const DemoBanner: React.FC = () => {
  const navigate = useNavigate();
  if (!isDemo()) return null;

  return (
    <Box
      sx={{
        px: 2,
        py: 0.75,
        bgcolor: 'rgba(91,141,239,0.10)',
        borderBottom: '1px solid rgba(91,141,239,0.22)',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.25} justifyContent="center" flexWrap="wrap" useFlexGap>
        <InfoOutlined sx={{ fontSize: 16, color: '#5B8DEF' }} />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Demo mode — all data is fictional and generated in your browser.
        </Typography>
        <Button
          size="small"
          onClick={() => navigate('/about')}
          sx={{ minWidth: 0, py: 0, fontSize: '0.75rem', fontWeight: 600 }}
        >
          What is this?
        </Button>
      </Stack>
    </Box>
  );
};

export default DemoBanner;
