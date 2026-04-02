import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Stack,
  IconButton,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  Alert,
  Paper,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SyncIcon from '@mui/icons-material/Sync';
import AddIcon from '@mui/icons-material/Add';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { calendarEventsApi } from '../api/calendarEvents';
import { plannerApi } from '../api/planner';
import { useAuth } from '../auth/AuthProvider';
import * as calendarApi from '../api/calendarApi';
import { authApi } from '../api/auth';
import { TagSelector } from '../components/TagSelector';
import { tagsApi } from '../api/tags';
import { relationshipsApi } from '../api/relationships';
import type { Tag, Relationship, AccountInfo } from '@life-os/shared';
import { useFilteredData } from '../hooks/useFilteredData';
import { useNavigate } from 'react-router-dom';

dayjs.extend(isoWeek);

interface CalendarEvent {
  id: string;
  user_id: string;
  provider: string;
  calendar_id: string;
  provider_event_id: string | null;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  created_at: string;
  updated_at: string;
  status: string | null;
  tag_id: string | null;
  relationship_id: string | null;
}

interface PlannerItem {
  id: string;
  user_id: string;
  week_start: string;
  day_of_week: number;
  title: string;
  notes: string | null;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
  completed: boolean;
  completed_at: string | null;
  calendar_event_id: string | null;
  tag_id: string | null;
}

interface CalendarDay {
  date: dayjs.Dayjs;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
  plannerItems: PlannerItem[];
}

export function CalendarPage() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(dayjs().startOf('month'));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const filteredEvents = useFilteredData(events);
  const [tags, setTags] = useState<Tag[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [plannerItems, setPlannerItems] = useState<PlannerItem[]>([]);
  const filteredPlannerItems = useFilteredData(plannerItems);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<dayjs.Dayjs | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);

  // Mobile day detail view
  const [dayDetailOpen, setDayDetailOpen] = useState(false);
  const [dayDetailData, setDayDetailData] = useState<CalendarDay | null>(null);

  // Dialog form state
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventStartTime, setEventStartTime] = useState('09:00');
  const [eventEndTime, setEventEndTime] = useState('10:00');
  const [eventAllDay, setEventAllDay] = useState(false);
  const [eventEndDay, setEventEndDay] = useState<dayjs.Dayjs | null>(null);
  const [eventTagId, setEventTagId] = useState<string | null>(null);
  const [eventRelationshipId, setEventRelationshipId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Planner item dialog state
  const [plannerDialogOpen, setPlannerDialogOpen] = useState(false);
  const [editingPlannerItem, setEditingPlannerItem] = useState<PlannerItem | null>(null);
  const [plannerTitle, setPlannerTitle] = useState('');
  const [plannerNotes, setPlannerNotes] = useState('');
  const [plannerStartTime, setPlannerStartTime] = useState<string>('');
  const [plannerEndTime, setPlannerEndTime] = useState<string>('');
  const [plannerTagId, setPlannerTagId] = useState<string | null>(null);

  const loadData = async () => {
    if (!user) return;

    const monthStart = currentMonth.startOf('month');
    const monthEnd = currentMonth.endOf('month');

    // Get the calendar view bounds (including days from prev/next month)
    const calendarStart = monthStart.startOf('week');
    const calendarEnd = monthEnd.endOf('week');

    // Load calendar events for the visible range
    try {
      const eventsData = await calendarEventsApi.getByDateRange(
        calendarStart.format('YYYY-MM-DD'),
        calendarEnd.format('YYYY-MM-DD') + 'T23:59:59'
      );
      setEvents(eventsData);
    } catch (error) {
      console.error('Failed to load calendar events:', error);
    }

    // Load planner items for all weeks in the visible range
    const weeksInView: string[] = [];
    let currentWeek = calendarStart;
    while (currentWeek.isBefore(calendarEnd) || currentWeek.isSame(calendarEnd, 'day')) {
      weeksInView.push(currentWeek.format('YYYY-MM-DD'));
      currentWeek = currentWeek.add(1, 'week');
    }

    if (weeksInView.length > 0) {
      try {
        const allPlannerItems = await plannerApi.list();
        const filtered = allPlannerItems
          .filter((item) => weeksInView.includes(item.week_start))
          .sort((a, b) => {
            if (a.day_of_week !== b.day_of_week) {
              return a.day_of_week - b.day_of_week;
            }
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          });

        setPlannerItems(filtered);
      } catch (error) {
        console.error('Failed to load planner items:', error);
      }
    }
  };

  const loadTags = async () => {
    try {
      const data = await tagsApi.list();
      setTags(data);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const loadRelationships = async () => {
    try {
      const data = await relationshipsApi.list();
      setRelationships(data);
    } catch (error) {
      console.error('Failed to load relationships:', error);
    }
  };

  const getTagById = (tagId: string | null) => {
    if (!tagId) return null;
    return tags.find((tag) => tag.id === tagId);
  };

  useEffect(() => {
    if (user) {
      loadData();
      loadTags();
      loadRelationships();
      loadAccountInfo();
    }
  }, [currentMonth, user]);

  const loadAccountInfo = async () => {
    try {
      const info = await authApi.getAccountInfo();
      setAccountInfo(info);
    } catch (error) {
      console.error('Failed to load account info:', error);
    }
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(currentMonth.subtract(1, 'month'));
  };

  const handleNextMonth = () => {
    setCurrentMonth(currentMonth.add(1, 'month'));
  };

  const handleThisMonth = () => {
    setCurrentMonth(dayjs().startOf('month'));
  };

  const handleSyncMonth = async () => {
    // Check if Google is linked
    const googleLinked = accountInfo?.linked_accounts?.some(acc => acc.provider === 'google');

    if (!googleLinked) {
      if (window.confirm('You need to link your Google account first. Go to Settings?')) {
        navigate('/settings');
      }
      return;
    }

    setSyncing(true);
    setSyncMessage(null);

    try {
      const monthStart = currentMonth.startOf('month');
      const monthEnd = currentMonth.endOf('month');

      // Call sync function - server will use stored Google tokens
      const result = await calendarApi.syncWeek(
        monthStart.toISOString(),
        monthEnd.toISOString()
      );

      setSyncMessage(
        `Synced ${result.synced} events from Google (${result.total_events} total), created ${result.planner_items_created} planner items`
      );

      await loadData();
    } catch (error) {
      console.error('Sync error:', error);
      setSyncMessage(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  // Helper function to format time string (HH:mm:ss -> HH:mm)
  const formatTime = (timeString: string | null): string => {
    if (!timeString) return '';
    // If time is in HH:mm:ss format, extract HH:mm
    const parts = timeString.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }
    return timeString;
  };

  const handleOpenDialog = (date: dayjs.Dayjs) => {
    setSelectedDay(date);
    setEditingEvent(null);
    setEventTitle('');
    setEventDescription('');
    setEventStartTime('09:00');
    setEventEndTime('10:00');
    setEventAllDay(false);
    setEventEndDay(date);
    setEventTagId(null);
    setEventRelationshipId(null);
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (event: CalendarEvent) => {
    const startDate = dayjs(event.starts_at);
    const endDate = dayjs(event.ends_at);

    setEditingEvent(event);
    setSelectedDay(startDate);
    setEventTitle(event.title);
    setEventDescription(event.description || '');
    setEventStartTime(startDate.format('HH:mm'));
    setEventEndTime(endDate.format('HH:mm'));
    setEventAllDay(event.all_day);
    // For multi-day events or all-day events, set the end day
    if (event.all_day) {
      const eventEndDate = event.ends_at.split('T')[0];
      setEventEndDay(dayjs(eventEndDate));
    } else {
      setEventEndDay(endDate);
    }
    setEventTagId(event.tag_id || null);
    setEventRelationshipId(event.relationship_id || null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedDay(null);
    setEditingEvent(null);
  };

  const handleDayClick = (day: CalendarDay, isMobile: boolean) => {
    if (isMobile) {
      setDayDetailData(day);
      setDayDetailOpen(true);
    } else {
      // On desktop, open new event dialog
      handleOpenDialog(day.date);
    }
  };

  const handleCloseDayDetail = () => {
    setDayDetailOpen(false);
    setDayDetailData(null);
  };

  const handleSaveEvent = async () => {
    if (!eventTitle.trim() || !selectedDay || !eventEndDay) return;

    setSaving(true);

    try {
      // For all-day events being edited, preserve the original starts_at/ends_at
      // to avoid timezone conversion issues
      const startsAt = eventAllDay && editingEvent?.all_day
        ? editingEvent.starts_at
        : eventAllDay
        ? selectedDay.startOf('day').toISOString()
        : selectedDay
            .hour(parseInt(eventStartTime.split(':')[0]))
            .minute(parseInt(eventStartTime.split(':')[1]))
            .toISOString();

      const endsAt = eventAllDay && editingEvent?.all_day
        ? editingEvent.ends_at
        : eventAllDay
        ? eventEndDay.endOf('day').toISOString()
        : eventEndDay
            .hour(parseInt(eventEndTime.split(':')[0]))
            .minute(parseInt(eventEndTime.split(':')[1]))
            .toISOString();

      if (editingEvent) {
        // Update existing event
        await calendarEventsApi.update(editingEvent.id, {
          title: eventTitle.trim(),
          description: eventDescription.trim() || null,
          starts_at: startsAt,
          ends_at: endsAt,
          all_day: eventAllDay,
          tag_id: eventTagId,
          relationship_id: eventRelationshipId,
        });
      } else {
        // Create new event via Google Calendar API
        await calendarApi.createGoogleEvent({
          title: eventTitle.trim(),
          description: eventDescription.trim() || undefined,
          starts_at: startsAt,
          ends_at: endsAt,
          all_day: eventAllDay,
          tag_id: eventTagId,
          relationship_id: eventRelationshipId,
        });
      }

      handleCloseDialog();
      await loadData();
    } catch (error) {
      console.error('Failed to save event:', error);
      alert(error instanceof Error ? error.message : 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenPlannerDialog = (item: PlannerItem) => {
    setEditingPlannerItem(item);
    setPlannerTitle(item.title);
    setPlannerNotes(item.notes || '');
    setPlannerStartTime(formatTime(item.start_time) || '');
    setPlannerEndTime(formatTime(item.end_time) || '');
    setPlannerTagId(item.tag_id || null);
    setPlannerDialogOpen(true);
  };

  const handleClosePlannerDialog = () => {
    setPlannerDialogOpen(false);
    setEditingPlannerItem(null);
    setPlannerTitle('');
    setPlannerNotes('');
    setPlannerStartTime('');
    setPlannerEndTime('');
    setPlannerTagId(null);
  };

  const handleSavePlannerItem = async () => {
    if (!plannerTitle.trim() || !editingPlannerItem) return;

    setSaving(true);

    try {
      await plannerApi.update(editingPlannerItem.id, {
        title: plannerTitle.trim(),
        notes: plannerNotes.trim() || null,
        start_time: plannerStartTime || null,
        end_time: plannerEndTime || null,
        tag_id: plannerTagId,
      });

      handleClosePlannerDialog();
      await loadData();
    } catch (error) {
      console.error('Failed to save planner item:', error);
      alert(error instanceof Error ? error.message : 'Failed to save planner item');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlannerItem = async () => {
    if (!editingPlannerItem) return;

    if (!confirm('Are you sure you want to delete this task?')) return;

    setSaving(true);

    try {
      await plannerApi.delete(editingPlannerItem.id);
      handleClosePlannerDialog();
      await loadData();
    } catch (error) {
      console.error('Failed to delete planner item:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete task');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!editingEvent) return;

    if (!confirm('Are you sure you want to delete this event?')) return;

    setSaving(true);

    try {
      await calendarEventsApi.delete(editingEvent.id);
      handleCloseDialog();
      await loadData();
    } catch (error) {
      console.error('Failed to delete event:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete event');
    } finally {
      setSaving(false);
    }
  };

  // Helper to calculate which row each all-day event should appear in to avoid overlaps
  const calculateEventRows = (events: CalendarEvent[], weekStart: dayjs.Dayjs) => {
    const allDayEvents = events.filter(e => e.all_day);
    const eventRows = new Map<string, number>();
    
    // Sort events by start date, then by duration (longer events first)
    const sortedEvents = [...allDayEvents].sort((a, b) => {
      const aStart = dayjs(a.starts_at.split('T')[0]);
      const bStart = dayjs(b.starts_at.split('T')[0]);
      const startDiff = aStart.diff(bStart);
      if (startDiff !== 0) return startDiff;
      
      // If same start, longer events come first
      const aEnd = dayjs(a.ends_at.split('T')[0]);
      const bEnd = dayjs(b.ends_at.split('T')[0]);
      return bEnd.diff(bStart) - aEnd.diff(aStart);
    });
    
    // For each day of the week, track which rows are occupied
    const dayRowOccupancy: Map<number, Set<number>> = new Map(); // dayIndex -> Set of row numbers occupied
    for (let i = 0; i < 7; i++) {
      dayRowOccupancy.set(i, new Set());
    }

    sortedEvents.forEach(event => {
      const eventStartDate = event.starts_at.split('T')[0];
      const eventEndDate = event.ends_at.split('T')[0];
      const start = dayjs(eventStartDate);
      const end = dayjs(eventEndDate);
      
      const weekEnd = weekStart.endOf('isoWeek');
      const displayStart = start.isBefore(weekStart, 'day') ? weekStart : start;
      const displayEnd = end.isAfter(weekEnd, 'day') ? weekEnd : end;
      
      // Convert to day indices (0-6 for Mon-Sun)
      const startDay = displayStart.diff(weekStart, 'day');
      const endDay = displayEnd.diff(weekStart, 'day');
      
      // Find the first available row across ALL days this event spans
      let row = 0;
      let foundRow = false;
      
      while (!foundRow) {
        // Check if this row is available for ALL days this event spans
        let rowAvailable = true;
        for (let dayIndex = startDay; dayIndex <= endDay; dayIndex++) {
          const occupiedRows = dayRowOccupancy.get(dayIndex)!;
          if (occupiedRows.has(row)) {
            rowAvailable = false;
            break;
          }
        }
        
        if (rowAvailable) {
          // Mark this row as occupied for all days this event spans
          for (let dayIndex = startDay; dayIndex <= endDay; dayIndex++) {
            dayRowOccupancy.get(dayIndex)!.add(row);
          }
          foundRow = true;
        } else {
          row++;
        }
      }
      
      eventRows.set(event.id, row);
    });

    return eventRows;
  };
  // Build calendar grid (7 columns × ~5-6 rows)
  const buildCalendarDays = (): CalendarDay[] => {
    const monthStart = currentMonth.startOf('month');
    const monthEnd = currentMonth.endOf('month');
    const calendarStart = monthStart.startOf('isoWeek'); // Start from Monday
    const calendarEnd = monthEnd.endOf('isoWeek');

    const days: CalendarDay[] = [];
    let currentDay = calendarStart;

    while (currentDay.isBefore(calendarEnd) || currentDay.isSame(calendarEnd, 'day')) {
      const dateStr = currentDay.format('YYYY-MM-DD');
      const weekStart = currentDay.startOf('isoWeek');
      const dayOfWeek = currentDay.isoWeekday() - 1; // 0 = Mon, 6 = Sun

      // Filter events for this day
      const dayEvents = filteredEvents.filter((event) => {
        const eventStartDate = event.all_day
          ? event.starts_at.split('T')[0]
          : dayjs(event.starts_at).format('YYYY-MM-DD');
        const eventEndDate = event.all_day
          ? event.ends_at.split('T')[0]
          : dayjs(event.ends_at).format('YYYY-MM-DD');

        // Show event if current day falls within the event's date range
        return dateStr >= eventStartDate && dateStr <= eventEndDate;
      });

      // Filter planner items for this day
      const dayPlannerItems = filteredPlannerItems.filter(
        (item) =>
          item.week_start === weekStart.format('YYYY-MM-DD') &&
          item.day_of_week === dayOfWeek &&
          item.calendar_event_id === null // Only show non-calendar planner items
      );

      days.push({
        date: currentDay,
        isCurrentMonth: currentDay.month() === currentMonth.month(),
        isToday: currentDay.isSame(dayjs(), 'day'),
        events: dayEvents,
        plannerItems: dayPlannerItems,
      });

      currentDay = currentDay.add(1, 'day');
    }

    return days;
  };

  const calendarDays = buildCalendarDays();
  const monthLabel = currentMonth.format('MMMM YYYY');
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Show loading state
  if (authLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!user) {
    return (
      <Box sx={{ width: '100%', maxWidth: '600px', mx: 'auto', mt: 8 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
            Calendar
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
            Sign in with Google to sync your calendar and access calendar features.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={signInWithGoogle}
          >
            Sign in with Google
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header with month navigation and sync */}
      <Box sx={{ mb: { xs: 2, sm: 2.5, md: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Calendar
          </Typography>
          <Button
            variant="contained"
            size="small"
            startIcon={<SyncIcon />}
            onClick={handleSyncMonth}
            disabled={syncing}
          >
            {syncing ? 'Syncing...' : 'Sync with Google'}
          </Button>
        </Box>

        {syncMessage && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {syncMessage}
          </Alert>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            onClick={handlePreviousMonth}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': { color: 'primary.main' },
            }}
          >
            <ChevronLeftIcon />
          </IconButton>

          <Button onClick={handleThisMonth} size="small" variant="text" sx={{ minWidth: { xs: 80, sm: 100 } }}>
            This month
          </Button>

          <Typography variant="h5" sx={{ fontWeight: 600, minWidth: { xs: 140, sm: 180 }, textAlign: 'center' }}>
            {monthLabel}
          </Typography>

          <IconButton
            onClick={handleNextMonth}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': { color: 'primary.main' },
            }}
          >
            <ChevronRightIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Calendar grid */}
      <Box
        sx={{
          width: '100%',
          maxWidth: 'none',
          bgcolor: 'background.paper',
          border: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.08)'}`,
          borderRadius: '18px',
          overflow: 'hidden',
          display: 'block',
        }}
      >
        {/* Day headers */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {weekDays.map((day) => (
            <Box
              key={day}
              sx={{
                p: 1.5,
                textAlign: 'center',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                bgcolor: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: '0.65rem', sm: '0.75rem' },
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                }}
              >
                {day}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Calendar days */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {calendarDays.map((day, index) => {
            const hasEvents = day.events.length > 0 || day.plannerItems.length > 0;
            
            return (
              <Box
                key={index}
                sx={{
                  borderRight: (index + 1) % 7 !== 0 ? '1px solid rgba(255, 255, 255, 0.04)' : 'none',
                  borderBottom:
                    index < calendarDays.length - 7 ? '1px solid rgba(255, 255, 255, 0.04)' : 'none',
                  minWidth: 0, // Allow flex items to shrink below content size
                  overflow: 'visible', // Allow events to span across days
                }}
              >
                <Box
                  onClick={(e) => {
                    // Check if click is on an event (child element with onclick)
                    if ((e.target as HTMLElement).closest('[data-event-click]')) {
                      return; // Let event handler take over
                    }
                    // Determine if mobile based on screen size
                    const isMobile = window.innerWidth < 600;
                    handleDayClick(day, isMobile);
                  }}
                  sx={{
                    minHeight: { xs: 50, sm: 120 },
                    p: { xs: 0.5, sm: 1 },
                    bgcolor: day.isCurrentMonth ? 'transparent' : 'rgba(0, 0, 0, 0.2)',
                    position: 'relative',
                    cursor: 'pointer',
                    width: '100%', // Ensure inner box respects parent width
                    boxSizing: 'border-box',
                    '&:hover': {
                      bgcolor: day.isCurrentMonth
                        ? 'rgba(255, 255, 255, 0.03)'
                        : 'rgba(0, 0, 0, 0.15)',
                    },
                  }}
                >
                {/* Date number */}
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: { xs: 'center', sm: 'space-between' }, 
                  alignItems: { xs: 'center', sm: 'flex-start' }, 
                  mb: { xs: 0, sm: 0.5 },
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: { xs: 0.5, sm: 0 },
                }}>
                  <Box
                    sx={{
                      width: { xs: 32, sm: 28 },
                      height: { xs: 32, sm: 28 },
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      bgcolor: day.isToday ? 'primary.main' : 'transparent',
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: { xs: '0.8rem', sm: '0.875rem' },
                        fontWeight: day.isToday ? 700 : 500,
                        color: day.isToday
                          ? 'primary.contrastText'
                          : day.isCurrentMonth
                          ? 'text.primary'
                          : 'text.secondary',
                      }}
                    >
                      {day.date.date()}
                    </Typography>
                  </Box>

                  {/* Mobile: Show dots if there are events */}
                  <Box 
                    sx={{ 
                      display: { xs: hasEvents ? 'flex' : 'none', sm: 'none' },
                      gap: 0.5,
                      justifyContent: 'center',
                    }}
                  >
                    {hasEvents && (
                      <Box
                        sx={{
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                        }}
                      />
                    )}
                  </Box>
                </Box>

                {/* Desktop: Events list */}
                <Stack spacing={0.5} sx={{ display: { xs: 'none', sm: 'flex' }, width: '100%', minWidth: 0, position: 'relative', pt: 0 }}>
                  {/* All-day events - shown separately at the top with spanning */}
                  {(() => {
                    const weekStart = day.date.startOf('isoWeek');
                    const weekEvents = calendarDays
                      .filter(d => d.date.isSame(weekStart, 'week'))
                      .flatMap(d => d.events)
                      .filter((event) => event.all_day);
                    
                    // Remove duplicates
                    const uniqueWeekEvents = Array.from(new Map(weekEvents.map(e => [e.id, e])).values());
                    
                    // Calculate rows for entire week to maintain consistency
                    const eventRows = calculateEventRows(uniqueWeekEvents, weekStart);
                    
                    const allDayEventsToRender = day.events
                      .filter((event) => event.all_day)
                      .filter((event) => {
                        // Only show events in first 5 rows
                        const row = eventRows.get(event.id);
                        if (row === undefined || row >= 5) return false;
                        
                        // Only show all-day event ONCE - on the first day it appears in this week
                        const eventStartDate = event.starts_at.split('T')[0];
                        const eventStart = dayjs(eventStartDate);
                        
                        // Determine the first day this event should appear in this week
                        let firstDayInWeek: dayjs.Dayjs;
                        if (eventStart.isBefore(weekStart, 'day')) {
                          // Event started before this week, show on Monday
                          firstDayInWeek = weekStart;
                        } else if (eventStart.isSame(weekStart, 'week')) {
                          // Event starts this week, show on its start date
                          firstDayInWeek = eventStart;
                        } else {
                          // Event doesn't belong in this week
                          return false;
                        }
                        
                        // Only render on the first day
                        return day.date.isSame(firstDayInWeek, 'day');
                      })
                      .map((event) => {
                        const eventStartDate = event.starts_at.split('T')[0];
                        const eventEndDate = event.ends_at.split('T')[0];
                        const start = dayjs(eventStartDate);
                        const end = dayjs(eventEndDate);
                        
                        // Calculate how many days to span within this week
                        const weekEnd = day.date.endOf('isoWeek');
                        
                        // Actual start in this week (could be Monday if event started earlier)
                        const displayStart = start.isBefore(weekStart) ? weekStart : start;
                        // Actual end in this week (could be Sunday if event continues beyond)
                        const displayEnd = end.isAfter(weekEnd) ? weekEnd : end;
                        
                        const daysToSpan = displayEnd.diff(displayStart, 'day') + 1;
                        const row = eventRows.get(event.id) || 0;

                        return (
                          <Box
                            key={event.id}
                            data-event-click="true"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditDialog(event);
                            }}
                            sx={{
                              px: 0.5,
                            py: 0.25,
                            bgcolor: event.tag_id && getTagById(event.tag_id)
                              ? `${getTagById(event.tag_id)!.color}33`
                              : (theme) => `${theme.palette.primary.main}26`,
                            borderLeft: '3px solid',
                            borderColor: event.tag_id && getTagById(event.tag_id)
                              ? getTagById(event.tag_id)!.color
                              : 'primary.main',
                            borderRadius: 1,
                            cursor: 'pointer',
                            minWidth: 0,
                            // Calculate width to span multiple grid cells including borders
                            width: daysToSpan > 1 
                              ? `calc(${daysToSpan * 100}% + ${(daysToSpan - 1)}px)` 
                              : '100%',
                            position: 'absolute',
                            top: `${row * 20}px`, // 20px per row for multi-day events
                            left: 0,
                            zIndex: 10,
                            boxSizing: 'border-box',
                            '&:hover': {
                              bgcolor: event.tag_id && getTagById(event.tag_id)
                                ? `${getTagById(event.tag_id)!.color}55`
                                : (theme) => `${theme.palette.primary.main}40`,
                            },
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              color: event.tag_id && getTagById(event.tag_id)
                                ? getTagById(event.tag_id)!.color
                                : 'primary.main',
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              width: '100%',
                            }}
                          >
                            {event.title}
                          </Typography>
                        </Box>
                      );
                    });
                    
                    return allDayEventsToRender;
                  })()}

                  {/* Spacer for all-day events - height based on events that actually span THIS day */}
                  <Box sx={{ height: `${(() => {
                    const weekStart = day.date.startOf('isoWeek');
                    const weekEvents = calendarDays
                      .filter(d => d.date.isSame(weekStart, 'week'))
                      .flatMap(d => d.events)
                      .filter((event) => event.all_day);
                    
                    // Remove duplicates
                    const uniqueWeekEvents = Array.from(new Map(weekEvents.map(e => [e.id, e])).values());
                    const eventRows = calculateEventRows(uniqueWeekEvents, weekStart);
                    
                    const currentDayStr = day.date.format('YYYY-MM-DD');
                    const eventsSpanningToday = day.events
                      .filter((event) => event.all_day)
                      .filter((event) => {
                        const eventStartDate = event.starts_at.split('T')[0];
                        const eventEndDate = event.ends_at.split('T')[0];
                        return eventStartDate <= currentDayStr && currentDayStr <= eventEndDate;
                      });
                    
                    const maxRowSpanningToday = eventsSpanningToday.reduce((max, event) => {
                      const row = eventRows.get(event.id) || 0;
                      return Math.max(max, row);
                    }, -1);
                    
                    // Cap at 5 rows max (100px with 20px per row)
                    return Math.min((maxRowSpanningToday + 1) * 20, 100);
                  })()}px` }} />

                  {/* Timed events */}
                  {day.events
                    .filter((event) => !event.all_day)
                    .slice(0, 3)
                    .map((event) => {
                      return (
                        <Box
                          key={event.id}
                          data-event-click="true"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditDialog(event);
                          }}
                          sx={{
                            px: 0.75,
                            py: 0.5,
                            bgcolor: event.tag_id && getTagById(event.tag_id)
                              ? `${getTagById(event.tag_id)!.color}33`
                              : (theme) => `${theme.palette.primary.main}26`,
                            borderLeft: '3px solid',
                            borderColor: event.tag_id && getTagById(event.tag_id)
                              ? getTagById(event.tag_id)!.color
                              : 'primary.main',
                            borderRadius: 1,
                            cursor: 'pointer',
                            minWidth: 0,
                            width: '100%',
                            boxSizing: 'border-box',
                            '&:hover': {
                              bgcolor: event.tag_id && getTagById(event.tag_id)
                                ? `${getTagById(event.tag_id)!.color}55`
                                : (theme) => `${theme.palette.primary.main}40`,
                            },
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              color: event.tag_id && getTagById(event.tag_id)
                                ? getTagById(event.tag_id)!.color
                                : 'primary.main',
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              width: '100%',
                            }}
                          >
                            {`${dayjs(event.starts_at).format('HH:mm')} ${event.title}`}
                          </Typography>
                        </Box>
                      );
                    })}

                  {/* Planner items */}
                  {day.plannerItems.slice(0, 2).map((item) => (
                    <Box
                      key={item.id}
                      data-event-click="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenPlannerDialog(item);
                      }}
                      sx={{
                        px: 0.75,
                        py: 0.5,
                        bgcolor: item.tag_id && getTagById(item.tag_id)
                          ? `${getTagById(item.tag_id)!.color}22`
                          : 'rgba(255, 255, 255, 0.05)',
                        borderLeft: '3px solid',
                        borderColor: item.tag_id && getTagById(item.tag_id)
                          ? getTagById(item.tag_id)!.color
                          : 'text.secondary',
                        borderRadius: 1,
                        minWidth: 0,
                        width: '100%',
                        boxSizing: 'border-box',
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: item.tag_id && getTagById(item.tag_id)
                            ? `${getTagById(item.tag_id)!.color}44`
                            : 'rgba(255, 255, 255, 0.08)',
                        },
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '0.7rem',
                          fontWeight: 500,
                          color: item.tag_id && getTagById(item.tag_id)
                            ? getTagById(item.tag_id)!.color
                            : 'text.secondary',
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          width: '100%',
                        }}
                      >
                        {/* Show continuation arrow if no start time but has calendar event (multi-day continuation) */}
                        {!item.start_time && item.end_time && item.calendar_event_id && '← '}
                        {item.start_time ? `${formatTime(item.start_time)} ` : ''}
                        {item.title}
                        {/* Show continuation arrow if has start time but no end time (continues to next day) */}
                        {item.start_time && !item.end_time && item.calendar_event_id && ' →'}
                        {/* Show end time if available */}
                        {item.end_time && !item.start_time && ` (ends ${formatTime(item.end_time)})`}
                      </Typography>
                    </Box>
                  ))}

                  {/* Show more indicator */}
                  {(() => {
                    // Calculate visible events for the "+X more" indicator
                    const weekStart = day.date.startOf('isoWeek');
                    
                    const allDayEvents = day.events.filter((event) => {
                      if (!event.all_day) return false;
                      
                      const eventStartDate = event.starts_at.split('T')[0];
                      const eventStart = dayjs(eventStartDate);
                      
                      // Determine the first day this event should appear in this week
                      let firstDayInWeek: dayjs.Dayjs;
                      if (eventStart.isBefore(weekStart, 'day')) {
                        firstDayInWeek = weekStart;
                      } else if (eventStart.isSame(weekStart, 'week')) {
                        firstDayInWeek = eventStart;
                      } else {
                        return false;
                      }
                      
                      return day.date.isSame(firstDayInWeek, 'day');
                    });
                    
                    const timedEvents = day.events.filter((event) => !event.all_day);

                    const totalVisibleItems = allDayEvents.length + timedEvents.length + day.plannerItems.length;
                    const maxAllDayShown = Math.min(allDayEvents.length, 5); // Cap at 5 all-day events
                    const maxTimedShown = Math.min(timedEvents.length, 3);
                    const maxPlannerShown = Math.min(day.plannerItems.length, 2);
                    const totalShown = maxAllDayShown + maxTimedShown + maxPlannerShown;
                    const remaining = totalVisibleItems - totalShown;

                    if (remaining <= 0) return null;

                    return (
                      <Typography
                      data-event-click="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDayDetailData(day);
                        setDayDetailOpen(true);
                      }}
                      variant="caption"
                      sx={{
                        fontSize: '0.65rem',
                        color: 'primary.main',
                        fontWeight: 600,
                        px: 0.75,
                        cursor: 'pointer',
                        '&:hover': {
                          color: 'primary.light',
                          textDecoration: 'underline',
                        },
                      }}
                    >
                      +{remaining} more
                    </Typography>
                    );
                  })()}
                </Stack>
              </Box>
            </Box>
            );
          })}
        </Box>
      </Box>

      {/* Add/Edit Event Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingEvent ? 'Edit Event' : 'Add Event'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              fullWidth
              required
              autoFocus
            />

            <TextField
              label="Description"
              value={eventDescription}
              onChange={(e) => setEventDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />

            <FormControlLabel
              control={
                <Checkbox checked={eventAllDay} onChange={(e) => setEventAllDay(e.target.checked)} />
              }
              label="All day"
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Start date"
                type="date"
                value={selectedDay?.format('YYYY-MM-DD') || ''}
                onChange={(e) => setSelectedDay(dayjs(e.target.value))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="End date"
                type="date"
                value={eventEndDay?.format('YYYY-MM-DD') || ''}
                onChange={(e) => setEventEndDay(dayjs(e.target.value))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Box>

            {!eventAllDay && (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Start time"
                  type="time"
                  value={eventStartTime}
                  onChange={(e) => setEventStartTime(e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="End time"
                  type="time"
                  value={eventEndTime}
                  onChange={(e) => setEventEndTime(e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            )}

            <TagSelector
              value={eventTagId}
              onChange={setEventTagId}
              label="Tag"
              size="small"
            />

            <FormControl fullWidth size="small">
              <InputLabel>Relationship</InputLabel>
              <Select
                value={eventRelationshipId || ''}
                onChange={(e) => setEventRelationshipId(e.target.value || null)}
                label="Relationship"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {relationships.map((rel) => (
                  <MenuItem key={rel.id} value={rel.id}>
                    {rel.full_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          {editingEvent && (
            <Button 
              onClick={handleDeleteEvent} 
              color="error" 
              disabled={saving}
              sx={{ mr: 'auto' }}
            >
              Delete
            </Button>
          )}
          <Button onClick={handleCloseDialog} disabled={saving}>Cancel</Button>
          <Button onClick={handleSaveEvent} variant="contained" disabled={saving || !eventTitle.trim()}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Planner Item Edit Dialog */}
      <Dialog open={plannerDialogOpen} onClose={handleClosePlannerDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Task</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={plannerTitle}
              onChange={(e) => setPlannerTitle(e.target.value)}
              fullWidth
              required
              autoFocus
            />

            <TextField
              label="Notes"
              value={plannerNotes}
              onChange={(e) => setPlannerNotes(e.target.value)}
              fullWidth
              multiline
              rows={3}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Start time"
                type="time"
                value={plannerStartTime}
                onChange={(e) => setPlannerStartTime(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
                helperText="Optional"
              />
              <TextField
                label="End time"
                type="time"
                value={plannerEndTime}
                onChange={(e) => setPlannerEndTime(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
                helperText="Optional"
              />
            </Box>

            <TagSelector
              value={plannerTagId}
              onChange={setPlannerTagId}
              label="Tag"
              size="small"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleDeletePlannerItem}
            color="error"
            disabled={saving}
            sx={{ mr: 'auto' }}
          >
            Delete
          </Button>
          <Button onClick={handleClosePlannerDialog} disabled={saving}>Cancel</Button>
          <Button onClick={handleSavePlannerItem} variant="contained" disabled={saving || !plannerTitle.trim()}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Day Detail Dialog */}
      <Dialog
        open={dayDetailOpen}
        onClose={handleCloseDayDetail}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: { xs: '100%', sm: '90vh' },
            m: { xs: 0, sm: 2 },
          }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {dayDetailData?.date.format('MMMM D, YYYY')}
            </Typography>
            <IconButton onClick={handleCloseDayDetail} size="small">
              <ChevronLeftIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {/* Add event button */}
            {dayDetailData?.isCurrentMonth && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  handleCloseDayDetail();
                  handleOpenDialog(dayDetailData.date);
                }}
                fullWidth
              >
                Add Event
              </Button>
            )}

            {/* Events */}
            {dayDetailData?.events.map((event) => (
              <Paper 
                key={event.id} 
                sx={{ 
                  p: 2, 
                  bgcolor: event.tag_id && getTagById(event.tag_id)
                    ? `${getTagById(event.tag_id)!.color}22`
                    : (theme) => `${theme.palette.primary.main}1A`,
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: event.tag_id && getTagById(event.tag_id)
                      ? `${getTagById(event.tag_id)!.color}33`
                      : (theme) => `${theme.palette.primary.main}26`,
                  },
                }}
                onClick={() => {
                  handleCloseDayDetail();
                  handleOpenEditDialog(event);
                }}
              >
                <Typography variant="subtitle1" sx={{ 
                  fontWeight: 600, 
                  color: event.tag_id && getTagById(event.tag_id)
                    ? getTagById(event.tag_id)!.color
                    : 'primary.main', 
                  mb: 0.5 
                }}>
                  {event.title}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                  {event.all_day 
                    ? (() => {
                        const startDate = event.starts_at.split('T')[0];
                        const endDate = event.ends_at.split('T')[0];
                        return startDate !== endDate 
                          ? `All day (${dayjs(startDate).format('MMM D')} - ${dayjs(endDate).format('MMM D')})`
                          : 'All day';
                      })()
                    : (() => {
                        const startDate = dayjs(event.starts_at).format('YYYY-MM-DD');
                        const endDate = dayjs(event.ends_at).format('YYYY-MM-DD');
                        return startDate !== endDate
                          ? `${dayjs(event.starts_at).format('MMM D, h:mm A')} - ${dayjs(event.ends_at).format('MMM D, h:mm A')}`
                          : `${dayjs(event.starts_at).format('h:mm A')} - ${dayjs(event.ends_at).format('h:mm A')}`;
                      })()
                  }
                </Typography>
                {event.description && (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {event.description}
                  </Typography>
                )}
              </Paper>
            ))}

            {/* Planner Items */}
            {dayDetailData?.plannerItems.map((item) => (
              <Paper
                key={item.id}
                onClick={() => {
                  handleCloseDayDetail();
                  handleOpenPlannerDialog(item);
                }}
                sx={{
                  p: 2,
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.08)',
                  },
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {!item.start_time && item.end_time && item.calendar_event_id && '← '}
                  {item.start_time ? `${formatTime(item.start_time)} ` : ''}
                  {item.title}
                  {item.start_time && !item.end_time && item.calendar_event_id && ' →'}
                  {item.end_time && !item.start_time && ` (ends ${formatTime(item.end_time)})`}
                </Typography>
                {item.notes && (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {item.notes}
                  </Typography>
                )}
              </Paper>
            ))}

            {/* Empty state */}
            {!dayDetailData?.events.length && !dayDetailData?.plannerItems.length && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                  No events or tasks for this day
                </Typography>
              </Box>
            )}
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
