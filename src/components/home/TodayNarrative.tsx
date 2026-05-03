import React, { useMemo } from 'react';
import { Box, Card, CardContent, Typography, Stack, Chip } from '@mui/material';
import { WbSunnyRounded } from '@mui/icons-material';
import { format } from 'date-fns';
import { useSupabase } from '../../hooks/useSupabase';
import { useObservations } from '../../hooks/useObservations';

interface SleepRow { date: string; hours: number | null; quality: number | null }
interface DailyLogRow { date: string; mood: number | null; energy: number | null }
interface CommitmentRow { id: string; title: string; due_at: string | null; status: string }

const TodayNarrative: React.FC = () => {
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: sleep } = useSupabase<SleepRow>({
    table: 'sleep',
    order: { column: 'date', ascending: false },
    limit: 1,
  });
  const { data: logs } = useSupabase<DailyLogRow>({
    table: 'daily_logs',
    order: { column: 'date', ascending: false },
    limit: 1,
  });
  const { data: commitments } = useSupabase<CommitmentRow>({
    table: 'commitments',
    filters: { status: 'pending' },
    order: { column: 'due_at', ascending: true },
    limit: 3,
  });
  const { data: warnings } = useObservations({ kinds: ['warning'], limit: 3 });
  const { data: recommendations } = useObservations({ kinds: ['recommendation'], limit: 3 });

  const headline = useMemo(() => {
    // Priority: warning > recommendation > recovery from sleep+mood > generic
    if (warnings.length > 0) return warnings[0].title;
    if (recommendations.length > 0) return recommendations[0].title;

    const last = sleep[0];
    const log = logs[0];
    if (last?.hours != null) {
      if (last.hours >= 8) return 'Solid recovery — go put in real work today.';
      if (last.hours < 6) return "Short night. Easy mode where you can.";
    }
    if (log?.mood != null) {
      if (log.mood >= 4) return 'Good headspace — momentum is yours.';
      if (log.mood <= 2) return 'Rough patch. One small win is enough today.';
    }
    return 'New day. Pick the one thing that matters.';
  }, [warnings, recommendations, sleep, logs]);

  const subline = useMemo(() => {
    const bits: string[] = [];
    const last = sleep[0];
    const log = logs[0];
    if (last?.hours != null) bits.push(`${last.hours.toFixed(1)}h sleep`);
    if (log?.mood != null) bits.push(`mood ${log.mood}/5`);
    if (commitments.length > 0) bits.push(`${commitments.length} open commitment${commitments.length > 1 ? 's' : ''}`);
    return bits.join(' · ');
  }, [sleep, logs, commitments]);

  return (
    <Card sx={{ '&:hover': { transform: 'none' }, mb: 0 }}>
      <CardContent sx={{ py: 2.5, px: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <WbSunnyRounded sx={{ fontSize: 18, color: '#FFD54F' }} />
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>
            Today, {format(new Date(), 'EEE MMM d')}
          </Typography>
        </Box>
        <Typography
          variant="h6"
          fontWeight={600}
          sx={{
            lineHeight: 1.35,
            fontSize: { xs: '1.05rem', sm: '1.2rem' },
          }}
        >
          {headline}
        </Typography>
        {subline && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, fontSize: '0.85rem' }}>
            {subline}
          </Typography>
        )}
        {commitments.length > 0 && (
          <Stack direction="row" spacing={0.75} sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 0.5 }}>
            {commitments.slice(0, 3).map(c => (
              <Chip
                key={c.id}
                size="small"
                label={c.title.length > 32 ? c.title.slice(0, 30) + '…' : c.title}
                sx={{ height: 22, fontSize: '0.7rem', bgcolor: 'rgba(91,141,239,0.12)', color: '#5B8DEF' }}
              />
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

export default TodayNarrative;
