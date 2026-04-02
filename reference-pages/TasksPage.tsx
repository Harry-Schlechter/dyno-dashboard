import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardHeader,
  CardContent,
  Stack,
  IconButton,
  Chip,
  TextField,
  Button,
  Checkbox,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DescriptionIcon from '@mui/icons-material/Description';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { tasksApi } from '../api/tasks';
import { tagsApi } from '../api/tags';
import { subtasksApi } from '../api/subtasks';
import { plannerApi } from '../api/planner';
import { conversionsApi, type PlannerItem } from '../api/conversions';
import type { Tag } from '@life-os/shared';
import { useAuthReady } from '../auth/useAuthReady';
import { TagSelector } from '../components/TagSelector';
import { SubtaskList } from '../components/tasks/SubtaskList';
import { ScheduledBox } from '../components/tasks/ScheduledBox';
import { ScheduleDateTimeDialog } from '../components/tasks/ScheduleDateTimeDialog';
import { PlannerItemCard } from '../components/tasks/PlannerItemCard';
import { useFilteredData } from '../hooks/useFilteredData';

dayjs.extend(isoWeek);

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

type TaskStatus = 'inbox' | 'today' | 'upcoming' | 'someday' | 'done' | 'completed';

export function TasksPage() {
  const authReady = useAuthReady();
  const [tasks, setTasks] = useState<Task[]>([]);
  const filteredTasks = useFilteredData(tasks);
  const [tags, setTags] = useState<Tag[]>([]);
  const [plannerItems, setPlannerItems] = useState<PlannerItem[]>([]);
  const filteredPlannerItems = useFilteredData(plannerItems);
  const [newTaskInputs, setNewTaskInputs] = useState<Record<string, string>>({
    inbox: '',
    today: '',
    upcoming: '',
    someday: '',
  });
  const [newTaskTags, setNewTaskTags] = useState<Record<string, string | null>>({
    inbox: null,
    today: null,
    upcoming: null,
    someday: null,
  });
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [showInputs, setShowInputs] = useState<Record<string, boolean>>({
    inbox: false,
    today: false,
    upcoming: false,
    someday: false,
  });
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [draggedPlanner, setDraggedPlanner] = useState<PlannerItem | null>(null);
  const [dragOverSection, setDragOverSection] = useState<TaskStatus | 'scheduled' | null>(null);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [taskToSchedule, setTaskToSchedule] = useState<Task | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState<string>('');
  const [editingTaskTagId, setEditingTaskTagId] = useState<string | null>(null);
  const [editingPlannerId, setEditingPlannerId] = useState<string | null>(null);
  const [editingPlannerTitle, setEditingPlannerTitle] = useState<string>('');
  const [editingPlannerStartTime, setEditingPlannerStartTime] = useState<string>('');
  const [editingPlannerEndTime, setEditingPlannerEndTime] = useState<string>('');
  const [editingPlannerTagId, setEditingPlannerTagId] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  const [subtaskCounts, setSubtaskCounts] = useState<Record<string, number>>({});
  const editingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editingRef.current && !editingRef.current.contains(event.target as Node)) {
        setEditingTaskId(null);
        setEditingTaskTitle('');
        setEditingTaskTagId(null);
        setEditingPlannerId(null);
        setEditingPlannerTitle('');
        setEditingPlannerStartTime('');
        setEditingPlannerEndTime('');
        setEditingPlannerTagId(null);
        setShowSubtaskInput(false);
      }
    };

    if (editingTaskId || showSubtaskInput) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingTaskId, showSubtaskInput]);

  const loadTasks = async () => {
    try {
      const data = await tasksApi.list();
      setTasks(data);
      loadSubtaskCounts(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const loadSubtaskCounts = async (taskList: Task[]) => {
    const counts: Record<string, number> = {};
    await Promise.all(
      taskList.map(async (task) => {
        try {
          const subtasks = await subtasksApi.getByTask(task.id);
          counts[task.id] = subtasks.length;
        } catch (error) {
          counts[task.id] = 0;
        }
      })
    );
    setSubtaskCounts(counts);
  };

  const loadTags = async () => {
    try {
      const data = await tagsApi.list();
      setTags(data);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const loadPlannerItems = async () => {
    try {
      const items = await plannerApi.list();
      // Filter for next 7 days
      const today = dayjs();
      const endDate = today.add(7, 'day');
      const filtered = items.filter((item) => {
        const itemDate = dayjs(item.week_start).add(item.day_of_week, 'day');
        return itemDate.isAfter(today.subtract(1, 'day')) && itemDate.isBefore(endDate);
      });
      setPlannerItems(filtered);
    } catch (error) {
      console.error('Failed to load planner items:', error);
    }
  };

  useEffect(() => {
    if (authReady) {
      loadTasks();
      loadTags();
      loadPlannerItems();
    }
  }, [authReady]);

  const getTagById = (tagId: string | null) => {
    if (!tagId) return null;
    return tags.find((tag) => tag.id === tagId);
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const updates: { status: string; completed_at?: string | null } = {
        status: newStatus,
      };

      // Note: 'done' is not a valid status in the current schema
      // Valid statuses are: 'inbox', 'today', 'upcoming', 'someday'
      // Keeping this logic for when completed status is added
      if (newStatus === 'completed') {
        updates.completed_at = new Date().toISOString();
      } else {
        updates.completed_at = null;
      }

      await tasksApi.update(taskId, updates);
      await loadTasks();
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent, section: TaskStatus | 'scheduled') => {
    e.preventDefault();
    setDragOverSection(section);
  };

  const handleDragLeave = () => {
    setDragOverSection(null);
  };

  const handleDrop = async (e: React.DragEvent, target: TaskStatus | 'scheduled') => {
    e.preventDefault();
    setDragOverSection(null);

    // Handle task being dragged to Scheduled box
    if (target === 'scheduled' && draggedTask) {
      setTaskToSchedule(draggedTask);
      setScheduleDialogOpen(true);
      setDraggedTask(null);
      return;
    }

    // Handle planner item being dragged to a task bucket
    if (target !== 'scheduled' && draggedPlanner) {
      await handleConvertPlannerToTask(draggedPlanner.id, target);
      return;
    }

    // Handle task being dragged between buckets
    if (target !== 'scheduled' && draggedTask && draggedTask.status !== target) {
      await handleStatusChange(draggedTask.id, target);
    }

    setDraggedTask(null);
    setDraggedPlanner(null);
  };

  const handleToggleComplete = async (task: Task) => {
    const newStatus = task.status === 'done' ? 'inbox' : 'done';
    await handleStatusChange(task.id, newStatus);
  };

  const handleStartEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTaskTitle(task.title);
    setEditingTaskTagId(task.tag_id);
    setShowSubtaskInput(false);
  };

  const handleTaskClick = (task: Task) => {
    // Open edit mode when clicking on task
    handleStartEdit(task);
  };

  const handleToggleSubtasks = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    if (expandedTaskId === taskId) {
      setExpandedTaskId(null);
      setShowSubtaskInput(false);
    } else {
      setExpandedTaskId(taskId);
      setShowSubtaskInput(false);
    }
  };

  const handleSaveEdit = async (taskId: string) => {
    if (!editingTaskTitle.trim()) {
      setEditingTaskId(null);
      return;
    }

    try {
      await tasksApi.update(taskId, {
        title: editingTaskTitle.trim(),
        tag_id: editingTaskTagId,
      });
      await loadTasks();
      setEditingTaskId(null);
      setEditingTaskTitle('');
      setEditingTaskTagId(null);
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditingTaskTitle('');
    setEditingTaskTagId(null);
    setEditingPlannerId(null);
    setEditingPlannerTitle('');
    setEditingPlannerStartTime('');
    setEditingPlannerEndTime('');
    setEditingPlannerTagId(null);
  };

  const handleStartPlannerEdit = (item: PlannerItem) => {
    setEditingPlannerId(item.id);
    setEditingPlannerTitle(item.title);
    setEditingPlannerStartTime(item.start_time || '');
    setEditingPlannerEndTime(item.end_time || '');
    setEditingPlannerTagId(item.tag_id);
  };

  const handleSavePlannerEdit = async (itemId: string, updates: { title?: string; start_time?: string | null; end_time?: string | null; tag_id?: string | null }) => {
    try {
      await plannerApi.update(itemId, updates);
      await loadPlannerItems();
      setEditingPlannerId(null);
      setEditingPlannerTitle('');
      setEditingPlannerStartTime('');
      setEditingPlannerEndTime('');
      setEditingPlannerTagId(null);
    } catch (error) {
      console.error('Failed to update planner item:', error);
    }
  };

  const handleDeletePlannerItem = async (itemId: string) => {
    try {
      await plannerApi.delete(itemId);
      await loadPlannerItems();
      setEditingPlannerId(null);
    } catch (error) {
      console.error('Failed to delete planner item:', error);
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await tasksApi.delete(taskId);
      await loadTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleAddTask = async (status: TaskStatus) => {
    const title = newTaskInputs[status];
    if (!title?.trim()) return;

    setLoading((prev) => ({ ...prev, [status]: true }));

    try {
      await tasksApi.create({
        title: title.trim(),
        status,
        priority: 2,
        tag_id: newTaskTags[status],
      });
      setNewTaskInputs((prev) => ({ ...prev, [status]: '' }));
      setNewTaskTags((prev) => ({ ...prev, [status]: null }));
      setShowInputs((prev) => ({ ...prev, [status]: false }));
      await loadTasks();
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setLoading((prev) => ({ ...prev, [status]: false }));
    }
  };

  const handleScheduleTask = async (date: Date, startTime?: string, endTime?: string) => {
    if (!taskToSchedule) return;

    // Check for subtasks
    if (subtaskCounts[taskToSchedule.id] > 0) {
      alert('Cannot schedule tasks with subtasks. Please complete or delete subtasks first.');
      return;
    }

    try {
      await conversionsApi.taskToPlanner({
        taskId: taskToSchedule.id,
        date: dayjs(date).format('YYYY-MM-DD'),
        startTime: startTime || null,
        endTime: endTime || null,
      });
      await Promise.all([loadTasks(), loadPlannerItems()]);
      setScheduleDialogOpen(false);
      setTaskToSchedule(null);
    } catch (error) {
      console.error('Failed to schedule task:', error);
      alert('Failed to schedule task: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleConvertPlannerToTask = async (plannerItemId: string, targetStatus: TaskStatus) => {
    try {
      await conversionsApi.plannerToTask({
        plannerItemId,
        targetStatus,
      });
      await Promise.all([loadTasks(), loadPlannerItems()]);
      setDraggedPlanner(null);
    } catch (error) {
      console.error('Failed to convert planner to task:', error);
      alert('Failed to convert planner item: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handlePlannerToggleComplete = async (item: PlannerItem) => {
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

  // const isOverdue = (dueDate: string | null) => {
  //   if (!dueDate) return false;
  //   return dayjs(dueDate).isBefore(dayjs(), 'day');
  // };

  // Group tasks by status
  const inboxTasks = filteredTasks.filter((t) => t.status === 'inbox');
  const todayTasks = filteredTasks.filter((t) => t.status === 'today');

  // Get today's planner items
  const todayPlannerItems = filteredPlannerItems.filter((item) => {
    const itemDate = dayjs(item.week_start).add(item.day_of_week, 'day');
    return itemDate.isSame(dayjs(), 'day');
  });
  const upcomingTasks = filteredTasks
    .filter((t) => t.status === 'upcoming')
    .sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return dayjs(a.due_date).diff(dayjs(b.due_date));
    });
  const somedayTasks = filteredTasks.filter((t) => t.status === 'someday');
  const doneTasks = filteredTasks
    .filter((t) => t.status === 'done')
    .filter((t) => {
      if (!t.completed_at) return false;
      return dayjs(t.completed_at).isAfter(dayjs().subtract(14, 'day'));
    });

  const renderTaskList = (taskList: Task[], sectionTitle: string, status: TaskStatus) => {
    const isDropTarget = dragOverSection === status;

    return (
      <Card
        onDragOver={(e) => handleDragOver(e, status)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, status)}
        sx={isDropTarget ? {
          border: '2px dashed',
          borderColor: 'primary.main',
          bgcolor: (theme) => `${theme.palette.primary.main}15`,
          transform: 'scale(1.02)',
          boxShadow: (theme) => `0 0 20px ${theme.palette.primary.main}40`,
        } : {
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: 'pointer',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: (theme) => `0 8px 24px ${theme.palette.primary.main}33`,
          },
        }}
      >
        <CardHeader
          title={sectionTitle}
          subheader={taskList.length > 0 ? `${taskList.length} ${taskList.length === 1 ? 'task' : 'tasks'}` : undefined}
          action={
            status !== 'done' && (
              <IconButton
                size="small"
                onClick={() => setShowInputs((prev) => ({ ...prev, [status]: true }))}
                sx={{
                  color: 'text.secondary',
                  '&:hover': {
                    color: 'primary.main',
                    bgcolor: (theme) => `${theme.palette.primary.main}1A`,
                  },
                }}
              >
                <AddIcon />
              </IconButton>
            )
          }
        />
        <CardContent>
          <Stack spacing={1.5}>
            {taskList.length === 0 && (status !== 'today' || todayPlannerItems.length === 0) ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 1 }}>
                {isDropTarget ? 'Drop task here' : 'No tasks'}
              </Typography>
            ) : (
              <Stack spacing={1}>
                {taskList.map((task) => (
              <Box
                key={task.id}
                ref={editingTaskId === task.id || (expandedTaskId === task.id && showSubtaskInput) ? editingRef : null}
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 2.5,
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  border: '1px solid rgba(255, 255, 255, 0.03)',
                  opacity: draggedTask?.id === task.id ? 0.5 : 1,
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.05)',
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                  },
                }}
              >
                {/* Main task row */}
                <Box
                  draggable
                  onDragStart={() => handleDragStart(task)}
                  onClick={(e) => {
                    // Only handle click if not clicking on interactive elements
                    const target = e.target as HTMLElement;
                    const isInteractive = target.closest('button, input, a, [role="button"]');
                    if (!isInteractive && editingTaskId !== task.id) {
                      handleTaskClick(task);
                    }
                  }}
                  sx={{
                    p: 1.25,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    cursor: editingTaskId === task.id ? 'default' : 'grab',
                    '&:hover': {
                      transform: 'translateX(2px)',
                    },
                    '&:active': {
                      cursor: editingTaskId === task.id ? 'default' : 'grabbing',
                    },
                  }}
                >
                  <IconButton
                    size="small"
                    sx={{
                      p: 0,
                      cursor: 'grab',
                      color: 'text.secondary',
                      '&:hover': {
                        color: 'text.primary',
                        bgcolor: 'transparent',
                      },
                    }}
                  >
                    <DragIndicatorIcon fontSize="small" />
                  </IconButton>

                  <Checkbox
                    checked={task.status === 'done'}
                    onChange={() => handleToggleComplete(task)}
                    size="small"
                    sx={{ p: 0 }}
                  />

                  <Box sx={{ flex: 1 }}>
                    {editingTaskId === task.id ? (
                      <Stack spacing={1}>
                        <TextField
                          size="small"
                          value={editingTaskTitle}
                          onChange={(e) => setEditingTaskTitle(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveEdit(task.id);
                            } else if (e.key === 'Escape') {
                              handleCancelEdit();
                            }
                          }}
                          autoFocus
                          fullWidth
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              bgcolor: 'rgba(255, 255, 255, 0.02)',
                              fontSize: '0.9rem',
                            },
                          }}
                        />
                        <TagSelector
                          value={editingTaskTagId}
                          onChange={setEditingTaskTagId}
                          label="Tag"
                          size="small"
                          fullWidth={true}
                        />
                      </Stack>
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                        <Typography
                          variant="body2"
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(task);
                          }}
                          sx={{
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            textDecoration: task.status === 'done' ? 'line-through' : 'none',
                            color: task.status === 'done' ? 'text.secondary' : 'text.primary',
                            cursor: 'pointer',
                            '&:hover': {
                              color: 'primary.main',
                            },
                          }}
                        >
                          {task.title}
                        </Typography>
                        {task.tag_id && getTagById(task.tag_id) && (
                          <Chip
                            label={getTagById(task.tag_id)!.name}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.7rem',
                              backgroundColor: getTagById(task.tag_id)!.color,
                              color: '#fff',
                            }}
                          />
                        )}
                        {task.note_id && (
                          <Chip
                            icon={<DescriptionIcon sx={{ fontSize: '0.75rem !important' }} />}
                            label="Note"
                            size="small"
                            variant="outlined"
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              borderColor: 'rgba(255, 255, 255, 0.2)',
                              color: 'text.secondary',
                              '& .MuiChip-icon': {
                                color: 'text.secondary',
                              },
                            }}
                          />
                        )}
                      </Box>
                    )}
                  </Box>

                  {subtaskCounts[task.id] > 0 && (
                    <IconButton
                      size="small"
                      onClick={(e) => handleToggleSubtasks(e, task.id)}
                      sx={{
                        p: 0,
                        color: 'text.secondary',
                        '&:hover': {
                          color: 'primary.main',
                          bgcolor: 'transparent',
                        },
                      }}
                    >
                      {expandedTaskId === task.id ? (
                        <ExpandMoreIcon fontSize="small" />
                      ) : (
                        <ChevronRightIcon fontSize="small" />
                      )}
                    </IconButton>
                  )}

                  {editingTaskId === task.id && (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={async () => {
                          // Save current edit
                          await handleSaveEdit(task.id);
                          // Immediately close edit mode and show creation input
                          setEditingTaskId(null);
                          setEditingTaskTitle('');
                          setEditingTaskTagId(null);
                          setExpandedTaskId(task.id);
                          setShowSubtaskInput(true);
                        }}
                        title="Add subtask"
                        sx={{
                          color: 'text.secondary',
                          '&:hover': { color: 'primary.main' },
                        }}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleSaveEdit(task.id)}
                        title="Save"
                        sx={{
                          color: 'text.secondary',
                          '&:hover': { color: 'success.main' },
                        }}
                      >
                        <CheckIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(task.id)}
                        title="Delete"
                        sx={{
                          color: 'text.secondary',
                          '&:hover': { color: 'error.main' },
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </Box>

                {/* Subtasks section - below main task with separator and indentation */}
                {editingTaskId !== task.id && status !== 'done' && expandedTaskId === task.id && (
                  <Box
                    sx={{
                      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                      pl: 5,
                      pr: 1.25,
                      pb: 1.25,
                    }}
                  >
                    <SubtaskList
                      taskId={task.id}
                      showInput={showSubtaskInput}
                      onChange={() => loadSubtaskCounts(tasks)}
                    />
                  </Box>
                )}
              </Box>
            ))}

                {/* Add planner items to Today bucket */}
                {status === 'today' && todayPlannerItems.map((item) => (
                  <PlannerItemCard
                    key={`planner-${item.id}`}
                    item={item}
                    showPrefix={true}
                    tags={tags}
                    onToggleComplete={handlePlannerToggleComplete}
                    onDragStart={() => setDraggedPlanner(item)}
                    onEdit={handleSavePlannerEdit}
                    onDelete={handleDeletePlannerItem}
                    isEditing={editingPlannerId === item.id}
                    onStartEdit={handleStartPlannerEdit}
                    onCancelEdit={handleCancelEdit}
                    editingTitle={editingPlannerTitle}
                    onEditingTitleChange={setEditingPlannerTitle}
                    editingStartTime={editingPlannerStartTime}
                    onEditingStartTimeChange={setEditingPlannerStartTime}
                    editingEndTime={editingPlannerEndTime}
                    onEditingEndTimeChange={setEditingPlannerEndTime}
                    editingTagId={editingPlannerTagId}
                  />
                ))}
              </Stack>
            )}

            {status !== 'done' && showInputs[status] && (
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    placeholder="New task…"
                    value={newTaskInputs[status] || ''}
                    onChange={(e) =>
                      setNewTaskInputs((prev) => ({ ...prev, [status]: e.target.value }))
                    }
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddTask(status);
                      } else if (e.key === 'Escape') {
                        setShowInputs((prev) => ({ ...prev, [status]: false }));
                        setNewTaskInputs((prev) => ({ ...prev, [status]: '' }));
                        setNewTaskTags((prev) => ({ ...prev, [status]: null }));
                      }
                    }}
                    autoFocus
                    fullWidth
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'rgba(255, 255, 255, 0.02)',
                      },
                    }}
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TagSelector
                    value={newTaskTags[status]}
                    onChange={(tagId) => setNewTaskTags((prev) => ({ ...prev, [status]: tagId }))}
                    label="Tag"
                    size="small"
                    fullWidth={false}
                  />
                  <Button
                    variant="contained"
                    onClick={() => handleAddTask(status)}
                    disabled={loading[status] || !newTaskInputs[status]?.trim()}
                    size="small"
                  >
                    Add
                  </Button>
                  <Button
                    variant="text"
                    onClick={() => {
                      setShowInputs((prev) => ({ ...prev, [status]: false }));
                      setNewTaskInputs((prev) => ({ ...prev, [status]: '' }));
                      setNewTaskTags((prev) => ({ ...prev, [status]: null }));
                    }}
                    size="small"
                  >
                    Cancel
                  </Button>
                </Box>
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: { xs: 2, sm: 2.5, md: 3 } }}>
        Tasks
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: '1fr',
            md: 'repeat(2, 1fr)',
            lg: 'repeat(3, 1fr)',
            xl: 'repeat(3, 1fr)'
          },
          gap: { xs: 2, sm: 2.5 },
        }}
      >
        {renderTaskList(inboxTasks, 'Inbox', 'inbox')}
        {renderTaskList(todayTasks, 'Today', 'today')}
        {renderTaskList(upcomingTasks, 'Upcoming', 'upcoming')}
        {renderTaskList(somedayTasks, 'Someday', 'someday')}
        {renderTaskList(doneTasks, 'Done', 'done')}
        <ScheduledBox
          plannerItems={filteredPlannerItems}
          tags={tags}
          onDragOver={(e) => handleDragOver(e, 'scheduled')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'scheduled')}
          isDropTarget={dragOverSection === 'scheduled'}
          onToggleComplete={handlePlannerToggleComplete}
          onDragStartPlanner={(item) => setDraggedPlanner(item)}
          onEdit={handleSavePlannerEdit}
          onDelete={handleDeletePlannerItem}
          editingPlannerId={editingPlannerId}
          onStartEdit={handleStartPlannerEdit}
          onCancelEdit={handleCancelEdit}
          editingTitle={editingPlannerTitle}
          onEditingTitleChange={setEditingPlannerTitle}
          editingStartTime={editingPlannerStartTime}
          onEditingStartTimeChange={setEditingPlannerStartTime}
          editingEndTime={editingPlannerEndTime}
          onEditingEndTimeChange={setEditingPlannerEndTime}
          editingTagId={editingPlannerTagId}
        />
      </Box>

      {/* Schedule Task Dialog */}
      <ScheduleDateTimeDialog
        open={scheduleDialogOpen}
        task={taskToSchedule}
        onClose={() => {
          setScheduleDialogOpen(false);
          setTaskToSchedule(null);
          setDraggedTask(null);
        }}
        onConfirm={handleScheduleTask}
      />
    </Box>
  );
}
