import React from 'react';
import { Card, CardContent, Box, Typography } from '@mui/material';

interface Props {
  label: string;
  value: React.ReactNode;
  /** Optional sub-text below the value. */
  hint?: string;
  /** Accent hex color — drives the value text color. */
  accent?: string;
  /** Up/down delta tag, e.g. "+12%" or "-3 days". Auto-colored unless overridden. */
  delta?: string;
  deltaPositive?: boolean;
}

const StatTile: React.FC<Props> = ({ label, value, hint, accent = '#5B8DEF', delta, deltaPositive }) => {
  const dColor = deltaPositive === undefined ? '#7d8590' : deltaPositive ? '#4CAF50' : '#F44336';
  return (
    <Card sx={{ '&:hover': { transform: 'none' }, height: '100%' }}>
      <CardContent>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1 }}>
          {label}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
          <Typography variant="h4" fontWeight={700} sx={{ color: accent, fontSize: { xs: '1.5rem', sm: '1.8rem' } }}>
            {value}
          </Typography>
          {delta && (
            <Typography variant="caption" sx={{ color: dColor, fontWeight: 600, fontSize: '0.78rem' }}>
              {delta}
            </Typography>
          )}
        </Box>
        {hint && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, fontSize: '0.72rem' }}>
            {hint}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default StatTile;
