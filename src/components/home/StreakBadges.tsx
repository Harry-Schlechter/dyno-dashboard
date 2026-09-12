import React, { useMemo } from 'react';
import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { LocalFireDepartment, Edit, Restaurant } from '@mui/icons-material';
import { format } from 'date-fns';
import { useJournal } from '../../hooks/useJournal';
import { useSupabase } from '../../hooks/useSupabase';

// Streak badges for the MANUAL habits — the ones that don't log themselves
// (journaling, food logging) — as opposed to sleep/recovery/workouts which
// sync automatically from the watch and don't need a "did I do this" nudge.
// Sits top-right next to the greeting/date.

const consecutiveStreak = (dates: Set<string>): { current: number; doneToday: boolean } => {
  const todayISO = format(new Date(), 'yyyy-MM-dd');
  const doneToday = dates.has(todayISO);
  const cursor = new Date();
  if (!doneToday) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  for (;;) {
    const key = format(cursor, 'yyyy-MM-dd');
    if (dates.has(key)) { count++; cursor.setDate(cursor.getDate() - 1); }
    else break;
  }
  return { current: count, doneToday };
};

const StreakBadge: React.FC<{ icon: React.ReactNode; label: string; streak: number; active: boolean }> = ({ icon, label, streak, active }) => {
  const color = active ? '#FF9800' : streak > 0 ? '#FFB74D' : '#7d8590';
  return (
    <Tooltip title={`${label}: ${streak}-day streak${active ? ' — logged today' : ''}`}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
        <Box sx={{ position: 'relative', display: 'flex' }}>
          <LocalFireDepartment sx={{ fontSize: 20, color }} />
          <Box sx={{ position: 'absolute', bottom: -2, right: -2, display: 'flex', color: 'background.default' }}>
            {icon}
          </Box>
        </Box>
        <Typography variant="body2" fontWeight={700} sx={{ color }}>{streak}</Typography>
      </Box>
    </Tooltip>
  );
};

const StreakBadges: React.FC = () => {
  const { streak: journalStreak, loading: journalLoading } = useJournal();
  const { data: meals, loading: mealsLoading } = useSupabase<{ date: string }>({
    table: 'meals', order: { column: 'date', ascending: false }, limit: 500,
  });

  const foodStreak = useMemo(() => {
    const dates = new Set(meals.map(m => m.date));
    return consecutiveStreak(dates);
  }, [meals]);

  if (journalLoading || mealsLoading) return null;

  return (
    <Stack direction="row" spacing={2}>
      <StreakBadge
        icon={<Edit sx={{ fontSize: 10 }} />}
        label="Journaling"
        streak={journalStreak.current}
        active={journalStreak.journaledToday}
      />
      <StreakBadge
        icon={<Restaurant sx={{ fontSize: 10 }} />}
        label="Food logging"
        streak={foodStreak.current}
        active={foodStreak.doneToday}
      />
    </Stack>
  );
};

export default StreakBadges;
