import { useEffect, useState, useCallback } from 'react';
import { Box, Card, CardContent, Typography, Chip, IconButton, Stack, Skeleton } from '@mui/material';
import { Refresh, CheckCircleOutline, Insights } from '@mui/icons-material';
import {
  fetchLatestBriefing, fetchPendingTasks, fetchLatestObservation, completeTask,
} from '../../lib/queries';
import type { Briefing, Task, Observation, BriefingSection, BriefingAsk } from '../../lib/types';

export function NowTab() {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [observation, setObservation] = useState<Observation | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const [b, t, o] = await Promise.all([
      fetchLatestBriefing(),
      fetchPendingTasks(),
      fetchLatestObservation(),
    ]);
    setBriefing(b);
    setTasks(t);
    setObservation(o);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handleComplete = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    const result = await completeTask(id);
    if (!result.ok) {
      const fresh = await fetchPendingTasks();
      setTasks(fresh);
    }
  };

  return (
    <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 0.5 }}>
        <Typography variant="overline" sx={{ color: 'text.secondary' }}>Today</Typography>
        <IconButton size="small" onClick={reload} sx={{ color: 'text.secondary' }}>
          <Refresh sx={{ fontSize: 18 }} />
        </IconButton>
      </Stack>

      <BriefingCard briefing={briefing} loading={loading} />
      <TasksCard tasks={tasks} loading={loading} onComplete={handleComplete} />
      <InsightCard observation={observation} loading={loading} />
    </Box>
  );
}

function BriefingCard({ briefing, loading }: { briefing: Briefing | null; loading: boolean }) {
  if (loading) return <CardShell><Skeleton variant="text" /><Skeleton variant="text" width="60%" /></CardShell>;
  if (!briefing) return (
    <CardShell>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>No briefing yet today.</Typography>
    </CardShell>
  );

  return (
    <Card>
      <CardContent sx={{ '&:last-child': { pb: 1.5 }, py: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
          <Chip size="small" label={briefing.kind} sx={{ height: 18, fontSize: '0.65rem' }} />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{briefing.agent_id}</Typography>
        </Stack>
        <Typography variant="h4" sx={{ mb: 1, lineHeight: 1.3 }}>{briefing.headline}</Typography>
        {briefing.body?.sections?.map((s, i) => <SectionView key={i} section={s} />)}
      </CardContent>
    </Card>
  );
}

function SectionView({ section }: { section: BriefingSection }) {
  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
        {section.label}
      </Typography>
      <Box component="ul" sx={{ pl: 2.5, m: 0, mt: 0.25 }}>
        {section.items.map((item, i) => {
          if (typeof item === 'string') {
            return <Typography component="li" key={i} variant="body2" sx={{ mb: 0.25 }}>{item}</Typography>;
          }
          const ask = item as BriefingAsk;
          return (
            <Typography component="li" key={i} variant="body2" sx={{ mb: 0.25 }}>
              <Box component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>{ask.agent}:</Box> {ask.ask}
            </Typography>
          );
        })}
      </Box>
    </Box>
  );
}

function TasksCard({ tasks, loading, onComplete }: { tasks: Task[]; loading: boolean; onComplete: (id: string) => void }) {
  if (loading) return <CardShell><Skeleton variant="text" /><Skeleton variant="text" /></CardShell>;
  return (
    <Card>
      <CardContent sx={{ '&:last-child': { pb: 1.5 }, py: 1.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
          <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
            Pending tasks
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {tasks.length}
          </Typography>
        </Stack>
        {tasks.length === 0 ? (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
            Nothing pending — nice.
          </Typography>
        ) : (
          <Box sx={{ maxHeight: 280, overflowY: 'auto', mx: -0.5, px: 0.5 }}>
            {tasks.map((t) => (
              <Stack key={t.id} direction="row" alignItems="flex-start" spacing={0.5} sx={{ mt: 0.5 }}>
                <IconButton size="small" onClick={() => onComplete(t.id)} sx={{ p: 0.25, mt: 0.1 }}>
                  <CheckCircleOutline sx={{ fontSize: 18, color: 'text.secondary' }} />
                </IconButton>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{t.title}</Typography>
                  {(t.due_date || (t.tags && t.tags.length > 0)) && (
                    <Stack direction="row" spacing={0.5} sx={{ mt: 0.25 }} flexWrap="wrap">
                      {t.due_date && <Chip size="small" label={t.due_date} sx={{ height: 16, fontSize: '0.6rem' }} />}
                      {t.tags?.slice(0, 2).map((tag) => (
                        <Chip key={tag} size="small" label={tag} variant="outlined" sx={{ height: 16, fontSize: '0.6rem' }} />
                      ))}
                    </Stack>
                  )}
                </Box>
                <PriorityDot priority={t.priority} />
              </Stack>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function PriorityDot({ priority }: { priority: number }) {
  const color = priority === 1 ? '#EF5350' : priority === 2 ? '#FFB74D' : '#64B5F6';
  return <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: color, mt: 0.7 }} />;
}

function InsightCard({ observation, loading }: { observation: Observation | null; loading: boolean }) {
  if (loading) return <CardShell><Skeleton variant="text" /></CardShell>;
  if (!observation) return null;
  return (
    <Card>
      <CardContent sx={{ '&:last-child': { pb: 1.5 }, py: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.5 }}>
          <Insights sx={{ fontSize: 16, color: 'primary.main' }} />
          <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
            Latest insight · {observation.agent_id}
          </Typography>
        </Stack>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>{observation.title}</Typography>
        {observation.body && (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            {observation.body}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardContent sx={{ '&:last-child': { pb: 1.5 }, py: 1.5 }}>
        {children}
      </CardContent>
    </Card>
  );
}
