import React from 'react';
import { Box, Typography, Chip, Stack } from '@mui/material';

interface Props {
  title: string;
  subtitle?: string;
  /** ISO date or any human-readable string. */
  meta?: string;
  /** Up to 4 short tags rendered as chips. */
  tags?: string[];
  /** Optional banner image URL. */
  imageUrl?: string;
  /** Accent color (hex) — drives the gradient bar. Defaults to primary blue. */
  accent?: string;
}

const PageHero: React.FC<Props> = ({ title, subtitle, meta, tags, imageUrl, accent = '#5B8DEF' }) => (
  <Box sx={{ mb: { xs: 2.5, sm: 3.5 } }}>
    {imageUrl && (
      <Box
        sx={{
          height: { xs: 160, sm: 220, md: 280 },
          borderRadius: '18px',
          overflow: 'hidden',
          mb: 2,
          backgroundImage: `linear-gradient(180deg, rgba(5,7,11,0) 40%, rgba(5,7,11,0.7) 100%), url(${imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      />
    )}
    <Box
      sx={{
        height: 4,
        width: 64,
        background: `linear-gradient(90deg, ${accent}, ${accent}88)`,
        borderRadius: 2,
        mb: 1.5,
      }}
    />
    <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.6rem', sm: '2rem' } }}>
      {title}
    </Typography>
    {subtitle && (
      <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
        {subtitle}
      </Typography>
    )}
    {(meta || (tags && tags.length > 0)) && (
      <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 0.75, alignItems: 'center' }}>
        {meta && (
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.78rem' }}>
            {meta}
          </Typography>
        )}
        {tags?.slice(0, 6).map(t => (
          <Chip
            key={t}
            label={t}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.68rem',
              bgcolor: `${accent}1a`,
              color: accent,
              border: `1px solid ${accent}33`,
            }}
          />
        ))}
      </Stack>
    )}
  </Box>
);

export default PageHero;
