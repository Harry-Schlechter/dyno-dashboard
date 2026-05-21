import React, { useMemo } from 'react';
import { Box, Card, CardContent, Typography, Stack, Chip, Divider, Tooltip, IconButton } from '@mui/material';
import { CalendarToday, AccessTime, Event, CheckCircleOutline, RadioButtonUnchecked, PriorityHigh, ArrowForward } from '@mui/icons-material';
import { format, parseISO, isToday, isTomorrow, isPast, differenceInCalendarDays, isSameDay } from 'date-fns';
import { useSupabase } from '../../hooks/useSupabase';
import { useTasks } from '../../hooks/useTasks';

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  location: string | null;
  category: string | null;
}

const categoryColor = (category: string | null): string => {
  switch (category) {
    case 'work':       return '#5B8DEF';
    case 'fitness':    return '#FF9800';
    case 'social':     return '#4CAF50';
    case 'travel':     return '#764ba2';
    case 'health':     return '#E57373';
    case 'family':     return '#90CAF9';
    default:           return '#7d8590';
  }
};

const formatEventTime = (e: CalendarEvent): string => {
  if (e.all_day) return 'All day';
  const start = parseISO(e.start_time);
  const end = parseISO(e.end_time);
  return `${format(start, 'h:mma')}–${format(end, 'h:mma')}`.replace(/:00/g, '').toLowerCase();
};

const TodayPanel: React.FC = () => {
  const { data: events, loading: eventsLoading } = useSupabase<CalendarEvent>({
    table: 'calendar_events',
    order: { column: 'start_time', ascending: true },
    limit: 50,
  });
  const { data: tasks, loading: tasksLoading, completeTask } = useTasks();

  const now = useMemo(() => new Date(), []);
  const todayKey = format(now, 'yyyy-MM-dd');

  // Today's events (anything starting today, ordered by start time, future-first)
  const todayEvents = useMemo(() => {
    return events
      .filter(e => format(parseISO(e.start_time), 'yyyy-MM-dd') === todayKey)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [events, todayKey]);

  // Up next: the first event that hasn't ended yet today (or tomorrow if nothing left today)
  const upNext = useMemo(() => {
    const future = events
      .filter(e => parseISO(e.end_time).getTime() >= now.getTime())
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
    return future[0] || null;
  }, [events, now]);

  // Tomorrow's events (preview)
  const tomorrowEvents = useMemo(() => {
    return events.filter(e => isTomorrow(parseISO(e.start_time)));
  }, [events]);

  // Tasks due today, overdue (due before today), or pending without a due date
  const { overdue, dueToday, upcoming, undated } = useMemo(() => {
    const overdue: typeof tasks = [];
    const dueToday: typeof tasks = [];
    const upcoming: typeof tasks = []; // due in next 7 days, not today, not overdue
    const undated: typeof tasks = [];
    for (const t of tasks) {
      if (t.status !== 'pending') continue;
      if (!t.due_date) {
        undated.push(t);
        continue;
      }
      const due = parseISO(t.due_date + 'T00:00:00');
      if (isSameDay(due, now)) {
        dueToday.push(t);
      } else if (isPast(due) && !isSameDay(due, now)) {
        overdue.push(t);
      } else {
        const days = differenceInCalendarDays(due, now);
        if (days >= 0 && days <= 7) upcoming.push(t);
      }
    }
    // Sort by priority (1 = highest), then due_date
    const byPri = (a: any, b: any) => (a.priority ?? 3) - (b.priority ?? 3);
    return {
      overdue:  overdue.sort(byPri),
      dueToday: dueToday.sort(byPri),
      upcoming: upcoming.sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '')),
      undated:  undated.sort(byPri),
    };
  }, [tasks, now]);

  const loading = eventsLoading || tasksLoading;

  return (
    <Card sx={{ '&:hover': { transform: 'none' } }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1.5 }}>
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>
              Today
            </Typography>
            <Typography variant="h6" sx={{ mt: -0.5 }}>
              {format(now, 'EEEE, MMMM d')}
            </Typography>
          </Box>
          {upNext && !isSameDay(parseISO(upNext.start_time), now) === false && (
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" color="text.secondary">Next up</Typography>
              <Typography variant="body2" fontWeight={600} sx={{ color: categoryColor(upNext.category) }}>
                {upNext.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatEventTime(upNext)}
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1px 1fr' }, gap: 2.5, alignItems: 'start' }}>
          {/* Left: schedule */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <CalendarToday sx={{ fontSize: 14, color: '#5B8DEF' }} />
              <Typography variant="caption" fontWeight={600} sx={{ letterSpacing: 1 }}>
                SCHEDULE · {todayEvents.length} {todayEvents.length === 1 ? 'event' : 'events'}
              </Typography>
            </Box>
            {loading ? (
              <Typography variant="caption" color="text.secondary">Loading…</Typography>
            ) : todayEvents.length === 0 ? (
              <Typography variant="caption" color="text.secondary">Nothing scheduled today.</Typography>
            ) : (
              <Stack spacing={0.75}>
                {todayEvents.map(e => {
                  const start = parseISO(e.start_time);
                  const end = parseISO(e.end_time);
                  const isPastEvent = end.getTime() < now.getTime();
                  const isCurrent = start.getTime() <= now.getTime() && end.getTime() >= now.getTime();
                  const c = categoryColor(e.category);
                  return (
                    <Box
                      key={e.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        opacity: isPastEvent ? 0.45 : 1,
                        position: 'relative',
                        pl: 1.25,
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          left: 0,
                          top: 4,
                          bottom: 4,
                          width: 3,
                          borderRadius: 2,
                          bgcolor: isCurrent ? c : `${c}77`,
                        },
                      }}
                    >
                      <Box sx={{ minWidth: 75 }}>
                        <Typography variant="caption" sx={{ color: isCurrent ? c : 'text.secondary', fontWeight: isCurrent ? 700 : 500, fontVariantNumeric: 'tabular-nums' }}>
                          {formatEventTime(e)}
                        </Typography>
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: isCurrent ? 600 : 500,
                          textDecoration: isPastEvent ? 'line-through' : 'none',
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {e.title}
                      </Typography>
                      {isCurrent && (
                        <Chip
                          label="now"
                          size="small"
                          sx={{ height: 16, fontSize: '0.6rem', bgcolor: `${c}22`, color: c, border: `1px solid ${c}55` }}
                        />
                      )}
                    </Box>
                  );
                })}
              </Stack>
            )}

            {tomorrowEvents.length > 0 && (
              <Box sx={{ mt: 1.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 1 }}>
                  TOMORROW · {tomorrowEvents.length}
                </Typography>
                <Stack spacing={0.25} sx={{ mt: 0.5 }}>
                  {tomorrowEvents.slice(0, 3).map(e => (
                    <Box key={e.id} sx={{ display: 'flex', gap: 1, alignItems: 'baseline' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 75, fontVariantNumeric: 'tabular-nums' }}>
                        {formatEventTime(e)}
                      </Typography>
                      <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.title}
                      </Typography>
                    </Box>
                  ))}
                  {tomorrowEvents.length > 3 && (
                    <Typography variant="caption" color="text.secondary">+{tomorrowEvents.length - 3} more</Typography>
                  )}
                </Stack>
              </Box>
            )}
          </Box>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />

          {/* Right: tasks */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Event sx={{ fontSize: 14, color: '#FF9800' }} />
              <Typography variant="caption" fontWeight={600} sx={{ letterSpacing: 1 }}>
                TASKS · {overdue.length + dueToday.length} on deck
              </Typography>
            </Box>

            {loading ? (
              <Typography variant="caption" color="text.secondary">Loading…</Typography>
            ) : (
              <Stack spacing={0.5}>
                {overdue.map(t => (
                  <TaskRow key={t.id} task={t} status="overdue" onComplete={() => completeTask(t.id)} />
                ))}
                {dueToday.map(t => (
                  <TaskRow key={t.id} task={t} status="today" onComplete={() => completeTask(t.id)} />
                ))}
                {overdue.length === 0 && dueToday.length === 0 && (
                  <Typography variant="caption" color="text.secondary">Nothing due today.</Typography>
                )}

                {upcoming.length > 0 && (
                  <Box sx={{ mt: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 1 }}>
                      UPCOMING (7d) · {upcoming.length}
                    </Typography>
                    <Stack spacing={0.25} sx={{ mt: 0.5 }}>
                      {upcoming.slice(0, 4).map(t => (
                        <Box key={t.id} sx={{ display: 'flex', gap: 1, alignItems: 'baseline' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 50, fontVariantNumeric: 'tabular-nums' }}>
                            {t.due_date ? format(parseISO(t.due_date + 'T00:00:00'), 'EEE d') : ''}
                          </Typography>
                          <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.title}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                )}

                {undated.length > 0 && (
                  <Box sx={{ mt: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 1 }}>
                      WHEN-YOU-CAN · {undated.length}
                    </Typography>
                    <Stack spacing={0.25} sx={{ mt: 0.5 }}>
                      {undated.slice(0, 3).map(t => (
                        <Typography
                          key={t.id}
                          variant="caption"
                          sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
                        >
                          {t.title}
                        </Typography>
                      ))}
                      {undated.length > 3 && (
                        <Typography variant="caption" color="text.secondary">+{undated.length - 3} more</Typography>
                      )}
                    </Stack>
                  </Box>
                )}
              </Stack>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

const TaskRow: React.FC<{ task: { id: string; title: string; priority: number; due_date: string | null; tags: string[] }; status: 'overdue' | 'today'; onComplete: () => void }> = ({ task, status, onComplete }) => {
  const color = status === 'overdue' ? '#F44336' : task.priority === 1 ? '#FF9800' : '#5B8DEF';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      <Tooltip title="Mark complete">
        <IconButton size="small" onClick={onComplete} sx={{ p: 0.25 }}>
          <RadioButtonUnchecked sx={{ fontSize: 16, color: 'text.secondary', '&:hover': { color } }} />
        </IconButton>
      </Tooltip>
      {task.priority === 1 && (
        <PriorityHigh sx={{ fontSize: 14, color: '#FF9800' }} />
      )}
      <Typography variant="body2" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {task.title}
      </Typography>
      {status === 'overdue' && task.due_date && (
        <Chip
          label={format(parseISO(task.due_date + 'T00:00:00'), 'MMM d')}
          size="small"
          sx={{ height: 16, fontSize: '0.6rem', bgcolor: 'rgba(244,67,54,0.15)', color: '#F44336', border: '1px solid rgba(244,67,54,0.3)' }}
        />
      )}
    </Box>
  );
};

export default TodayPanel;
