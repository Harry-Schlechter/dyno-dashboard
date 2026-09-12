import React from 'react';
import { Box, Stack, Typography, Chip } from '@mui/material';
import { ChevronRight } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, isToday } from 'date-fns';
import { useRecommendations } from '../../hooks/useRecommendations';
import RecommendationsList from '../patterns/RecommendationsList';

// Home-page surface for today's top-3 recommendations from the daily
// forecasting pipeline (fingerprint -> trend lookup -> judge). Sits right
// under the morning briefing — this is the actionable "what to actually do
// today" layer, not just a forecast number. Links to Patterns for the full
// picture (forecasts + weekly/monthly horizons).
const TopRecommendations: React.FC = () => {
  const { latestByHorizon, loading } = useRecommendations('daily');
  const navigate = useNavigate();

  if (loading) return null;
  const recs = latestByHorizon.daily;
  if (recs.length === 0) return null;

  const generatedAt = recs[0]?.created_at ? new Date(recs[0].created_at) : null;
  const stale = generatedAt ? !isToday(generatedAt) : false;

  return (
    <Box onClick={() => navigate('/patterns')} sx={{ cursor: 'pointer' }}>
      <RecommendationsList recs={recs} title="Top 3 for today" />
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: -1.5, px: 0.5 }}>
        {generatedAt && (
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Typography variant="caption" color="text.secondary">
              generated {formatDistanceToNow(generatedAt, { addSuffix: true })}
            </Typography>
            {stale && (
              <Chip
                size="small" label="from an earlier day"
                sx={{ height: 16, fontSize: '0.6rem', bgcolor: 'rgba(255,152,0,0.15)', color: '#FF9800' }}
              />
            )}
          </Stack>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
          See forecasts & more <ChevronRight sx={{ fontSize: 16 }} />
        </Typography>
      </Stack>
    </Box>
  );
};

export default TopRecommendations;
