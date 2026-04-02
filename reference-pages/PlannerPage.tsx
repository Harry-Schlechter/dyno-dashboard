import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  GridLegacy,
  Stack,
  IconButton,
  TextField,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  Tooltip,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import AddIcon from '@mui/icons-material/Add';
import RepeatIcon from '@mui/icons-material/Repeat';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import dayjs, { Dayjs } from 'dayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import { plannerApi } from '../api/planner';
import { tasksApi } from '../api/tasks';
import { Panel } from '../components/common/Panel';
import { RecurringPlannerManager } from '../components/planner/RecurringPlannerManager';
// import type { RecurringPlannerItem } from '@life-os/shared';
import { getWeekStart, getDayKey } from '../utils/dateUtils';
import { useAuthReady } from '../auth/useAuthReady';
import { tagsApi } from '../api/tags';
import type { Tag } from '@life-os/shared';
import { TagSelector } from '../components/TagSelector';
import { useFilteredData } from '../hooks/useFilteredData';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: number | null;
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
  tag_id: string | null;
  note_id: string | null;
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
  recurring_planner_item_id: string | null;
  tag_id: string | null;
}

interface PlannerItemWithRecurring extends PlannerItem {
  isRecurring?: boolean;
}

interface DayColumn {
  dayIndex: number;
  dayName: string;
  date: string;
  items: PlannerItem[];
}

const isContactReminder = (title: string): boolean => {
  return title.startsWith('Catch up with ');
};

// Draggable Planner Item component
interface DraggablePlannerItemProps {
  item: PlannerItem;
  onToggleComplete: (item: PlannerItem) => void;
  onOpenEdit: (item: PlannerItemWithRecurring) => void;
  getTagById: (tagId: string | null) => Tag | null;
}

function DraggablePlannerItem({ item, onToggleComplete, onOpenEdit, getTagById }: DraggablePlannerItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      sx={{
        p: 1.25,
        bgcolor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 2,
        border: '1px solid rgba(255, 255, 255, 0.03)',
        transition: 'all 0.2s',
        cursor: isDragging ? 'grabbing' : 'grab',
        '&:hover': {
          bgcolor: 'rgba(255, 255, 255, 0.05)',
          borderColor: 'rgba(255, 255, 255, 0.08)',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Checkbox
          checked={item.completed}
          onChange={(e) => {
            e.stopPropagation();
            onToggleComplete(item);
          }}
          onClick={(e) => e.stopPropagation()}
          size="small"
          sx={{ p: 0 }}
        />
        <Box 
          sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation();
            onOpenEdit(item);
          }}
        >
          {(item.start_time || item.end_time || item.recurring_planner_item_id) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              {(item.start_time || item.end_time) && (
                <Chip
                  label={`${item.start_time ? item.start_time.slice(0, 5) : ''}${item.start_time && item.end_time ? ' - ' : ''}${item.end_time ? item.end_time.slice(0, 5) : ''}`}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.625rem',
                    fontWeight: 600,
                    bgcolor: 'rgba(33, 150, 243, 0.15)',
                    color: 'primary.main',
                    '& .MuiChip-label': { px: 0.75 },
                  }}
                />
              )}
              {item.recurring_planner_item_id && (
                <RepeatIcon sx={{ fontSize: '0.875rem', color: 'success.main' }} />
              )}
              {isContactReminder(item.title) && (
                <PeopleIcon sx={{ fontSize: '0.875rem', color: 'info.main' }} />
              )}
              {item.tag_id && getTagById(item.tag_id) && (
                <Chip
                  label={getTagById(item.tag_id)!.name}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.625rem',
                    fontWeight: 600,
                    backgroundColor: getTagById(item.tag_id)!.color,
                    color: '#fff',
                    '& .MuiChip-label': { px: 0.75 },
                  }}
                />
              )}
            </Box>
          )}
          <Typography
            variant="body2"
            sx={{
              fontSize: '0.8125rem',
              fontWeight: 500,
              textDecoration: item.completed ? 'line-through' : 'none',
              color: item.completed ? 'text.secondary' : 'text.primary',
              wordWrap: 'break-word',
            }}
          >
            {item.title}
          </Typography>
          {item.notes && (
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mt: 0.5,
                color: 'text.secondary',
                fontSize: '0.75rem',
                whiteSpace: 'pre-wrap',
              }}
            >
              {item.notes}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}

// Droppable Day Column component
interface DroppableDayProps {
  dayIndex: number;
  children: React.ReactNode;
}

function DroppableDay({ dayIndex, children }: DroppableDayProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dayIndex}`,
  });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        minHeight: 200,
        bgcolor: isOver ? 'rgba(33, 150, 243, 0.1)' : 'transparent',
        borderRadius: 2,
        transition: 'background-color 0.2s',
      }}
    >
      {children}
    </Box>
  );
}

export function PlannerPage() {
  const authReady = useAuthReady();
  const [weekStart, setWeekStart] = useState(getWeekStart(dayjs()));
  const [plannerItems, setPlannerItems] = useState<PlannerItemWithRecurring[]>([]);
  const filteredPlannerItems = useFilteredData(plannerItems);
  const [newItemInputs, setNewItemInputs] = useState<Record<number, string>>({});
  const [showInputs, setShowInputs] = useState<Record<number, boolean>>({});
  const [repeatWeekly, setRepeatWeekly] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState<Record<number, boolean>>({});
  const [tags, setTags] = useState<Tag[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [showRecurringManager, setShowRecurringManager] = useState(false);

  // Edit dialog state
  const [editDialog, setEditDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<PlannerItemWithRecurring | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editRecurring, setEditRecurring] = useState(false);
  const [editTagId, setEditTagId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<Dayjs | null>(null);

  // Drag and drop state
  // @ts-ignore - activeId is used by drag-and-drop library
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDragItem, setActiveDragItem] = useState<PlannerItem | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Create mode time state
  const [newItemStartTimes, setNewItemStartTimes] = useState<Record<number, string>>({});
  const [newItemEndTimes, setNewItemEndTimes] = useState<Record<number, string>>({});
  const [newItemTagIds, setNewItemTagIds] = useState<Record<number, string | null>>({});

  const loadPlannerItems = async () => {
    try {
      const weekStartStr = getDayKey(weekStart);
      console.log('[PlannerPage] Loading items for week:', weekStartStr);
      console.log('[PlannerPage] weekStart dayjs object:', weekStart.format('YYYY-MM-DD dddd'));

      // Load all planner items from API and filter client-side
      const allItems = await plannerApi.list();
      console.log('[PlannerPage] Total items from API:', allItems.length);
      console.log('[PlannerPage] ALL PLANNER ITEMS:', JSON.stringify(allItems, null, 2));
      console.log('[PlannerPage] All week_start values:', allItems.map(item => item.week_start));
      const weeklyItems = allItems.filter((item) => {
        const matches = item.week_start === weekStartStr;
        if (!matches && allItems.length > 0) {
          console.log(`[PlannerPage] Item ${item.id} week_start "${item.week_start}" does NOT match weekStartStr "${weekStartStr}"`);
        }
        return matches;
      });
      console.log('[PlannerPage] Filtered items for current week:', weeklyItems.length);
      console.log('[PlannerPage] FILTERED ITEMS:', JSON.stringify(weeklyItems, null, 2));

      // Load active recurring items from API
      // const recurringItemsData = await plannerApi.getActiveRecurring(weekStartStr);
      // setRecurringItems(recurringItemsData);
      // const recurringItems = recurringItemsData;

      const itemsWithRecurringFlag: PlannerItemWithRecurring[] = [...weeklyItems];

      // Mark items with recurring_planner_item_id as recurring
      for (let i = 0; i < itemsWithRecurringFlag.length; i++) {
        if (itemsWithRecurringFlag[i].recurring_planner_item_id) {
          itemsWithRecurringFlag[i] = {
            ...itemsWithRecurringFlag[i],
            isRecurring: true,
          };
        }
      }

      setPlannerItems(itemsWithRecurringFlag);
    } catch (error) {
      console.error('Failed to load planner items:', error);
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

  const getTagById = (tagId: string | null): Tag | null => {
    if (!tagId) return null;
    return tags.find((tag) => tag.id === tagId) || null;
  };

  const loadTodayTasks = async () => {
    try {
      const tasks = await tasksApi.list();
      const filtered = tasks.filter((t) => t.status === 'today');
      setTodayTasks(filtered);
    } catch (error) {
      console.error('Failed to load today tasks:', error);
    }
  };

  const getTodayDayIndex = (): number => {
    // Calculate which day column is today (0-6, where 0 = Monday of current week)
    const today = dayjs();
    const weekStartDate = weekStart;
    const daysDiff = today.diff(weekStartDate, 'day');
    // Return -1 if today is not in the current week
    if (daysDiff < 0 || daysDiff > 6) return -1;
    return daysDiff;
  };

  useEffect(() => {
    if (authReady) {
      loadPlannerItems();
      loadTags();
      loadTodayTasks();
    }
  }, [authReady, weekStart]);

  const handlePreviousWeek = () => {
    setWeekStart(weekStart.subtract(1, 'week').startOf('isoWeek'));
  };

  const handleNextWeek = () => {
    setWeekStart(weekStart.add(1, 'week').startOf('isoWeek'));
  };

  const handleThisWeek = () => {
    setWeekStart(dayjs().startOf('isoWeek'));
  };

  const handleAddItem = async (dayIndex: number) => {
    const title = newItemInputs[dayIndex];
    if (!title?.trim()) return;

    setLoading((prev) => ({ ...prev, [dayIndex]: true }));

    try {
      // If repeat weekly is checked, create the recurring item first
      let recurringItemId: string | null = null;
      if (repeatWeekly[dayIndex]) {
        const recurringItem = await plannerApi.createRecurring({
          title: title.trim(),
          day_of_week: dayIndex,
          first_week_start: getDayKey(weekStart),
          repeat_interval: 'weekly',
          active: true,
          start_time: newItemStartTimes[dayIndex] || null,
          end_time: newItemEndTimes[dayIndex] || null,
          tag_id: newItemTagIds[dayIndex] || null,
        });
        recurringItemId = recurringItem.id;
      }

      // Create the weekly planner item with the recurring_planner_item_id if applicable
      await plannerApi.create({
        week_start: getDayKey(weekStart),
        day_of_week: dayIndex,
        title: title.trim(),
        completed: false,
        start_time: newItemStartTimes[dayIndex] || null,
        end_time: newItemEndTimes[dayIndex] || null,
        recurring_planner_item_id: recurringItemId,
        tag_id: newItemTagIds[dayIndex] || null,
      });

      setNewItemInputs((prev) => ({ ...prev, [dayIndex]: '' }));
      setNewItemStartTimes((prev) => ({ ...prev, [dayIndex]: '' }));
      setNewItemEndTimes((prev) => ({ ...prev, [dayIndex]: '' }));
      setNewItemTagIds((prev) => ({ ...prev, [dayIndex]: null }));
      setShowInputs((prev) => ({ ...prev, [dayIndex]: false }));
      setRepeatWeekly((prev) => ({ ...prev, [dayIndex]: false }));
      await loadPlannerItems();
    } catch (error) {
      console.error('Failed to add planner item:', error);
    }

    setLoading((prev) => ({ ...prev, [dayIndex]: false }));
  };

  // const handleStopRecurring = async (recurringId: string) => {
  //   if (!confirm('Stop this weekly repeat? Existing items will remain.')) return;
  //
  //   try {
  //     await plannerApi.updateRecurring(recurringId, { active: false });
  //     await loadPlannerItems();
  //   } catch (error) {
  //     console.error('Failed to stop recurring item:', error);
  //   }
  // };

  const handleToggleComplete = async (item: PlannerItem) => {
    try {
      await plannerApi.update(item.id, {
        completed: !item.completed,
        completed_at: !item.completed ? new Date().toISOString() : null,
      });
      await loadPlannerItems();
    } catch (error) {
      console.error('Failed to toggle planner item:', error);
    }
  };

  // const handleDelete = async (itemId: string) => {
  //   try {
  //     await plannerApi.delete(itemId);
  //     await loadPlannerItems();
  //   } catch (error) {
  //     console.error('Failed to delete planner item:', error);
  //   }
  // };

  const handleOpenEdit = (item: PlannerItemWithRecurring) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditNotes(item.notes || '');
    setEditStartTime(item.start_time || '');
    setEditEndTime(item.end_time || '');
    setEditRecurring(item.isRecurring || false);
    setEditTagId(item.tag_id || null);
    
    // Calculate the actual date from week_start and day_of_week
    const itemDate = dayjs(item.week_start).add(item.day_of_week, 'day');
    setEditDate(itemDate);
    
    setEditDialog(true);
  };

  const handleCloseEdit = () => {
    setEditDialog(false);
    setEditingItem(null);
    setEditTitle('');
    setEditNotes('');
    setEditStartTime('');
    setEditEndTime('');
    setEditRecurring(false);
    setEditTagId(null);
    setEditDate(null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    const item = filteredPlannerItems.find(i => i.id === active.id);
    setActiveDragItem(item || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setActiveDragItem(null);

    if (!over) return;

    const activeItemId = active.id as string;
    const overId = over.id as string;

    // Extract day index from droppable zone id (format: "day-{index}")
    if (!overId.startsWith('day-')) return;
    
    const newDayIndex = parseInt(overId.replace('day-', ''));
    const item = filteredPlannerItems.find(i => i.id === activeItemId);

    if (!item || item.day_of_week === newDayIndex) return;

    try {
      // Update the item with new day
      await plannerApi.update(item.id, {
        day_of_week: newDayIndex,
      });
      await loadPlannerItems();
    } catch (error) {
      console.error('Failed to move planner item:', error);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editTitle.trim()) return;

    try {
      // Calculate new week_start and day_of_week if date changed
      let newWeekStart = editingItem.week_start;
      let newDayOfWeek = editingItem.day_of_week;
      
      if (editDate) {
        const selectedDate = dayjs(editDate);
        newWeekStart = selectedDate.startOf('isoWeek').format('YYYY-MM-DD');
        newDayOfWeek = selectedDate.isoWeekday() - 1; // 0 = Monday, 6 = Sunday
      }

      // Update the current item
      await plannerApi.update(editingItem.id, {
        title: editTitle.trim(),
        notes: editNotes.trim() || null,
        start_time: editStartTime || null,
        end_time: editEndTime || null,
        tag_id: editTagId,
        week_start: newWeekStart,
        day_of_week: newDayOfWeek,
      });

      // Handle recurring logic
      if (editRecurring && !editingItem.isRecurring) {
        // Create new recurring item and link it
        const recurringItem = await plannerApi.createRecurring({
          title: editTitle.trim(),
          notes: editNotes.trim() || null,
          day_of_week: editingItem.day_of_week,
          first_week_start: editingItem.week_start,
          repeat_interval: 'weekly',
          active: true,
          start_time: editStartTime || null,
          end_time: editEndTime || null,
          tag_id: editTagId,
        });
        // Link the current item to the new recurring item
        await plannerApi.update(editingItem.id, {
          recurring_planner_item_id: recurringItem.id,
        });
      } else if (!editRecurring && editingItem.isRecurring && editingItem.recurring_planner_item_id) {
        // Remove link and deactivate recurring item
        await plannerApi.update(editingItem.id, {
          recurring_planner_item_id: null,
        });
        await plannerApi.updateRecurring(editingItem.recurring_planner_item_id, {
          active: false,
        });
      } else if (editRecurring && editingItem.isRecurring && editingItem.recurring_planner_item_id) {
        // Update existing recurring item
        await plannerApi.updateRecurring(editingItem.recurring_planner_item_id, {
          title: editTitle.trim(),
          notes: editNotes.trim() || null,
          start_time: editStartTime || null,
          end_time: editEndTime || null,
          tag_id: editTagId,
        });
      }

      await loadPlannerItems();
      handleCloseEdit();
    } catch (error) {
      console.error('Failed to save planner item:', error);
    }
  };

  const handleDeleteItem = async (deleteRecurring: boolean = false) => {
    if (!editingItem) return;

    try {
      if (deleteRecurring && editingItem.recurring_planner_item_id) {
        // Delete all future instances first (where week_start >= current week)
        const currentWeekStart = getDayKey(weekStart);
        const allItems = await plannerApi.list();
        
        const futureInstances = allItems.filter(
          (item) => 
            item.recurring_planner_item_id === editingItem.recurring_planner_item_id &&
            item.week_start >= currentWeekStart
        );
        
        await Promise.all(futureInstances.map((item) => plannerApi.delete(item.id)));
        
        // Delete the recurring pattern (CASCADE will handle any remaining linked items)
        await plannerApi.deleteRecurring(editingItem.recurring_planner_item_id);
      } else {
        // Just delete the current item
        await plannerApi.delete(editingItem.id);
      }

      await loadPlannerItems();
      handleCloseEdit();
    } catch (error) {
      console.error('Failed to delete planner item:', error);
    }
  };

  const handlePopulateRecurring = async () => {
    try {
      const weekStartStr = getDayKey(weekStart);
      const recurringItemsData = await plannerApi.getActiveRecurring(weekStartStr);

      let created = 0;
      for (const recurringItem of recurringItemsData) {
        // Check if a weekly_planner_items row already exists for this recurring item
        const exists = plannerItems.some(
          (item) => item.recurring_planner_item_id === recurringItem.id
        );

        if (!exists) {
          await plannerApi.create({
            week_start: weekStartStr,
            day_of_week: recurringItem.day_of_week,
            title: recurringItem.title,
            notes: recurringItem.notes,
            start_time: recurringItem.start_time,
            end_time: recurringItem.end_time,
            completed: false,
            calendar_event_id: recurringItem.calendar_event_id,
            recurring_planner_item_id: recurringItem.id,
            tag_id: recurringItem.tag_id,
          });
          created++;
        }
      }

      await loadPlannerItems();
      if (created === 0) {
        alert('All recurring items already exist for this week');
      }
    } catch (error) {
      console.error('Failed to populate recurring items:', error);
    }
  };



  // Build 7-day columns
  const dayColumns: DayColumn[] = [];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  for (let i = 0; i < 7; i++) {
    const date = weekStart.add(i, 'day');
    const items = filteredPlannerItems.filter((item) => item.day_of_week === i);
    dayColumns.push({
      dayIndex: i,
      dayName: dayNames[i],
      date: date.format('MMM D'),
      items,
    });
  }

  const weekEnd = weekStart.add(6, 'day');
  const weekLabel = `${weekStart.format('MMM D')} – ${weekEnd.format('MMM D')}`;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Box>
        {/* Header with week navigation */}
        <Box sx={{ mb: { xs: 2, sm: 2.5, md: 3 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Weekly Planner
            </Typography>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Manage recurring planner items">
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setShowRecurringManager(true)}
                  startIcon={<SettingsIcon />}
                  sx={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}
                >
                  Manage Recurring
                </Button>
              </Tooltip>
              <Button
                variant="outlined"
                size="small"
                onClick={handlePopulateRecurring}
                startIcon={<RepeatIcon />}
                sx={{ borderColor: 'rgba(76, 175, 80, 0.3)', color: 'success.main' }}
              >
                Populate Recurring
              </Button>
            </Stack>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              onClick={handlePreviousWeek}
              size="small"
              sx={{
                color: 'text.secondary',
                '&:hover': { color: 'primary.main' },
              }}
            >
              <ChevronLeftIcon />
            </IconButton>

            <Button
              onClick={handleThisWeek}
              size="small"
              variant="text"
              sx={{ minWidth: { xs: 80, sm: 100 } }}
            >
              This week
            </Button>

            <Typography variant="body1" sx={{ fontWeight: 600, minWidth: { xs: 100, sm: 140 }, textAlign: 'center' }}>
              {weekLabel}
            </Typography>

            <IconButton
              onClick={handleNextWeek}
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

      {/* 7-column grid for days */}
      <GridLegacy container spacing={{ xs: 1.5, sm: 2 }}>
        {dayColumns.map((day) => (
          <GridLegacy item xs={12} sm={6} md={4} lg={1.714} key={day.dayIndex}>
            <Panel
              title={day.dayName}
              subtitle={day.date}
            >
              <DroppableDay dayIndex={day.dayIndex}>
                <Stack spacing={1}>
                  {/* Tasks for Today */}
                  {day.dayIndex === getTodayDayIndex() && todayTasks.length > 0 && (
                    <Stack spacing={0.75} sx={{ mb: 1 }}>
                      {todayTasks.map((task) => (
                        <Box
                          key={`task-${task.id}`}
                          sx={{
                            p: 1.25,
                            bgcolor: 'rgba(255, 255, 255, 0.02)',
                            borderRadius: 2,
                            border: '1px solid rgba(255, 255, 255, 0.03)',
                            transition: 'all 0.2s',
                            '&:hover': {
                              bgcolor: 'rgba(255, 255, 255, 0.05)',
                              borderColor: 'rgba(255, 255, 255, 0.08)',
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                            <Chip
                              label="Task"
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: '0.625rem',
                                fontWeight: 600,
                                bgcolor: 'rgba(33, 150, 243, 0.15)',
                                color: 'primary.main',
                                '& .MuiChip-label': { px: 0.75 },
                              }}
                            />
                            {task.tag_id && getTagById(task.tag_id) && (
                              <Chip
                                label={getTagById(task.tag_id)!.name}
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: '0.625rem',
                                  fontWeight: 600,
                                  backgroundColor: getTagById(task.tag_id)!.color,
                                  color: '#fff',
                                  '& .MuiChip-label': { px: 0.75 },
                                }}
                              />
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Checkbox
                              checked={task.status === 'done'}
                              size="small"
                              sx={{ p: 0 }}
                              disabled
                            />
                            <Typography
                              variant="body2"
                              sx={{
                                fontSize: '0.8125rem',
                                fontWeight: 500,
                                textDecoration: task.status === 'done' ? 'line-through' : 'none',
                                color: task.status === 'done' ? 'text.secondary' : 'text.primary',
                                wordWrap: 'break-word',
                              }}
                          >
                            {task.title}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                )}

                {/* Items for this day */}
                {day.items.length > 0 && (
                  <Stack spacing={0.75}>
                    {day.items.map((item) => (
                      <DraggablePlannerItem
                        key={item.id}
                        item={item}
                        onToggleComplete={handleToggleComplete}
                        onOpenEdit={handleOpenEdit}
                        getTagById={getTagById}
                      />
                    ))}
                  </Stack>
                )}

                {/* Add item button or input */}
                {!showInputs[day.dayIndex] ? (
                  <IconButton
                    onClick={() => setShowInputs((prev) => ({ ...prev, [day.dayIndex]: true }))}
                    size="small"
                    sx={{
                      alignSelf: 'flex-start',
                      color: 'text.secondary',
                      '&:hover': {
                        color: 'primary.main',
                        bgcolor: (theme) => `${theme.palette.primary.main}1A`,
                      },
                    }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                ) : (
                  <Box
                    sx={{
                      p: 1.5,
                      bgcolor: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: 1.5,
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <Stack spacing={1.5}>
                      <TextField
                        size="small"
                        placeholder="New item…"
                        value={newItemInputs[day.dayIndex] || ''}
                        onChange={(e) =>
                          setNewItemInputs((prev) => ({ ...prev, [day.dayIndex]: e.target.value }))
                        }
                        onKeyPress={(e) => e.key === 'Enter' && !repeatWeekly[day.dayIndex] && handleAddItem(day.dayIndex)}
                        autoFocus
                        fullWidth
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            bgcolor: 'rgba(0, 0, 0, 0.2)',
                            fontSize: '0.8125rem',
                            '&:hover': {
                              bgcolor: 'rgba(0, 0, 0, 0.25)',
                            },
                            '&.Mui-focused': {
                              bgcolor: 'rgba(0, 0, 0, 0.3)',
                            },
                          },
                        }}
                      />
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                          label="Start"
                          type="time"
                          size="small"
                          value={newItemStartTimes[day.dayIndex] || ''}
                          onChange={(e) =>
                            setNewItemStartTimes((prev) => ({ ...prev, [day.dayIndex]: e.target.value }))
                          }
                          sx={{ 
                            flex: 1,
                            '& .MuiOutlinedInput-root': {
                              bgcolor: 'rgba(0, 0, 0, 0.2)',
                              fontSize: '0.8125rem',
                              '&:hover': {
                                bgcolor: 'rgba(0, 0, 0, 0.25)',
                              },
                              '&.Mui-focused': {
                                bgcolor: 'rgba(0, 0, 0, 0.3)',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              fontSize: '0.8125rem',
                              color: 'text.secondary',
                            },
                          }}
                          InputLabelProps={{ shrink: true }}
                          inputProps={{
                            step: 900,
                          }}
                        />
                        <TextField
                          label="End"
                          type="time"
                          size="small"
                          value={newItemEndTimes[day.dayIndex] || ''}
                          onChange={(e) =>
                            setNewItemEndTimes((prev) => ({ ...prev, [day.dayIndex]: e.target.value }))
                          }
                          sx={{ 
                            flex: 1,
                            '& .MuiOutlinedInput-root': {
                              bgcolor: 'rgba(0, 0, 0, 0.2)',
                              fontSize: '0.8125rem',
                              '&:hover': {
                                bgcolor: 'rgba(0, 0, 0, 0.25)',
                              },
                              '&.Mui-focused': {
                                bgcolor: 'rgba(0, 0, 0, 0.3)',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              fontSize: '0.8125rem',
                              color: 'text.secondary',
                            },
                          }}
                          InputLabelProps={{ shrink: true }}
                          inputProps={{
                            step: 900,
                          }}
                        />
                      </Box>
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={repeatWeekly[day.dayIndex] || false}
                            onChange={(e) =>
                              setRepeatWeekly((prev) => ({ ...prev, [day.dayIndex]: e.target.checked }))
                            }
                          />
                        }
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <RepeatIcon sx={{ fontSize: '0.875rem' }} />
                            <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                              Repeat weekly
                            </Typography>
                          </Box>
                        }
                        sx={{ ml: -0.5, mb: -0.5 }}
                      />
                      <TagSelector
                        value={newItemTagIds[day.dayIndex] || null}
                        onChange={(tagId) => setNewItemTagIds((prev) => ({ ...prev, [day.dayIndex]: tagId }))}
                        label="Tag"
                        size="small"
                      />
                      <Box sx={{ display: 'flex', gap: 1, pt: 0.5 }}>
                        <Button
                          variant="contained"
                          onClick={() => handleAddItem(day.dayIndex)}
                          disabled={loading[day.dayIndex] || !newItemInputs[day.dayIndex]?.trim()}
                          size="small"
                          fullWidth
                          sx={{ 
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            py: 0.75,
                            textTransform: 'none',
                          }}
                        >
                          Add
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => {
                            setShowInputs((prev) => ({ ...prev, [day.dayIndex]: false }));
                            setNewItemInputs((prev) => ({ ...prev, [day.dayIndex]: '' }));
                            setNewItemStartTimes((prev) => ({ ...prev, [day.dayIndex]: '' }));
                            setNewItemEndTimes((prev) => ({ ...prev, [day.dayIndex]: '' }));
                            setNewItemTagIds((prev) => ({ ...prev, [day.dayIndex]: null }));
                            setRepeatWeekly((prev) => ({ ...prev, [day.dayIndex]: false }));
                          }}
                          size="small"
                          sx={{
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            py: 0.75,
                            minWidth: 80,
                            textTransform: 'none',
                          }}
                        >
                          Cancel
                        </Button>
                      </Box>
                    </Stack>
                  </Box>
                )}
              </Stack>
            </DroppableDay>
            </Panel>
          </GridLegacy>
        ))}
      </GridLegacy>

      {/* Edit Dialog */}
      <Dialog
        open={editDialog}
        onClose={handleCloseEdit}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
            Edit Planner Item
          </Typography>
          <IconButton size="small" onClick={handleCloseEdit}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              fullWidth
              autoFocus
              size="small"
            />
            <TextField
              label="Notes"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              fullWidth
              multiline
              rows={3}
              size="small"
            />
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Date"
                value={editDate}
                onChange={(newValue) => setEditDate(newValue as Dayjs | null)}
                slotProps={{
                  textField: {
                    size: 'small',
                    fullWidth: true,
                  },
                }}
              />
            </LocalizationProvider>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label="Start Time"
                type="time"
                value={editStartTime}
                onChange={(e) => setEditStartTime(e.target.value)}
                size="small"
                sx={{ flex: 1 }}
                InputLabelProps={{ shrink: true }}
                inputProps={{
                  step: 900,
                }}
              />
              <TextField
                label="End Time"
                type="time"
                value={editEndTime}
                onChange={(e) => setEditEndTime(e.target.value)}
                size="small"
                sx={{ flex: 1 }}
                InputLabelProps={{ shrink: true }}
                inputProps={{
                  step: 900,
                }}
              />
            </Box>
            <TagSelector
              value={editTagId}
              onChange={setEditTagId}
              label="Tag"
              size="small"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={editRecurring}
                  onChange={(e) => setEditRecurring(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <RepeatIcon sx={{ fontSize: '1rem' }} />
                  <Typography variant="body2">Repeat weekly</Typography>
                </Box>
              }
            />
            {editingItem?.isRecurring && editingItem.recurring_planner_item_id && (
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: 'rgba(76, 175, 80, 0.1)',
                  borderRadius: 1,
                  border: '1px solid rgba(76, 175, 80, 0.2)',
                }}
              >
                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <RepeatIcon sx={{ fontSize: '0.875rem' }} />
                  This item repeats every{' '}
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][editingItem.day_of_week]}
                </Typography>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1, gap: 1, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', gap: 1, mr: 'auto' }}>
            <Button
              onClick={() => handleDeleteItem(false)}
              color="error"
              startIcon={<DeleteIcon />}
              size="small"
            >
              Delete this item
            </Button>
            {editingItem?.isRecurring && editingItem.recurring_planner_item_id && (
              <Button
                onClick={() => handleDeleteItem(true)}
                color="error"
                variant="outlined"
                size="small"
              >
                Delete all recurring
              </Button>
            )}
          </Box>
          <Button onClick={handleCloseEdit} size="small">
            Cancel
          </Button>
          <Button
            onClick={handleSaveEdit}
            variant="contained"
            startIcon={<CheckIcon />}
            disabled={!editTitle.trim()}
            size="small"
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Recurring Planner Manager */}
      <RecurringPlannerManager
        open={showRecurringManager}
        onClose={() => setShowRecurringManager(false)}
        onUpdate={loadPlannerItems}
      />
    </Box>
    
    <DragOverlay>
      {activeDragItem ? (
        <Box
          sx={{
            p: 1.5,
            bgcolor: 'primary.main',
            color: 'white',
            borderRadius: 2,
            boxShadow: 3,
            cursor: 'grabbing',
          }}
        >
          <Typography variant="body2">{activeDragItem.title}</Typography>
        </Box>
      ) : null}
    </DragOverlay>
  </DndContext>
  );
}
