import React from 'react';
import { Card, CardContent, Box, Typography } from '@mui/material';

interface Props {
  title?: string;
  children: React.ReactNode;
  accent?: string;
  /** Optional dense padding for compact layouts. */
  dense?: boolean;
}

const InfoCard: React.FC<Props> = ({ title, children, accent, dense = false }) => (
  <Card
    sx={{
      '&:hover': { transform: 'none' },
      ...(accent ? { borderLeft: `3px solid ${accent}` } : {}),
      height: '100%',
    }}
  >
    <CardContent sx={dense ? { py: 1.5, px: 2 } : undefined}>
      {title && (
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ letterSpacing: 1.5, display: 'block', mb: 1 }}
        >
          {title}
        </Typography>
      )}
      <Box>{children}</Box>
    </CardContent>
  </Card>
);

export default InfoCard;
