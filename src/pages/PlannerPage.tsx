import React, { useMemo, useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Checkbox, Chip, Stack,
  IconButton,
} from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { useTasks, Task } from '../hooks/useTasks';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isToday } from 'date-fns';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorMessage from '../components/common/ErrorMessage';
import { colorSystem } from '../theme/designSystem';

const priorityColors: Record<number, string> = { 1: colorSystem.priority.high, 2: colorSystem.priority.medium, 3: colorSystem.priority.low };

const PlannerPage: React.FC = () => {
  const { data: tasks, loading, error, refetch, completeTask } = useTasks();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const weekDays = useMemo(() => {
    return eachDayOfInterval({
      start: weekStart,
      end: endOfWeek(weekStart, { weekStartsOn: 1 }),
    });
  }, [weekStart]);

  const tasksByDay = useMemo(() => {
    const map: Record<string, Task[]> = {};
    weekDays.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      map[dateStr] = tasks.filter(t => {
        if (t.due_date) return t.due_date === dateStr;
        return false;
      });
    });
    // Unscheduled tasks
    const scheduledIds = new Set(Object.values(map).flat().map(t => t.id));
    map['unscheduled'] = tasks.filter(t => !scheduledIds.has(t.id) && t.status === 'pending');
    return map;
  }, [tasks, weekDays]);

  if (loading) return <LoadingSkeleton variant="card" count={3} />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Planner</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {format(weekStart, 'MMM d')} — {format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'MMM d, yyyy')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => setWeekStart(prev => subWeeks(prev, 1))}><ChevronLeft /></IconButton>
          <Typography variant="h6">{format(weekStart, 'MMM d')} — {format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'MMM d, yyyy')}</Typography>
          <IconButton onClick={() => setWeekStart(prev => addWeeks(prev, 1))}><ChevronRight /></IconButton>
        </Box>
      </Box>

      <Grid container spacing={2}>
        {weekDays.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayTasks = tasksByDay[dateStr] || [];
          const today = isToday(day);

          return (
            <Grid size={{ xs: 12, sm: 6, md: 12 / 7 }} key={dateStr}>
              <Card sx={today ? { border: '1px solid rgba(91, 141, 239, 0.4)', bgcolor: 'rgba(91, 141, 239, 0.05)' } : {}}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={today ? 700 : 500} color={today ? '#5B8DEF' : 'text.primary'}>
                      {format(day, 'EEE')}
                    </Typography>
                    <Typography variant="caption" color={today ? '#5B8DEF' : 'text.secondary'} fontWeight={today ? 700 : 400}>
                      {format(day, 'd')}
                    </Typography>
                  </Box>
                  <Stack spacing={0.5}>
                    {dayTasks.length === 0 ? (
                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>No tasks</Typography>
                    ) : (
                      dayTasks.map(task => (
                        <Box
                          key={task.id}
                          sx={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 0.5,
                            p: 0.75,
                            borderRadius: 1,
                            borderLeft: `3px solid ${priorityColors[task.priority] || '#7d8590'}`,
                            bgcolor: 'rgba(255,255,255,0.03)',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                          }}
                        >
                          <Checkbox
                            checked={task.status === 'completed'}
                            onChange={() => task.status !== 'completed' && completeTask(task.id)}
                            size="small"
                            sx={{ p: 0.25, mt: 0.1 }}
                          />
                          <Typography
                            variant="caption"
                            sx={{
                              textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                              opacity: task.status === 'completed' ? 0.5 : 1,
                              lineHeight: 1.4,
                            }}
                          >
                            {task.title}
                          </Typography>
                        </Box>
                      ))
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Unscheduled Tasks */}
      {(tasksByDay['unscheduled'] || []).length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Unscheduled Tasks</Typography>
            <Stack spacing={0.75}>
              {tasksByDay['unscheduled'].slice(0, 20).map(task => (
                <Box key={task.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.03)' }}>
                  <Checkbox
                    checked={task.status === 'completed'}
                    onChange={() => task.status !== 'completed' && completeTask(task.id)}
                    size="small"
                  />
                  <Box sx={{ width: 4, height: 20, borderRadius: 1, bgcolor: priorityColors[task.priority] || '#7d8590' }} />
                  <Typography variant="body2" sx={{ flex: 1 }}>{task.title}</Typography>
                  {task.tags && task.tags.map(tag => (
                    <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                  ))}
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default PlannerPage;
