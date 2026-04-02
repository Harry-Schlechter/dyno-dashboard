import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Stack,
  ToggleButton, ToggleButtonGroup, Dialog, DialogTitle, DialogContent, IconButton,
} from '@mui/material';
import { Close, ChevronLeft, ChevronRight } from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ScatterChart, Scatter, ZAxis } from 'recharts';
import { useDailyLogs, DailyLog } from '../hooks/useDailyLogs';
import { useSleep } from '../hooks/useSleep';
import { formatDateShort, formatDate } from '../lib/formatters';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from 'date-fns';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorMessage from '../components/common/ErrorMessage';

const moodColors: Record<number, string> = { 1: '#F44336', 2: '#FF9800', 3: '#FFB74D', 4: '#5B8DEF', 5: '#4CAF50' };

const JournalPage: React.FC = () => {
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('90d');
  const { data: logs, loading, error, refetch } = useDailyLogs(range);
  const { data: sleepData } = useSleep(range);
  const [selectedLog, setSelectedLog] = useState<DailyLog | null>(null);
  const [calMonth, setCalMonth] = useState(new Date());

  const logsByDate = useMemo(() => {
    const map: Record<string, DailyLog> = {};
    logs.forEach(l => { map[l.date] = l; });
    return map;
  }, [logs]);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(calMonth);
    const end = endOfMonth(calMonth);
    const days = eachDayOfInterval({ start, end });
    const startPad = getDay(start);
    return { days, startPad };
  }, [calMonth]);

  const moodChart = useMemo(() => {
    return logs.filter(l => l.mood).slice().reverse().map(l => ({
      date: formatDateShort(l.date),
      mood: l.mood,
      energy: l.energy,
      stress: l.stress,
    }));
  }, [logs]);

  const correlationData = useMemo(() => {
    return logs.filter(l => l.mood).map(l => {
      const sleep = sleepData.find(s => s.date === l.date);
      return {
        mood: l.mood,
        sleep: sleep?.hours || 0,
        date: l.date,
      };
    }).filter(d => d.sleep > 0);
  }, [logs, sleepData]);

  if (loading) return <LoadingSkeleton variant="card" count={3} />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Journal & Mood</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Journal entries and mood tracking</Typography>
        </Box>
        <ToggleButtonGroup value={range} exclusive onChange={(_, v) => v && setRange(v)} size="small">
          <ToggleButton value="7d">7D</ToggleButton>
          <ToggleButton value="30d">30D</ToggleButton>
          <ToggleButton value="90d">90D</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
        {/* Calendar */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <IconButton size="small" onClick={() => setCalMonth(prev => subMonths(prev, 1))}><ChevronLeft /></IconButton>
                <Typography variant="h6">{format(calMonth, 'MMMM yyyy')}</Typography>
                <IconButton size="small" onClick={() => setCalMonth(prev => addMonths(prev, 1))}><ChevronRight /></IconButton>
              </Box>
              <Grid container spacing={0.5}>
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                  <Grid size={{ xs: 12 / 7 }} key={d}>
                    <Typography variant="caption" color="text.secondary" textAlign="center" display="block">{d}</Typography>
                  </Grid>
                ))}
                {Array.from({ length: calendarDays.startPad }).map((_, i) => (
                  <Grid size={{ xs: 12 / 7 }} key={`pad-${i}`} />
                ))}
                {calendarDays.days.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const log = logsByDate[dateStr];
                  const hasJournal = log?.journal;
                  const mood = log?.mood;
                  return (
                    <Grid size={{ xs: 12 / 7 }} key={dateStr}>
                      <Box
                        onClick={() => log && setSelectedLog(log)}
                        sx={{
                          textAlign: 'center',
                          py: 1,
                          borderRadius: 1,
                          cursor: log ? 'pointer' : 'default',
                          bgcolor: hasJournal ? 'rgba(91, 141, 239, 0.15)' : mood ? 'rgba(255,255,255,0.03)' : 'transparent',
                          border: hasJournal ? '1px solid rgba(91, 141, 239, 0.3)' : '1px solid transparent',
                          '&:hover': log ? { bgcolor: 'rgba(91, 141, 239, 0.25)' } : {},
                          transition: 'all 0.15s',
                        }}
                      >
                        <Typography variant="body2" fontSize={12}>{format(day, 'd')}</Typography>
                        {mood && (
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: moodColors[mood] || '#7d8590', mx: 'auto', mt: 0.25 }} />
                        )}
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Mood Trend */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ '&:hover': { transform: 'none' } }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Mood Trend</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={moodChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" stroke="#7d8590" fontSize={12} />
                  <YAxis stroke="#7d8590" fontSize={12} domain={[0, 5]} />
                  <Tooltip contentStyle={{ backgroundColor: '#121821', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
                  <Line type="monotone" dataKey="mood" stroke="#5B8DEF" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Energy & Stress */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ '&:hover': { transform: 'none' } }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Energy & Stress</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={moodChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" stroke="#7d8590" fontSize={12} />
                  <YAxis stroke="#7d8590" fontSize={12} domain={[0, 5]} />
                  <Tooltip contentStyle={{ backgroundColor: '#121821', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
                  <Line type="monotone" dataKey="energy" stroke="#4CAF50" strokeWidth={2} dot={{ r: 2 }} name="Energy" />
                  <Line type="monotone" dataKey="stress" stroke="#F44336" strokeWidth={2} dot={{ r: 2 }} name="Stress" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Sleep vs Mood Correlation */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ '&:hover': { transform: 'none' } }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Sleep vs Mood</Typography>
              {correlationData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="sleep" name="Sleep (hrs)" stroke="#7d8590" fontSize={12} />
                    <YAxis dataKey="mood" name="Mood" stroke="#7d8590" fontSize={12} domain={[0, 5]} />
                    <ZAxis range={[40, 40]} />
                    <Tooltip contentStyle={{ backgroundColor: '#121821', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
                    <Scatter data={correlationData} fill="#5B8DEF" />
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <Typography color="text.secondary">Not enough data for correlation</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Journal Entry Dialog */}
      <Dialog open={!!selectedLog} onClose={() => setSelectedLog(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3 } }}>
        {selectedLog && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {formatDate(selectedLog.date)}
              <IconButton onClick={() => setSelectedLog(null)}><Close /></IconButton>
            </DialogTitle>
            <DialogContent>
              {selectedLog.mood && (
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  <Typography variant="body2">Mood: <strong>{selectedLog.mood}/5</strong></Typography>
                  {selectedLog.energy && <Typography variant="body2">Energy: <strong>{selectedLog.energy}/5</strong></Typography>}
                  {selectedLog.stress && <Typography variant="body2">Stress: <strong>{selectedLog.stress}/5</strong></Typography>}
                </Stack>
              )}
              {selectedLog.journal ? (
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{selectedLog.journal}</Typography>
              ) : (
                <Typography color="text.secondary">No journal entry for this day.</Typography>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default JournalPage;
