import React, { useMemo } from 'react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { Favorite, LocalFireDepartment, Timer } from '@mui/icons-material';
import { format } from 'date-fns';
import { useSupabase } from '../../hooks/useSupabase';
import { Workout } from '../../hooks/useWorkouts';

// The most recent workout as a "latest reading" card — HR, calories, duration,
// activity type. Complements the analytics widgets with a single at-a-glance card.
const LatestWorkoutCard: React.FC = () => {
  const { data } = useSupabase<Workout>({
    table: 'workouts',
    order: { column: 'date', ascending: false },
    limit: 20,
  });

  // The genuinely most recent workout — data is date-desc ordered, so that's data[0].
  // (Auto-detected sessions count; an untagged one just gets a "needs tag" chip.)
  const latest = useMemo(() => data[0] ?? null, [data]);

  if (!latest) return null;

  const when = latest.session_start
    ? format(new Date(latest.session_start), 'EEE MMM d, h:mm a')
    : format(new Date(latest.date + 'T12:00:00'), 'EEE MMM d');

  const stat = (icon: React.ReactNode, label: string, value: string) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Box sx={{ color: 'text.secondary', display: 'flex' }}>{icon}</Box>
      <Typography variant="body2" fontWeight={600}>{value}</Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Box>
  );

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>
          Latest workout
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, mb: 1, flexWrap: 'wrap' }}>
          <Typography variant="h5" fontWeight={700}>{latest.name || 'Workout'}</Typography>
          {latest.source === 'google_health' && (
            <Chip size="small" label="Fitbit" sx={{ height: 18, fontSize: '0.6rem' }} />
          )}
          {latest.review_status === 'needs_review'
            && (!latest.name || latest.name === 'Active session (needs review)') && (
            <Chip size="small" label="needs tag" sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'rgba(255,152,0,0.15)', color: '#FF9800' }} />
          )}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>{when}</Typography>

        <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>
          {latest.duration_min != null && stat(<Timer sx={{ fontSize: 16 }} />, 'min', String(latest.duration_min))}
          {latest.avg_hr != null && stat(<Favorite sx={{ fontSize: 16 }} />, latest.max_hr ? `avg / ${latest.max_hr} max` : 'avg HR', String(latest.avg_hr))}
          {latest.active_calories != null && stat(<LocalFireDepartment sx={{ fontSize: 16 }} />, 'cal', String(latest.active_calories))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default LatestWorkoutCard;
