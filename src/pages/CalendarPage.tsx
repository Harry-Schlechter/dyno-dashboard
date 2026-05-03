import React, { useMemo, useState } from 'react';
import {
  Box, Typography, Card, CardContent, IconButton, Stack, Drawer, Chip, Divider,
  Tooltip,
} from '@mui/material';
import {
  ChevronLeft, ChevronRight, Close, FitnessCenter, Restaurant, Bedtime, AttachMoney,
  Event as EventIcon,
} from '@mui/icons-material';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isToday,
  parseISO, isSameDay,
} from 'date-fns';
import { useSupabase } from '../hooks/useSupabase';
import { useLifeScore } from '../hooks/useLifeScore';
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

const colorForScore = (score: number | null): string => {
  if (score === null) return 'rgba(255,255,255,0.04)';
  if (score >= 85) return 'rgba(76,175,80,0.55)';
  if (score >= 70) return 'rgba(76,175,80,0.30)';
  if (score >= 55) return 'rgba(91,141,239,0.30)';
  if (score >= 40) return 'rgba(255,152,0,0.30)';
  return 'rgba(244,67,54,0.30)';
};

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

const CalendarPage: React.FC = () => {
  const [cursor, setCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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

  const { dailyScoreOn, loading: scoreLoading } = useLifeScore();

  // Pre-compute scores for visible days
  const scoresByDay = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const d of days) {
      const key = format(d, 'yyyy-MM-dd');
      map.set(key, dailyScoreOn(key));
    }
    return map;
  }, [days, dailyScoreOn]);

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

  const loading = eventsLoading || sleepLoading || workoutsLoading || mealsLoading || finLoading || scoreLoading;
  if (loading) return <LoadingSkeleton variant="card" count={2} />;

  // Pad start of grid with blanks so day-1 lands on the correct weekday
  const padding = Array.from({ length: startWeekday });

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>{format(cursor, 'MMMM yyyy')}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Daily life scores, events, workouts, meals, and spend
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.5}>
          <IconButton onClick={() => setCursor(subMonths(cursor, 1))}><ChevronLeft /></IconButton>
          <IconButton onClick={() => setCursor(new Date())} sx={{ fontSize: 13, px: 1.5 }}>
            <Typography variant="caption">Today</Typography>
          </IconButton>
          <IconButton onClick={() => setCursor(addMonths(cursor, 1))}><ChevronRight /></IconButton>
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

      <Card sx={{ '&:hover': { transform: 'none' } }}>
        <CardContent>
          {/* Weekday header */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 0.75 }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <Typography key={d} variant="caption" color="text.secondary" sx={{ textAlign: 'center', fontWeight: 600, letterSpacing: 1 }}>
                {d}
              </Typography>
            ))}
          </Box>

          {/* Day grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
            {padding.map((_, i) => <Box key={`pad-${i}`} />)}
            {days.map(d => {
              const key = format(d, 'yyyy-MM-dd');
              const score = scoresByDay.get(key) ?? null;
              const dayEvents = eventsByDay.get(key) ?? [];
              const today = isToday(d);
              return (
                <Box
                  key={key}
                  onClick={() => setSelectedDate(d)}
                  sx={{
                    minHeight: 90,
                    p: 0.75,
                    borderRadius: 1.5,
                    cursor: 'pointer',
                    bgcolor: colorForScore(score),
                    border: today ? '2px solid #5B8DEF' : '1px solid rgba(255,255,255,0.04)',
                    transition: 'transform 0.1s, border-color 0.1s',
                    '&:hover': { transform: 'translateY(-1px)', borderColor: 'rgba(255,255,255,0.2)' },
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <Typography variant="caption" fontWeight={today ? 700 : 500}>{format(d, 'd')}</Typography>
                    {score !== null && (
                      <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 700, opacity: 0.85 }}>
                        {Math.round(score)}
                      </Typography>
                    )}
                  </Box>
                  {dayEvents.length > 0 && (
                    <Stack spacing={0.25} sx={{ mt: 0.5 }}>
                      {dayEvents.slice(0, 3).map(e => (
                        <Tooltip key={e.id} title={`${e.title}${e.location ? ` · ${e.location}` : ''}`}>
                          <Box sx={{
                            display: 'flex', alignItems: 'center', gap: 0.5,
                            bgcolor: `${colorForCategory(e.category)}22`,
                            borderLeft: `2px solid ${colorForCategory(e.category)}`,
                            px: 0.5, py: 0.1, borderRadius: 0.5,
                          }}>
                            <Typography
                              variant="caption"
                              sx={{
                                fontSize: '0.6rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                textDecoration: e.status === 'cancelled' ? 'line-through' : 'none',
                                opacity: e.status === 'cancelled' ? 0.5 : 1,
                              }}
                            >
                              {e.all_day ? '' : `${format(parseISO(e.start_time), 'h:mma').toLowerCase()} `}
                              {e.title}
                            </Typography>
                          </Box>
                        </Tooltip>
                      ))}
                      {dayEvents.length > 3 && (
                        <Typography variant="caption" sx={{ fontSize: '0.6rem', opacity: 0.6 }}>
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, pt: 1.5, borderTop: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', gap: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" color="text.secondary">Life Score:</Typography>
              <ScoreSwatch label="85+" color={colorForScore(90)} />
              <ScoreSwatch label="70+" color={colorForScore(75)} />
              <ScoreSwatch label="55+" color={colorForScore(60)} />
              <ScoreSwatch label="40+" color={colorForScore(45)} />
              <ScoreSwatch label="<40" color={colorForScore(20)} />
              <ScoreSwatch label="no data" color={colorForScore(null)} />
            </Stack>
          </Box>
        </CardContent>
      </Card>

      <DayDrawer
        date={selectedDate}
        onClose={() => setSelectedDate(null)}
        events={selectedDate ? eventsByDay.get(format(selectedDate, 'yyyy-MM-dd')) ?? [] : []}
        score={selectedDate ? scoresByDay.get(format(selectedDate, 'yyyy-MM-dd')) ?? null : null}
        sleep={sleep}
        workouts={workouts}
        meals={meals}
        transactions={transactions}
      />
    </Box>
  );
};

const ScoreSwatch: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
    <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: color, border: '1px solid rgba(255,255,255,0.08)' }} />
    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>{label}</Typography>
  </Box>
);

interface DayDrawerProps {
  date: Date | null;
  onClose: () => void;
  events: CalendarEvent[];
  score: number | null;
  sleep: Array<{ date: string; hours: number | null; went_to_bed_at: string | null; woke_up_at: string | null }>;
  workouts: Array<{ date: string; name: string | null; duration_min: number | null }>;
  meals: Array<{ date: string; meal_type: string | null; description: string | null; calories: number | null; protein_g: number | null }>;
  transactions: any[];
}

const DayDrawer: React.FC<DayDrawerProps> = ({ date, onClose, events, score, sleep, workouts, meals, transactions }) => {
  if (!date) return null;
  const key = format(date, 'yyyy-MM-dd');

  const sleepRow = sleep.find(s => s.date === key);
  const dayWorkouts = workouts.filter(w => w.date === key);
  const dayMeals = meals.filter(m => m.date === key);
  const dayCals = dayMeals.reduce((s, m) => s + (m.calories ?? 0), 0);
  const dayProtein = dayMeals.reduce((s, m) => s + (m.protein_g ?? 0), 0);
  const dayTxs = transactions.filter((t: any) => t.date === key && isRealSpend(t));
  const daySpend = dayTxs.reduce((s: number, t: any) => s + Math.abs(t.amount), 0);

  const scoreColor = score === null ? '#7d8590' : score >= 80 ? '#4CAF50' : score >= 60 ? '#5B8DEF' : score >= 40 ? '#FF9800' : '#F44336';

  return (
    <Drawer
      anchor="right"
      open={!!date}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 460 }, bgcolor: '#0d1117' } }}
    >
      <Box sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6">{format(date, 'EEEE')}</Typography>
            <Typography variant="body2" color="text.secondary">{format(date, 'MMMM d, yyyy')}</Typography>
          </Box>
          <IconButton onClick={onClose}><Close /></IconButton>
        </Box>

        {/* Life Score */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5, p: 2, borderRadius: 2, bgcolor: `${scoreColor}11`, border: `1px solid ${scoreColor}33` }}>
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>Life Score</Typography>
            <Typography variant="h3" fontWeight={700} sx={{ color: scoreColor, lineHeight: 1 }}>
              {score === null ? '—' : Math.round(score)}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
            {score === null ? 'No data for this day' : score >= 80 ? 'Crushing it' : score >= 60 ? 'Solid' : score >= 40 ? 'Room to grow' : 'Rough day'}
          </Typography>
        </Box>

        {/* Calendar events */}
        <Section icon={<EventIcon sx={{ color: '#5B8DEF' }} />} label="Events">
          {events.length === 0 ? (
            <Empty>No calendar events</Empty>
          ) : (
            <Stack spacing={0.75}>
              {events.map(e => (
                <Box key={e.id} sx={{
                  p: 1.25, borderRadius: 1.5,
                  bgcolor: `${colorForCategory(e.category)}11`,
                  borderLeft: `3px solid ${colorForCategory(e.category)}`,
                }}>
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
