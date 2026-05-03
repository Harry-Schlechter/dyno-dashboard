import React from 'react';
import { Box, Typography } from '@mui/material';
import { OpenInNew } from '@mui/icons-material';

interface Props {
  href: string;
  label: string;
  hint?: string;
  /** Optional emoji prefix. */
  emoji?: string;
}

const LinkOut: React.FC<Props> = ({ href, label, hint, emoji }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    style={{ textDecoration: 'none', color: 'inherit' }}
  >
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 1,
        px: 1.25,
        borderRadius: 2,
        border: '1px solid rgba(255,255,255,0.06)',
        transition: 'background-color 0.15s',
        '&:hover': { bgcolor: 'rgba(91,141,239,0.08)', borderColor: '#5B8DEF44' },
      }}
    >
      {emoji && <Typography sx={{ fontSize: 16 }}>{emoji}</Typography>}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.85rem' }}>
          {label}
        </Typography>
        {hint && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
            {hint}
          </Typography>
        )}
      </Box>
      <OpenInNew sx={{ fontSize: 14, color: 'text.secondary' }} />
    </Box>
  </a>
);

export default LinkOut;
