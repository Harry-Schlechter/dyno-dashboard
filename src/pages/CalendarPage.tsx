import React, { useMemo, useState } from 'react';
import {
  Box, Typography, Card, CardContent, IconButton, Stack, Drawer, Chip, Divider,
  Tooltip, Dialog, DialogContent,
} from '@mui/material';
import {
  ChevronLeft, ChevronRight, Close, FitnessCenter, Restaurant, Bedtime, AttachMoney,
  Event as EventIcon, LocationOn, Schedule, CalendarMonth,
} from '@mui/icons-material';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isToday,
  parseISO, isSameDay,
} from 'date-fns';
import { useSupabase } from '../hooks/useSupabase';
import { useFinances } from '../hooks/useFinances';
import { isRealSpend } from '../lib/finance';
import { formatCurrency } from '../lib/formatters';
import LoadingSkeleton from '../components/common/LoadingSkeleton';

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean;
  category: string | null;
  color: string | null;
  source: string;
  source_calendar_name: string | null;
  status: string | null;
}

const colorForCategory = (category: string | null): string => {
  switch (category) {
    case 'work':       return '#5B8DEF';
    case 'fitness':    return '#FF9800';
    case 'social':     return '#4CAF50';
    case 'travel':     return '#764ba2';
    case 'medical':    return '#F44336';
    case 'networking': return '#90CAF9';
    default:           return '#7d8590';
  }
};

// Heatmap fill for a day based on its Life Score. Subtle so events still read.
const scoreFill = (score: number | null): string => {
  if (score === null) return 'rgba(255,255,255,0.018)';
  if (score >= 80) return 'rgba(76,175,80,0.16)';
  if (score >= 60) return 'rgba(91,141,239,0.14)';
  if (score >= 40) return 'rgba(255,152,0,0.14)';
  return 'rgba(244,67,54,0.14)';
};

const scoreAccent = (score: number | null): string => {
  if (score === null) return '#7d8590';
  if (score >= 80) return '#4CAF50';
  if (score >= 60) return '#5B8DEF';
  if (score >= 40) return '#FF9800';
  return '#F44336';
};

const CalendarPage: React.FC = () => {
  const [cursor, setCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const monthStart = useMemo(() => startOfMonth(cursor), [cursor]);
  const monthEnd = useMemo(() => endOfMonth(cursor), [cursor]);
  const days = useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), [monthStart, monthEnd]);
  const startWeekday = getDay(monthStart); // 0 = Sun

  const monthStartStr = format(monthStart, 'yyyy-MM-dd');
  const monthEndStr = format(monthEnd, 'yyyy-MM-dd');

  // Calendar events for the month
  const { data: events, loading: eventsLoading, error: eventsError } = useSupabase<CalendarEvent>({
    table: 'calendar_events',
    order: { column: 'start_time', ascending: true },
    filters: { start_time: { gte: monthStartStr } },
    limit: 500,
  });
  const calendarTableMissing = !!eventsError && (eventsError.toLowerCase().includes('not find') || eventsError.toLowerCase().includes('schema cache'));

  // Lightweight per-day stats (sleep, workout count, meals, real spend)
  const { data: sleep, loading: sleepLoading } = useSupabase<{ date: string; hours: number | null; went_to_bed_at: string | null; woke_up_at: string | null }>({
    table: 'sleep', order: { column: 'date', ascending: false }, limit: 500,
  });
  const { data: workouts, loading: workoutsLoading } = useSupabase<{ date: string; name: string | null; duration_min: number | null }>({
    table: 'workouts', order: { column: 'date', ascending: false }, limit: 500,
  });
  const { data: meals, loading: mealsLoading } = useSupabase<{ date: string; meal_type: string | null; description: string | null; calories: number | null; protein_g: number | null }>({
    table: 'meals', order: { column: 'date', ascending: false }, limit: 1000,
  });
  const { transactions, loading: finLoading } = useFinances();

  // Group events by date (start_time local date)
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const key = format(parseISO(e.start_time), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [events]);

  // Lightweight per-day Life Score — inline computation against a few core signals
  // (sleep hours, workout occurred, protein hit, spend within band). Null when
  // nothing tracked. Returns 0-100. Keeps the calendar heatmap meaningful without
  // requiring the full goals-based scoring engine.
  const scoresByDay = useMemo(() => {
    const map = new Map<string, number | null>();
    const sleepByDay = new Map(sleep.map(s => [s.date, s.hours]));
    const workoutDays = new Set(workouts.map(w => w.date));
    const proteinByDay = new Map<string, number>();
    for (const m of meals) {
      if (m.protein_g == null) continue;
      proteinByDay.set(m.date, (proteinByDay.get(m.date) ?? 0) + (m.protein_g ?? 0));
    }
    const spendByDay = new Map<string, number>();
    for (const t of transactions) {
      if (!isRealSpend(t)) continue;
      spendByDay.set(t.date, (spendByDay.get(t.date) ?? 0) + Math.abs(t.amount));
    }

    for (const d of days) {
      const key = format(d, 'yyyy-MM-dd');
      const parts: number[] = [];

      // Sleep: steps function (matches the goal seed)
      const hrs = sleepByDay.get(key);
      if (hrs != null) {
        let s = 0;
        if (hrs >= 8)        s = 100;
        else if (hrs >= 7.5) s = 90;
        else if (hrs >= 7)   s = 80;
        else if (hrs >= 6.5) s = 65;
        else if (hrs >= 6)   s = 55;
        else if (hrs >= 5)   s = 40;
        else if (hrs >= 4)   s = 20;
        parts.push(s);
      }

      // Protein: 170g target, linear
      const prot = proteinByDay.get(key);
      if (prot != null) parts.push(Math.min(100, (prot / 170) * 100));

      // Workout: binary
      if (workoutDays.size > 0) parts.push(workoutDays.has(key) ? 100 : 50);

      // Spend within typical range ($0-150 = 100, scales down to 0 at $400)
      const sp = spendByDay.get(key);
      if (sp != null) {
        if (sp <= 150) parts.push(100);
        else if (sp >= 400) parts.push(40);
        else parts.push(100 - ((sp - 150) / 250) * 60);
      }

      // Don't score future days
      const isFuture = d.getTime() > Date.now() + 24 * 60 * 60 * 1000;
      if (isFuture || parts.length === 0) {
        map.set(key, null);
      } else {
        const avg = parts.reduce((a, b) => a + b, 0) / parts.length;
        map.set(key, Math.round(avg));
      }
    }
    return map;
  }, [days, sleep, workouts, meals, transactions]);

  const loading = eventsLoading || sleepLoading || workoutsLoading || mealsLoading || finLoading;
  if (loading) return <LoadingSkeleton variant="card" count={2} />;

  // Pad start of grid with blanks so day-1 lands on the correct weekday
  const padding = Array.from({ length: startWeekday });

  return (
    <Box>
      <Box sx={{ mb: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ letterSpacing: '-0.02em' }}>
            {format(cursor, 'MMMM')}{' '}
            <Typography component="span" variant="h4" sx={{ fontWeight: 400, color: 'text.secondary', letterSpacing: '-0.02em' }}>
              {format(cursor, 'yyyy')}
            </Typography>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Click any day for a full breakdown · click an event for details
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{
          bgcolor: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 2,
          p: 0.375,
        }}>
          <IconButton size="small" onClick={() => setCursor(subMonths(cursor, 1))} sx={{ borderRadius: 1.25 }}>
            <ChevronLeft fontSize="small" />
          </IconButton>
          <Box
            onClick={() => setCursor(new Date())}
            sx={{
              px: 1.5, py: 0.4, borderRadius: 1.25, cursor: 'pointer',
              bgcolor: 'rgba(91,141,239,0.12)',
              border: '1px solid rgba(91,141,239,0.25)',
              transition: 'background-color 0.1s',
              '&:hover': { bgcolor: 'rgba(91,141,239,0.2)' },
            }}
          >
            <Typography variant="caption" fontWeight={600} sx={{ color: '#5B8DEF', letterSpacing: 0.4 }}>Today</Typography>
          </Box>
          <IconButton size="small" onClick={() => setCursor(addMonths(cursor, 1))} sx={{ borderRadius: 1.25 }}>
            <ChevronRight fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      {calendarTableMissing && (
        <Card sx={{ mb: 2, bgcolor: 'rgba(91,141,239,0.06)', border: '1px solid rgba(91,141,239,0.25)' }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="caption" color="text.secondary">
              No <code>calendar_events</code> table yet. Run <code>migrations/005_calendar_events.sql</code> in Supabase, then have your AI agent sync Google Calendar to it.
            </Typography>
          </CardContent>
        </Card>
      )}

      <Card sx={{ '&:hover': { transform: 'none' }, bgcolor: 'rgba(255,255,255,0.012)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
          {/* Weekday header */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.625, mb: 1, px: 0.5 }}>
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
              <Typography
                key={d}
                variant="caption"
                sx={{
                  textAlign: 'center',
                  fontWeight: 600,
                  letterSpacing: 1.2,
                  fontSize: '0.65rem',
                  color: 'text.secondary',
                  opacity: 0.6,
                }}
              >
                {d}
              </Typography>
            ))}
          </Box>

          {/* Day grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.625 }}>
            {padding.map((_, i) => <Box key={`pad-${i}`} />)}
            {days.map(d => {
              const key = format(d, 'yyyy-MM-dd');
              const dayEvents = eventsByDay.get(key) ?? [];
              const today = isToday(d);
              const score = scoresByDay.get(key) ?? null;
              const accent = scoreAccent(score);
              const fill = scoreFill(score);

              return (
                <Box
                  key={key}
                  onClick={() => setSelectedDate(d)}
                  sx={{
                    position: 'relative',
                    minHeight: 96,
                    p: 0.875,
                    pt: 0.625,
                    borderRadius: 2,
                    cursor: 'pointer',
                    bgcolor: fill,
                    border: today
                      ? '1.5px solid rgba(91,141,239,0.85)'
                      : '1px solid rgba(255,255,255,0.04)',
                    transition: 'background-color 0.15s, border-color 0.15s, transform 0.1s',
                    overflow: 'hidden',
                    '&:hover': {
                      bgcolor: score === null ? 'rgba(255,255,255,0.05)' : fill.replace(/[\d.]+\)$/, '0.24)'),
                      borderColor: 'rgba(255,255,255,0.18)',
                    },
                    '&::before': score !== null ? {
                      content: '""',
                      position: 'absolute',
                      top: 0, left: 0, right: 0,
                      height: 2,
                      bgcolor: accent,
                      opacity: 0.85,
                    } : undefined,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    {today ? (
                      <Box sx={{
                        width: 22, height: 22, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        bgcolor: '#5B8DEF',
                      }}>
                        <Typography variant="caption" fontWeight={700} sx={{ color: '#fff', fontSize: '0.72rem' }}>
                          {format(d, 'd')}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 500,
                          color: 'text.primary',
                          opacity: 0.8,
                          fontSize: '0.78rem',
                        }}
                      >
                        {format(d, 'd')}
                      </Typography>
                    )}
                    {score !== null && (
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          color: accent,
                          opacity: 0.9,
                          letterSpacing: 0.3,
                        }}
                      >
                        {Math.round(score)}
                      </Typography>
                    )}
                  </Box>

                  {dayEvents.length > 0 && (
                    <Stack spacing={0.3}>
                      {dayEvents.slice(0, 3).map(e => (
                        <Box
                          key={e.id}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setSelectedEvent(e);
                          }}
                          sx={{
                            bgcolor: `${colorForCategory(e.category)}26`,
                            borderLeft: `2px solid ${colorForCategory(e.category)}`,
                            px: 0.625, py: 0.2,
                            borderRadius: 0.75,
                            cursor: 'pointer',
                            transition: 'background-color 0.1s',
                            '&:hover': { bgcolor: `${colorForCategory(e.category)}40` },
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: '0.64rem',
                              fontWeight: 500,
                              display: 'block',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              textDecoration: e.status === 'cancelled' ? 'line-through' : 'none',
                              opacity: e.status === 'cancelled' ? 0.5 : 0.95,
                              lineHeight: 1.35,
                            }}
                          >
                            {e.title}
                          </Typography>
                        </Box>
                      ))}
                      {dayEvents.length > 3 && (
                        <Typography variant="caption" sx={{ fontSize: '0.6rem', opacity: 0.5, pl: 0.5 }}>
                          +{dayEvents.length - 3} more
                        </Typography>
                      )}
                    </Stack>
                  )}
                </Box>
              );
            })}
          </Box>

          {/* Legend */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, pt: 1.5, borderTop: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', letterSpacing: 0.8, opacity: 0.7 }}>
              LIFE SCORE
            </Typography>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <ScoreDot label="80+" color="#4CAF50" />
              <ScoreDot label="60+" color="#5B8DEF" />
              <ScoreDot label="40+" color="#FF9800" />
              <ScoreDot label="<40" color="#F44336" />
              <ScoreDot label="—" color="#7d8590" />
            </Stack>
          </Box>
        </CardContent>
      </Card>

      <DayDrawer
        date={selectedDate}
        onClose={() => setSelectedDate(null)}
        events={selectedDate ? eventsByDay.get(format(selectedDate, 'yyyy-MM-dd')) ?? [] : []}
        sleep={sleep}
        workouts={workouts}
        meals={meals}
        transactions={transactions}
        onEventClick={setSelectedEvent}
      />

      <EventDetailDialog event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </Box>
  );
};

const ScoreDot: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.625 }}>
    <Box sx={{ width: 14, height: 3, borderRadius: 1.5, bgcolor: color, opacity: 0.85 }} />
    <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', fontWeight: 500 }}>{label}</Typography>
  </Box>
);

const EventDetailDialog: React.FC<{ event: CalendarEvent | null; onClose: () => void }> = ({ event, onClose }) => {
  if (!event) return null;
  const accent = colorForCategory(event.category);
  const start = parseISO(event.start_time);
  const end = parseISO(event.end_time);
  const sameDay = isSameDay(start, end);

  return (
    <Dialog open={!!event} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogContent sx={{ p: 0, position: 'relative' }}>
        <Box sx={{ height: 4, bgcolor: accent }} />
        <IconButton onClick={onClose} sx={{ position: 'absolute', top: 8, right: 8 }}>
          <Close />
        </IconButton>
        <Box sx={{ p: 2.5 }}>
          <Typography variant="h6" sx={{ pr: 4, textDecoration: event.status === 'cancelled' ? 'line-through' : 'none', mb: 0.5 }}>
            {event.title}
          </Typography>
          {event.category && (
            <Chip label={event.category} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: `${accent}22`, color: accent, border: `1px solid ${accent}55`, mb: 1.5 }} />
          )}
          {event.status === 'cancelled' && (
            <Chip label="cancelled" size="small" color="error" sx={{ height: 18, fontSize: '0.65rem', ml: 0.5, mb: 1.5 }} />
          )}

          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
              <Schedule sx={{ fontSize: 18, color: 'text.secondary', mt: 0.25 }} />
              <Box>
                <Typography variant="body2">
                  {event.all_day
                    ? `${format(start, 'EEEE, MMM d')} · All day`
                    : sameDay
                      ? `${format(start, 'EEEE, MMM d')} · ${format(start, 'h:mma').toLowerCase()}–${format(end, 'h:mma').toLowerCase()}`
                      : `${format(start, 'MMM d, h:mma').toLowerCase()} → ${format(end, 'MMM d, h:mma').toLowerCase()}`
                  }
                </Typography>
              </Box>
            </Box>

            {event.location && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                <LocationOn sx={{ fontSize: 18, color: 'text.secondary', mt: 0.25 }} />
                <Typography variant="body2">{event.location}</Typography>
              </Box>
            )}

            {event.source_calendar_name && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                <CalendarMonth sx={{ fontSize: 18, color: 'text.secondary', mt: 0.25 }} />
                <Typography variant="body2" color="text.secondary">
                  {event.source_calendar_name}
                  {event.source && event.source !== event.source_calendar_name && (
                    <Typography component="span" variant="caption" sx={{ ml: 0.75, opacity: 0.7 }}>
                      · {event.source}
                    </Typography>
                  )}
                </Typography>
              </Box>
            )}

            {event.description && (
              <>
                <Divider sx={{ opacity: 0.3 }} />
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                  {event.description}
                </Typography>
              </>
            )}
          </Stack>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

interface DayDrawerProps {
  date: Date | null;
  onClose: () => void;
  events: CalendarEvent[];
  sleep: Array<{ date: string; hours: number | null; went_to_bed_at: string | null; woke_up_at: string | null }>;
  workouts: Array<{ date: string; name: string | null; duration_min: number | null }>;
  meals: Array<{ date: string; meal_type: string | null; description: string | null; calories: number | null; protein_g: number | null }>;
  transactions: any[];
  onEventClick: (event: CalendarEvent) => void;
}

const DayDrawer: React.FC<DayDrawerProps> = ({ date, onClose, events, sleep, workouts, meals, transactions, onEventClick }) => {
  if (!date) return null;
  const key = format(date, 'yyyy-MM-dd');

  const sleepRow = sleep.find(s => s.date === key);
  const dayWorkouts = workouts.filter(w => w.date === key);
  const dayMeals = meals.filter(m => m.date === key);
  const dayCals = dayMeals.reduce((s, m) => s + (m.calories ?? 0), 0);
  const dayProtein = dayMeals.reduce((s, m) => s + (m.protein_g ?? 0), 0);
  const dayTxs = transactions.filter((t: any) => t.date === key && isRealSpend(t));
  const daySpend = dayTxs.reduce((s: number, t: any) => s + Math.abs(t.amount), 0);

  return (
    <Drawer
      anchor="right"
      open={!!date}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 460 }, bgcolor: '#0d1117' } }}
    >
      <Box sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box>
            <Typography variant="h6">{format(date, 'EEEE')}</Typography>
            <Typography variant="body2" color="text.secondary">{format(date, 'MMMM d, yyyy')}</Typography>
          </Box>
          <IconButton onClick={onClose}><Close /></IconButton>
        </Box>

        {/* Calendar events */}
        <Section icon={<EventIcon sx={{ color: '#5B8DEF' }} />} label="Events">
          {events.length === 0 ? (
            <Empty>No calendar events</Empty>
          ) : (
            <Stack spacing={0.75}>
              {events.map(e => (
                <Box
                  key={e.id}
                  onClick={() => onEventClick(e)}
                  sx={{
                    p: 1.25, borderRadius: 1.5,
                    bgcolor: `${colorForCategory(e.category)}11`,
                    borderLeft: `3px solid ${colorForCategory(e.category)}`,
                    cursor: 'pointer',
                    transition: 'background-color 0.1s',
                    '&:hover': { bgcolor: `${colorForCategory(e.category)}22` },
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <Typography variant="body2" fontWeight={600} sx={{ textDecoration: e.status === 'cancelled' ? 'line-through' : 'none' }}>
                      {e.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {e.all_day ? 'All day' : `${format(parseISO(e.start_time), 'h:mma').toLowerCase()}–${format(parseISO(e.end_time), 'h:mma').toLowerCase()}`}
                    </Typography>
                  </Box>
                  {e.location && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{e.location}</Typography>}
                  {e.category && <Chip label={e.category} size="small" sx={{ height: 16, fontSize: '0.6rem', mt: 0.25, bgcolor: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }} />}
                </Box>
              ))}
            </Stack>
          )}
        </Section>

        <Section icon={<Bedtime sx={{ color: '#764ba2' }} />} label="Sleep">
          {sleepRow?.hours == null ? <Empty>Not logged</Empty> : (
            <Typography variant="body2">
              {sleepRow.hours.toFixed(1)}h
              {sleepRow.went_to_bed_at && sleepRow.woke_up_at && (
                <Typography component="span" variant="caption" color="text.secondary">
                  {' '}· {format(parseISO(sleepRow.went_to_bed_at), 'h:mma').toLowerCase()}–{format(parseISO(sleepRow.woke_up_at), 'h:mma').toLowerCase()}
                </Typography>
              )}
            </Typography>
          )}
        </Section>

        <Section icon={<FitnessCenter sx={{ color: '#FF9800' }} />} label="Workouts">
          {dayWorkouts.length === 0 ? <Empty>No workouts</Empty> : (
            <Stack spacing={0.5}>
              {dayWorkouts.map((w, i) => (
                <Typography key={i} variant="body2">
                  {w.name}
                  {w.duration_min && <Typography component="span" variant="caption" color="text.secondary"> · {w.duration_min}min</Typography>}
                </Typography>
              ))}
            </Stack>
          )}
        </Section>

        <Section icon={<Restaurant sx={{ color: '#5B8DEF' }} />} label="Meals">
          {dayMeals.length === 0 ? <Empty>Nothing logged</Empty> : (
            <>
              <Typography variant="body2" sx={{ mb: 0.75 }}>
                {dayMeals.length} meals · {Math.round(dayCals)} cal · {Math.round(dayProtein)}g protein
              </Typography>
              <Stack spacing={0.4}>
                {dayMeals.map((m, i) => (
                  <Typography key={i} variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {m.meal_type && <strong style={{ textTransform: 'capitalize', color: '#fff' }}>{m.meal_type}: </strong>}
                    {m.description || '(no description)'}
                  </Typography>
                ))}
              </Stack>
            </>
          )}
        </Section>

        <Section icon={<AttachMoney sx={{ color: '#4CAF50' }} />} label="Spend">
          {dayTxs.length === 0 ? <Empty>$0</Empty> : (
            <>
              <Typography variant="body2" sx={{ mb: 0.75 }}>
                {formatCurrency(daySpend)} · {dayTxs.length} txn{dayTxs.length === 1 ? '' : 's'}
              </Typography>
              <Stack spacing={0.4}>
                {dayTxs.map((t: any) => (
                  <Box key={t.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.merchant_name || t.description}
                    </Typography>
                    <Typography variant="caption" fontWeight={600}>{formatCurrency(Math.abs(t.amount))}</Typography>
                  </Box>
                ))}
              </Stack>
            </>
          )}
        </Section>
      </Box>
    </Drawer>
  );
};

const Section: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (
  <>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, mb: 1 }}>
      {icon}
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2 }}>{label}</Typography>
    </Box>
    {children}
    <Divider sx={{ mt: 1.5, opacity: 0.3 }} />
  </>
);

const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography variant="caption" color="text.secondary">{children}</Typography>
);

export default CalendarPage;
