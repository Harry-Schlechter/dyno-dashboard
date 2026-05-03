import React from 'react';
import { Card, CardContent, Box, Typography, Button } from '@mui/material';
import { Place } from '@mui/icons-material';

interface Props {
  /** Free-form address — used to build the maps link. */
  query: string;
  /** Display label, e.g. "Hotel Le Sirenuse". */
  label?: string;
  hint?: string;
  /** Optional iframe URL (e.g., a Google Maps embed). If omitted we render a link tile only — no third-party iframe. */
  embedUrl?: string;
  height?: number;
}

const MapEmbed: React.FC<Props> = ({ query, label, hint, embedUrl, height = 220 }) => {
  const link = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  return (
    <Card sx={{ '&:hover': { transform: 'none' }, height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Place sx={{ fontSize: 18, color: '#5B8DEF' }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.9rem' }}>
              {label ?? query}
            </Typography>
            {hint && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.72rem' }}>
                {hint}
              </Typography>
            )}
          </Box>
        </Box>

        {embedUrl ? (
          <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
            <iframe
              src={embedUrl}
              title={label ?? query}
              width="100%"
              height={height}
              style={{ border: 0, display: 'block' }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </Box>
        ) : (
          <Box
            sx={{
              borderRadius: 2,
              border: '1px dashed rgba(255,255,255,0.08)',
              height: height * 0.5,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: 'rgba(91,141,239,0.04)',
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.78rem' }}>
              {query}
            </Typography>
          </Box>
        )}

        <Button
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          size="small"
          fullWidth
          sx={{ mt: 1.5, textTransform: 'none' }}
        >
          Open in Google Maps
        </Button>
      </CardContent>
    </Card>
  );
};

export default MapEmbed;
