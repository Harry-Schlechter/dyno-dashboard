import React from 'react';
import { Card, CardContent, Typography, Box, Stack, Chip } from '@mui/material';
import { LightbulbOutlined } from '@mui/icons-material';
import { Recommendation } from '../../hooks/useRecommendations';

// Shared ranked-recommendations block, reused across all 3 horizon tabs
// (Daily / Weekly / 1-6mo) on the Patterns page.
const RecommendationsList: React.FC<{ recs: Recommendation[]; title: string; accent?: string }> = ({
  recs, title, accent = '#FFB74D',
}) => {
  if (recs.length === 0) return null;
  return (
    <Card sx={{ mb: 2.5, '&:hover': { transform: 'none' }, borderLeft: `3px solid ${accent}` }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1.5 }}>
          <LightbulbOutlined sx={{ fontSize: 18, color: accent }} />
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>
            {title}
          </Typography>
        </Stack>
        <Stack spacing={1.5}>
          {recs.map((r) => (
            <Box key={r.id} sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
              <Chip
                label={r.rank}
                size="small"
                sx={{
                  height: 22, width: 22, borderRadius: '50%', fontSize: '0.7rem', fontWeight: 700,
                  bgcolor: `${accent}26`, color: accent, mt: 0.15,
                  '& .MuiChip-label': { px: 0 },
                }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.4 }}>
                  {r.rec}
                </Typography>
                {r.why && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, lineHeight: 1.4 }}>
                    {r.why}
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default RecommendationsList;
