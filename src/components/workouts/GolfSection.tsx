import React, { useMemo, useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Stack, Chip, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip as MuiTooltip,
  Dialog, DialogContent, IconButton,
} from '@mui/material';
import { GolfCourse, Close } from '@mui/icons-material';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
  BarChart, Bar, Cell,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { useGolfRounds, GolfRound, GolfHoleDetail } from '../../hooks/useGolfRounds';
import { formatDateShort } from '../../lib/formatters';

const GOLF_GREEN = '#43A047';
const GOLF_AMBER = '#FFB74D';
const GOLF_RED = '#EF5350';

const isRound = (r: GolfRound) => r.round_type === 'round' && r.total_score != null;

const Stat: React.FC<{ label: string; value: string; sub?: string }> = ({ label, value, sub }) => (
  <Box>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{label}</Typography>
    <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>{value}</Typography>
    {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
  </Box>
);

const scoreColor = (diff: number) => {
  if (diff <= -1) return GOLF_GREEN;
  if (diff <= 1) return '#90CAF9';
  if (diff <= 3) return GOLF_AMBER;
  return GOLF_RED;
};

const ScorecardImage: React.FC<{ url: string; course: string }> = ({ url, course }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Avatar
        src={url}
        alt={course}
        variant="rounded"
        sx={{ width: 32, height: 32, cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
        onClick={() => setOpen(true)}
      />
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogContent sx={{ p: 0, position: 'relative', bgcolor: 'background.default' }}>
          <IconButton
            onClick={() => setOpen(false)}
            sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0,0,0,0.5)' }}
          >
            <Close />
          </IconButton>
          <Box component="img" src={url} alt={course} sx={{ width: '100%', display: 'block' }} />
        </DialogContent>
      </Dialog>
    </>
  );
};

const GolfSection: React.FC = () => {
  const { rounds, loading } = useGolfRounds();

  const data = useMemo(() => {
    const fullRounds = rounds.filter(isRound);
    const practice = rounds.filter(r => !isRound(r));

    // Score trend (last 12 rounds, oldest → newest for the line chart)
    const trend = [...fullRounds]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-12)
      .map(r => ({
        date: r.date,
        label: format(parseISO(r.date), 'MMM d'),
        score: r.total_score!,
        par: r.total_par ?? (r.holes === 9 ? 36 : 72),
        diff: (r.total_score ?? 0) - (r.total_par ?? (r.holes === 9 ? 36 : 72)),
        course: r.course_name,
      }));

    // Aggregate stats across all rounds
    const totalRounds = fullRounds.length;
    const avgScore = totalRounds
      ? fullRounds.reduce((s, r) => s + (r.total_score ?? 0), 0) / totalRounds
      : null;
    const avgDiff = totalRounds
      ? fullRounds.reduce((s, r) => s + ((r.total_score ?? 0) - (r.total_par ?? 72)), 0) / totalRounds
      : null;
    const bestRound = fullRounds.reduce<GolfRound | null>((best, r) => {
      if (!best) return r;
      const bd = (best.total_score ?? 999) - (best.total_par ?? 72);
      const rd = (r.total_score ?? 999) - (r.total_par ?? 72);
      return rd < bd ? r : best;
    }, null);

    const withPutts = fullRounds.filter(r => r.putts != null);
    const avgPutts = withPutts.length
      ? withPutts.reduce((s, r) => s + (r.putts ?? 0), 0) / withPutts.length
      : null;

    const withFir = fullRounds.filter(r => r.fairways_hit != null && r.fairways_total);
    const firPct = withFir.length
      ? (withFir.reduce((s, r) => s + (r.fairways_hit! / r.fairways_total!), 0) / withFir.length) * 100
      : null;

    const withGir = fullRounds.filter(r => r.greens_in_reg != null && r.holes);
    const girPct = withGir.length
      ? (withGir.reduce((s, r) => s + (r.greens_in_reg! / r.holes!), 0) / withGir.length) * 100
      : null;

    // "Trouble holes" — across all scorecards with per-hole detail, average score-vs-par per hole number
    const holeBuckets = new Map<number, { totalDiff: number; count: number; pars: number[] }>();
    for (const r of fullRounds) {
      if (!r.scorecard_data) continue;
      for (const h of r.scorecard_data) {
        const cur = holeBuckets.get(h.hole) ?? { totalDiff: 0, count: 0, pars: [] };
        cur.totalDiff += h.score - h.par;
        cur.count += 1;
        cur.pars.push(h.par);
        holeBuckets.set(h.hole, cur);
      }
    }
    const holePerformance = [...holeBuckets.entries()]
      .map(([hole, b]) => ({
        hole,
        avgDiff: b.totalDiff / b.count,
        rounds: b.count,
        par: Math.round(b.pars.reduce((s, p) => s + p, 0) / b.pars.length),
      }))
      .sort((a, b) => a.hole - b.hole);

    // Practice session counts (last 30/90/365)
    const today = new Date();
    const cutoff = (days: number) => format(new Date(today.getTime() - (days - 1) * 86400_000), 'yyyy-MM-dd');
    const practiceCount = (days: number) => practice.filter(p => p.date >= cutoff(days)).length;

    // Round history (most recent 12)
    const history = fullRounds.slice(0, 12);

    return {
      totalRounds, avgScore, avgDiff, bestRound, avgPutts, firPct, girPct,
      trend, history, holePerformance,
      practiceLast30: practiceCount(30),
      practiceLast90: practiceCount(90),
      practiceLastYear: practiceCount(365),
    };
  }, [rounds]);

  if (loading) return null;

  if (rounds.length === 0) {
    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5, display: 'block', mb: 1 }}>
          Golf
        </Typography>
        <Card sx={{ '&:hover': { transform: 'none' } }}>
          <CardContent>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <GolfCourse sx={{ color: GOLF_GREEN }} />
              <Box>
                <Typography variant="body2" fontWeight={600}>No rounds logged yet</Typography>
                <Typography variant="caption" color="text.secondary">
                  Tell the trainer agent about your next range session or round.
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5, display: 'block', mb: 1 }}>
        Golf
      </Typography>

      {/* Top stat row */}
      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ '&:hover': { transform: 'none' }, height: '100%' }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <GolfCourse sx={{ color: GOLF_GREEN }} />
                <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2 }}>Rounds played</Typography>
              </Stack>
              <Typography variant="h3" fontWeight={700} sx={{ color: GOLF_GREEN, lineHeight: 1 }}>
                {data.totalRounds}
              </Typography>
              <Typography variant="caption" color="text.secondary">all time</Typography>
              <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
                  <Stat label="Practice 30d" value={`${data.practiceLast30}`} />
                  <Stat label="Practice 90d" value={`${data.practiceLast90}`} />
                  <Stat label="Practice yr"  value={`${data.practiceLastYear}`} />
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ '&:hover': { transform: 'none' }, height: '100%' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2 }}>Avg score</Typography>
              <Typography variant="h3" fontWeight={700} sx={{ lineHeight: 1, mt: 0.5 }}>
                {data.avgScore != null ? data.avgScore.toFixed(1) : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {data.avgDiff != null
                  ? `${data.avgDiff >= 0 ? '+' : ''}${data.avgDiff.toFixed(1)} vs par`
                  : 'no data'}
              </Typography>
              {data.bestRound && (
                <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Best round</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {data.bestRound.total_score} at {data.bestRound.course_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDateShort(data.bestRound.date)} · {(data.bestRound.total_score! - (data.bestRound.total_par ?? 72)) >= 0 ? '+' : ''}{data.bestRound.total_score! - (data.bestRound.total_par ?? 72)}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ '&:hover': { transform: 'none' }, height: '100%' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2 }}>Putts / round</Typography>
              <Typography variant="h3" fontWeight={700} sx={{ lineHeight: 1, mt: 0.5 }}>
                {data.avgPutts != null ? data.avgPutts.toFixed(1) : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">avg</Typography>
              <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  Tour avg: ~29 / Recreational: ~32–36
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ '&:hover': { transform: 'none' }, height: '100%' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2 }}>Accuracy</Typography>
              <Stack spacing={1} sx={{ mt: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">FIR (fairways)</Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {data.firPct != null ? `${data.firPct.toFixed(0)}%` : '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">GIR (greens in reg)</Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {data.girPct != null ? `${data.girPct.toFixed(0)}%` : '—'}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        {/* Score trend chart */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ '&:hover': { transform: 'none' } }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
                <Typography variant="h6">Score trend (last 12 rounds)</Typography>
                <Typography variant="caption" color="text.secondary">
                  Lower is better
                </Typography>
              </Box>
              {data.trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={data.trend} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.6)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.6)' }} domain={['dataMin - 2', 'dataMax + 2']} />
                    <Tooltip
                      contentStyle={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                      formatter={(value: any, name: string, props: any) => {
                        if (name === 'score') {
                          return [`${value} (${props.payload.diff >= 0 ? '+' : ''}${props.payload.diff})`, props.payload.course];
                        }
                        return [value, name];
                      }}
                    />
                    <Line type="monotone" dataKey="score" stroke={GOLF_GREEN} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  Log a round to see your trend.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Trouble holes */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ '&:hover': { transform: 'none' }, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>Avg score vs par by hole</Typography>
              {data.holePerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.holePerformance} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="hole" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.6)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.6)' }} />
                    <Tooltip
                      contentStyle={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                      formatter={(value: any, _name: string, props: any) => [
                        `${(value as number).toFixed(2)} (${props.payload.rounds} rounds)`,
                        `Hole ${props.payload.hole} · par ${props.payload.par}`,
                      ]}
                    />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.3)" />
                    <Bar dataKey="avgDiff">
                      {data.holePerformance.map((h, i) => (
                        <Cell key={i} fill={scoreColor(h.avgDiff)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  Upload a scorecard image to see hole-by-hole patterns.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Round history table */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ '&:hover': { transform: 'none' } }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>Round history</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Course</TableCell>
                      <TableCell align="right">Holes</TableCell>
                      <TableCell align="right">Score</TableCell>
                      <TableCell align="right">vs Par</TableCell>
                      <TableCell align="right">Putts</TableCell>
                      <TableCell align="right">FIR</TableCell>
                      <TableCell align="right">GIR</TableCell>
                      <TableCell align="center">Card</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.history.map((r) => {
                      const par = r.total_par ?? (r.holes === 9 ? 36 : 72);
                      const diff = (r.total_score ?? 0) - par;
                      return (
                        <TableRow key={r.id}>
                          <TableCell>{formatDateShort(r.date)}</TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight={500}>{r.course_name}</Typography>
                              {r.course_location && (
                                <Typography variant="caption" color="text.secondary">{r.course_location}</Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell align="right">{r.holes ?? '—'}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>{r.total_score}</TableCell>
                          <TableCell align="right">
                            <Chip
                              size="small"
                              label={`${diff >= 0 ? '+' : ''}${diff}`}
                              sx={{ bgcolor: scoreColor(diff), color: '#000', fontWeight: 600, minWidth: 48 }}
                            />
                          </TableCell>
                          <TableCell align="right">{r.putts ?? '—'}</TableCell>
                          <TableCell align="right">
                            {r.fairways_hit != null && r.fairways_total
                              ? `${r.fairways_hit}/${r.fairways_total}`
                              : '—'}
                          </TableCell>
                          <TableCell align="right">
                            {r.greens_in_reg != null && r.holes
                              ? `${r.greens_in_reg}/${r.holes}`
                              : '—'}
                          </TableCell>
                          <TableCell align="center">
                            {r.scorecard_url
                              ? <ScorecardImage url={r.scorecard_url} course={r.course_name} />
                              : <Typography variant="caption" color="text.secondary">—</Typography>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default GolfSection;
