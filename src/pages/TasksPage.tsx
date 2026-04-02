import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, Stack,
  IconButton, Checkbox, ToggleButton, ToggleButtonGroup,
  Collapse, Alert,
} from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import InboxRoundedIcon from '@mui/icons-material/InboxRounded';
import { useTasks, Task } from '../hooks/useTasks';
import { formatDate } from '../lib/formatters';
import { parseISO } from 'date-fns';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorMessage from '../components/common/ErrorMessage';
import { colorSystem, glassmorphism } from '../theme/designSystem';

const priorityLabels: Record<number, string> = { 1: 'P1 — High', 2: 'P2 — Medium', 3: 'P3 — Low' };
const priorityColors: Record<number, string> = { 1: colorSystem.priority.high, 2: colorSystem.priority.medium, 3: colorSystem.priority.low };

const TasksPage: React.FC = () => {
  const { data: tasks, loading, error, refetch, completeTask } = useTasks();
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [expanded, setExpanded] = useState<Record<number, boolean>>({ 1: true, 2: true, 3: true });

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => statusFilter === 'all' || t.status === statusFilter);
  }, [tasks, statusFilter]);

  const groupedByPriority = useMemo(() => {
    const groups: Record<number, Task[]> = { 1: [], 2: [], 3: [] };
    filteredTasks.forEach(t => {
      const p = t.priority || 3;
      if (!groups[p]) groups[p] = [];
      groups[p].push(t);
    });
    return groups;
  }, [filteredTasks]);

  const taskCounts = useMemo(() => {
    const pending = tasks.filter(t => t.status === 'pending').length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const overdue = tasks.filter(t => {
      if (!t.due_date || t.status === 'completed') return false;
      return parseISO(t.due_date) < new Date();
    }).length;
    return { total: tasks.length, pending, completed, overdue };
  }, [tasks]);

  const isOverdue = (task: Task) => {
    if (!task.due_date || task.status === 'completed') return false;
    return parseISO(task.due_date) < new Date();
  };

  if (loading) return <LoadingSkeleton variant="card" count={3} />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h3" fontWeight={700} sx={{ mb: 1.5 }}>
            Tasks
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              label={`${taskCounts.total} total`}
              size="small"
              sx={{
                bgcolor: 'rgba(255,255,255,0.06)',
                color: 'text.secondary',
                fontWeight: 500,
                fontSize: '0.75rem',
              }}
            />
            <Chip
              label={`${taskCounts.pending} pending`}
              size="small"
              sx={{
                bgcolor: `${colorSystem.primary[500]}18`,
                color: colorSystem.primary[300],
                fontWeight: 500,
                fontSize: '0.75rem',
              }}
            />
            {taskCounts.overdue > 0 && (
              <Chip
                label={`${taskCounts.overdue} overdue`}
                size="small"
                sx={{
                  bgcolor: `${colorSystem.error.main}18`,
                  color: colorSystem.error.light,
                  fontWeight: 500,
                  fontSize: '0.75rem',
                }}
              />
            )}
            <Chip
              icon={<CheckCircleOutlineRoundedIcon sx={{ fontSize: 14 }} />}
              label={`${taskCounts.completed} done`}
              size="small"
              sx={{
                bgcolor: `${colorSystem.success.main}18`,
                color: colorSystem.success.light,
                fontWeight: 500,
                fontSize: '0.75rem',
                '& .MuiChip-icon': { color: 'inherit' },
              }}
            />
          </Stack>
        </Box>
        <ToggleButtonGroup value={statusFilter} exclusive onChange={(_, v) => v && setStatusFilter(v)} size="small">
          <ToggleButton value="pending">Pending</ToggleButton>
          <ToggleButton value="completed">Completed</ToggleButton>
          <ToggleButton value="blocked">Blocked</ToggleButton>
          <ToggleButton value="all">All</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Priority groups */}
      <Stack spacing={3}>
        {[1, 2, 3].map(priority => {
          const priorityTasks = groupedByPriority[priority] || [];
          if (priorityTasks.length === 0) return null;
          const color = priorityColors[priority];

          return (
            <Box key={priority}>
              {/* Section header */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  mb: 1.5,
                  px: 1,
                  py: 1,
                  borderRadius: 2,
                  transition: 'background-color 0.2s ease',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
                }}
                onClick={() => setExpanded(prev => ({ ...prev, [priority]: !prev[priority] }))}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 4,
                      height: 28,
                      borderRadius: 2,
                      background: `linear-gradient(180deg, ${color}, ${color}66)`,
                      flexShrink: 0,
                    }}
                  />
                  <Typography variant="h6" fontWeight={600} sx={{ letterSpacing: '-0.01em' }}>
                    {priorityLabels[priority]}
                  </Typography>
                  <Chip
                    label={priorityTasks.length}
                    size="small"
                    sx={{
                      bgcolor: `${color}1A`,
                      color: color,
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      height: 22,
                      minWidth: 28,
                    }}
                  />
                </Box>
                <IconButton
                  size="small"
                  sx={{
                    color: 'text.secondary',
                    transition: 'transform 0.3s ease',
                    transform: expanded[priority] ? 'rotate(0deg)' : 'rotate(-90deg)',
                  }}
                >
                  <ExpandLess />
                </IconButton>
              </Box>

              {/* Task list */}
              <Collapse in={expanded[priority]} timeout={300}>
                <Stack spacing={1}>
                  {priorityTasks.map(task => {
                    const overdue = isOverdue(task);
                    const completed = task.status === 'completed';

                    return (
                      <Box
                        key={task.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 1.5,
                          p: 2,
                          borderRadius: 2,
                          bgcolor: overdue
                            ? 'rgba(244, 67, 54, 0.06)'
                            : 'rgba(255,255,255,0.03)',
                          borderLeft: `3px solid ${overdue ? colorSystem.error.main : color}`,
                          transition: 'all 0.2s ease',
                          opacity: completed ? 0.55 : 1,
                          ...(!completed && {
                            '&:hover': {
                              bgcolor: overdue
                                ? 'rgba(244, 67, 54, 0.1)'
                                : 'rgba(255,255,255,0.06)',
                              transform: 'translateX(2px)',
                            },
                          }),
                        }}
                      >
                        <Checkbox
                          checked={completed}
                          onChange={() => !completed && completeTask(task.id)}
                          size="small"
                          sx={{
                            mt: -0.25,
                            color: overdue ? colorSystem.error.main : `${color}99`,
                            '&.Mui-checked': {
                              color: colorSystem.success.main,
                            },
                          }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="body1"
                            sx={{
                              fontWeight: 500,
                              textDecoration: completed ? 'line-through' : 'none',
                              lineHeight: 1.4,
                            }}
                          >
                            {task.title}
                          </Typography>
                          {task.description && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                mt: 0.5,
                                lineHeight: 1.5,
                                opacity: 0.8,
                              }}
                            >
                              {task.description}
                            </Typography>
                          )}
                          <Stack direction="row" spacing={0.75} sx={{ mt: 1.25 }} flexWrap="wrap" useFlexGap>
                            {task.due_date && (
                              <Chip
                                icon={<CalendarTodayRoundedIcon sx={{ fontSize: 12 }} />}
                                label={formatDate(task.due_date)}
                                size="small"
                                variant="outlined"
                                color={overdue ? 'error' : 'default'}
                                sx={{
                                  fontSize: '0.7rem',
                                  height: 24,
                                  '& .MuiChip-icon': {
                                    color: overdue ? colorSystem.error.light : 'inherit',
                                  },
                                  ...(overdue && {
                                    borderColor: `${colorSystem.error.main}66`,
                                    bgcolor: `${colorSystem.error.main}0D`,
                                  }),
                                }}
                              />
                            )}
                            {task.status === 'blocked' && (
                              <Chip
                                label="Blocked"
                                size="small"
                                color="warning"
                                sx={{
                                  fontSize: '0.7rem',
                                  height: 24,
                                  fontWeight: 600,
                                }}
                              />
                            )}
                            {task.tags && task.tags.map(tag => (
                              <Chip
                                key={tag}
                                label={tag}
                                size="small"
                                variant="outlined"
                                sx={{
                                  fontSize: '0.7rem',
                                  height: 24,
                                  opacity: 0.65,
                                  borderColor: 'rgba(255,255,255,0.12)',
                                }}
                              />
                            ))}
                          </Stack>
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              </Collapse>
            </Box>
          );
        })}

        {/* Empty state */}
        {filteredTasks.length === 0 && (
          <Card
            sx={{
              ...glassmorphism.dark,
              borderRadius: 3,
              textAlign: 'center',
              py: 6,
            }}
          >
            <CardContent>
              <InboxRoundedIcon
                sx={{
                  fontSize: 48,
                  color: 'text.secondary',
                  opacity: 0.4,
                  mb: 2,
                }}
              />
              <Typography variant="h6" fontWeight={500} sx={{ mb: 0.5, opacity: 0.7 }}>
                No tasks found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.5 }}>
                Nothing matches the current filter. Try switching to a different view.
              </Typography>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Box>
  );
};

export default TasksPage;
