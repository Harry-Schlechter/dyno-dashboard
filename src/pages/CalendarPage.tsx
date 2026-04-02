import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, IconButton, Stack,
  Dialog, DialogTitle, DialogContent,
} from '@mui/material';
import { ChevronLeft, ChevronRight, Close, FitnessCenter, Restaurant, Book, CheckCircle } from '@mui/icons-material';
import { useSupabase } from '../hooks/useSupabase';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isToday } from 'date-fns';
import LoadingSkeleton from '../components/common/LoadingSkeleton';

interface CalendarEvent {
  type: 'workout' | 'meal' | 'journal' | 'task';
  title: string;
  color: string;
}

const TYPE_COLORS: Record<string, string> = {
  workout: '#FF9800',
  meal: '#4CAF50',
  journal: '#5B8DEF',
  task: '#764ba2',
};

const CalendarPage: React.FC = () => {
  const [month, setMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const monthStart = format(startOfMonth(month), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(month), 'yyyy-MM-dd');

  const { data: workouts, loading: wLoading } = useSupabase<{ id: string; date: string; name: string }>({
    table: 'workouts',
    select: 'id,date,name',
    filters: { date: { gte: monthStart } },
  });

  const { data: meals, loading: mLoading } = useSupabase<{ id: string; date: string; meal_type: string; description: string }>({
    table: 'meals',
    select: 'id,date,meal_type,description',
    filters: { date: { gte: monthStart } },
  });

  const { data: logs, loading: lLoading } = useSupabase<{ id: string; date: string; journal: string; mood: number }>({
    table: 'daily_logs',
    select: 'id,date,journal,mood',
    filters: { date: { gte: monthStart } },
  });

  const { data: tasks, loading: tLoading } = useSupabase<{ id: string; due_date: string; title: string; status: string }>({
    table: 'tasks',
    select: 'id,due_date,title,status',
  });

  const loading = wLoading || mLoading || lLoading || tLoading;

  const calendarDays = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    return { days: eachDayOfInterval({ start, end }), startPad: getDay(start) };
  }, [month]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    const addEvent = (date: string, event: CalendarEvent) => {
      if (!map[date]) map[date] = [];
      map[date].push(event);
    };

    workouts.forEach(w => addEvent(w.date, { type: 'workout', title: w.name, color: '#FF9800' }));
    meals.filter(m => m.meal_type !== 'breakfast').forEach(m => addEvent(m.date, { type: 'meal', title: `${m.meal_type}: ${m.description}`, color: '#4CAF50' }));
    logs.filter(l => l.journal).forEach(l => addEvent(l.date, { type: 'journal', title: 'Journal entry', color: '#5B8DEF' }));
    tasks.filter(t => t.due_date).forEach(t => addEvent(t.due_date, { type: 'task', title: t.title, color: t.status === 'completed' ? '#4CAF50' : '#764ba2' }));

    return map;
  }, [workouts, meals, logs, tasks]);

  const totalEventsThisMonth = useMemo(() => {
    return Object.values(eventsByDate).reduce((sum, events) => sum + events.length, 0);
  }, [eventsByDate]);

  const selectedEvents = selectedDay ? (eventsByDate[selectedDay] || []) : [];

  if (loading) return <LoadingSkeleton variant="chart" />;

  const typeIcons: Record<string, React.ReactNode> = {
    workout: <FitnessCenter sx={{ fontSize: 18 }} />,
    meal: <Restaurant sx={{ fontSize: 18 }} />,
    journal: <Book sx={{ fontSize: 18 }} />,
    task: <CheckCircle sx={{ fontSize: 18 }} />,
  };

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h3" fontWeight={700}>Calendar</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {totalEventsThisMonth} event{totalEventsThisMonth !== 1 ? 's' : ''} in {format(month, 'MMMM')}
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            bgcolor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 3,
            px: 1.5,
            py: 0.5,
          }}
        >
          <IconButton
            onClick={() => setMonth(prev => subMonths(prev, 1))}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': { color: '#5B8DEF', bgcolor: 'rgba(91, 141, 239, 0.1)' },
              transition: 'all 0.2s',
            }}
          >
            <ChevronLeft fontSize="small" />
          </IconButton>
          <Typography
            variant="subtitle2"
            fontWeight={600}
            sx={{ minWidth: 140, textAlign: 'center', userSelect: 'none' }}
          >
            {format(month, 'MMMM yyyy')}
          </Typography>
          <IconButton
            onClick={() => setMonth(prev => addMonths(prev, 1))}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': { color: '#5B8DEF', bgcolor: 'rgba(91, 141, 239, 0.1)' },
              transition: 'all 0.2s',
            }}
          >
            <ChevronRight fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Legend Strip */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          mb: 2.5,
          px: 2,
          py: 1.25,
          bgcolor: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 2.5,
          backdropFilter: 'blur(8px)',
        }}
      >
        {[
          { label: 'Workout', color: TYPE_COLORS.workout },
          { label: 'Meal', color: TYPE_COLORS.meal },
          { label: 'Journal', color: TYPE_COLORS.journal },
          { label: 'Task', color: TYPE_COLORS.task },
        ].map(item => (
          <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: item.color,
                boxShadow: `0 0 6px ${item.color}66`,
              }}
            />
            <Typography variant="caption" color="text.secondary" fontWeight={500} letterSpacing="0.02em">
              {item.label}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Calendar Card */}
      <Card sx={{ '&:hover': { transform: 'none' } }}>
        <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
          <Grid container spacing="4px">
            {/* Day Headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <Grid size={{ xs: 12 / 7 }} key={d}>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  textAlign="center"
                  display="block"
                  fontWeight={700}
                  sx={{ pb: 1.5, fontSize: '0.7rem', letterSpacing: '0.1em' }}
                >
                  {d}
                </Typography>
              </Grid>
            ))}

            {/* Padding cells */}
            {Array.from({ length: calendarDays.startPad }).map((_, i) => (
              <Grid size={{ xs: 12 / 7 }} key={`pad-${i}`}>
                <Box sx={{ minHeight: { xs: 70, sm: 90 } }} />
              </Grid>
            ))}

            {/* Day Cells */}
            {calendarDays.days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const events = eventsByDate[dateStr] || [];
              const today = isToday(day);
              const hasEvents = events.length > 0;
              const uniqueTypes = [...new Set(events.map(e => e.type))];
              const displayEvents = events.slice(0, 2);
              const extraCount = events.length - 2;

              return (
                <Grid size={{ xs: 12 / 7 }} key={dateStr}>
                  <Box
                    onClick={() => hasEvents && setSelectedDay(dateStr)}
                    sx={{
                      minHeight: { xs: 70, sm: 90 },
                      p: 1,
                      borderRadius: 2,
                      cursor: hasEvents ? 'pointer' : 'default',
                      bgcolor: today
                        ? 'rgba(91, 141, 239, 0.08)'
                        : hasEvents
                          ? 'rgba(255,255,255,0.04)'
                          : 'rgba(255,255,255,0.02)',
                      border: today
                        ? '1px solid rgba(91, 141, 239, 0.35)'
                        : '1px solid rgba(255,255,255,0.04)',
                      '&:hover': hasEvents
                        ? {
                            bgcolor: 'rgba(91, 141, 239, 0.08)',
                            borderColor: 'rgba(91, 141, 239, 0.2)',
                          }
                        : {},
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {/* Day Number */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 0.5 }}>
                      <Box
                        sx={{
                          width: today ? 26 : 'auto',
                          height: today ? 26 : 'auto',
                          borderRadius: '50%',
                          bgcolor: today ? '#5B8DEF' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography
                          variant="body2"
                          fontWeight={today ? 700 : 500}
                          color={today ? '#fff' : 'text.primary'}
                          sx={{ fontSize: 12, lineHeight: 1 }}
                        >
                          {format(day, 'd')}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Event Dots */}
                    {uniqueTypes.length > 0 && (
                      <Stack direction="row" spacing={0.5} sx={{ mb: 0.5 }}>
                        {uniqueTypes.map(type => {
                          const event = events.find(e => e.type === type)!;
                          return (
                            <Box
                              key={type}
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: event.color,
                                transition: 'box-shadow 0.2s',
                                '.MuiBox-root:hover &': {
                                  boxShadow: `0 0 8px ${event.color}AA`,
                                },
                              }}
                            />
                          );
                        })}
                      </Stack>
                    )}

                    {/* Truncated Event Titles */}
                    <Box sx={{ flex: 1, overflow: 'hidden', display: { xs: 'none', sm: 'block' } }}>
                      {displayEvents.map((event, idx) => (
                        <Typography
                          key={idx}
                          sx={{
                            fontSize: '0.6rem',
                            lineHeight: 1.3,
                            color: 'text.secondary',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            mb: 0.25,
                          }}
                        >
                          {event.title}
                        </Typography>
                      ))}
                      {extraCount > 0 && (
                        <Typography
                          sx={{
                            fontSize: '0.58rem',
                            color: '#5B8DEF',
                            fontWeight: 600,
                          }}
                        >
                          +{extraCount} more
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>

      {/* Day Detail Dialog */}
      <Dialog
        open={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'rgba(18, 24, 33, 0.98)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 4,
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.7)',
          },
        }}
      >
        {selectedDay && (
          <>
            <DialogTitle
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                pb: 1.5,
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <Box>
                <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  {format(new Date(selectedDay + 'T12:00:00'), 'EEEE')}
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {format(new Date(selectedDay + 'T12:00:00'), 'MMMM d, yyyy')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''}
                </Typography>
              </Box>
              <IconButton
                onClick={() => setSelectedDay(null)}
                size="small"
                sx={{
                  mt: 0.5,
                  color: 'text.secondary',
                  '&:hover': { color: 'text.primary', bgcolor: 'rgba(255,255,255,0.06)' },
                }}
              >
                <Close fontSize="small" />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 2.5, pb: 3 }}>
              <Stack spacing={1.5}>
                {selectedEvents.map((event, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      p: 2,
                      borderRadius: 2.5,
                      bgcolor: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderLeft: `3px solid ${event.color}`,
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.05)',
                        borderColor: 'rgba(255,255,255,0.08)',
                        borderLeftColor: event.color,
                      },
                    }}
                  >
                    <Box
                      sx={{
                        color: event.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 36,
                        height: 36,
                        borderRadius: 2,
                        bgcolor: `${event.color}18`,
                        flexShrink: 0,
                      }}
                    >
                      {typeIcons[event.type]}
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        textTransform="capitalize"
                        fontWeight={600}
                        letterSpacing="0.04em"
                      >
                        {event.type}
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight={500}
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {event.title}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default CalendarPage;
