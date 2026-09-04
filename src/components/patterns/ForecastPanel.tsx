import React, { useState } from 'react';
import { Card, CardContent, Typography, Box, Chip, Tooltip, Stack, Collapse, IconButton } from '@mui/material';
import { TrendingUp, ExpandMore, ExpandLess } from '@mui/icons-material';
import { useForecast, Prediction } from '../../hooks/useForecast';

const BAND_COLOR: Record<string, string> = {
  green: '#4CAF50', yellow: '#FFB74D', red: '#E57373',
  likely: '#4CAF50', maybe: '#FFB74D', unlikely: '#90A4AE',
  high: '#4CAF50', mid: '#5B8DEF', low: '#E57373',
  on_track: '#4CAF50',
};

const metricLabel: Record<string, string> = {
  recovery_band: 'Recovery',
  sleep_hours: 'Sleep',
  train_day: 'Training',
  spend_month: 'Spending',
};

// Human-readable "what the model learned" from a prediction's basis. This is the
// 'why' behind each forecast — the data-driven correlations the engine found.
function whyLines(p: Prediction): string[] {
  const b = p.basis || {};
  const out: string[] = [];
  if (b.dow && b.dow_avg != null) out.push(`${b.dow} baseline: ${b.dow_avg}h`);
  if (b.dow && b.dow_rate != null) out.push(`${b.dow} train rate: ${Math.round(b.dow_rate * 100)}%`);
  if (b.learned_signals && typeof b.learned_signals === 'object') {
    for (const [sig, delta] of Object.entries(b.learned_signals)) {
      const d = delta as number;
      out.push(`${sig}: ${d > 0 ? '+' : ''}${d}h (learned)`);
    }
  }
  if (b.debt7 != null && b.debt7 >= 3) out.push(`sleep debt: ${b.debt7}h over 7 nights`);
  if (b.typical != null && b.projected != null) out.push(`on pace $${b.projected?.toLocaleString?.() ?? b.projected} vs typical $${b.typical?.toLocaleString?.() ?? b.typical}`);
  if (b.expected_min != null && b.expected_min > 0) out.push(`typical ~${b.expected_min} min`);
  return out;
}

// Tomorrow's forecasts + the engine's own track record + WHY (learned
// correlations). The self-scoring is what makes it trustworthy; the 'why' shows
// the data-driven reasoning behind each call.
const ForecastPanel: React.FC = () => {
  const { tomorrow, accuracy, loading } = useForecast();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (loading || tomorrow.length === 0) return null;

  return (
    <Card sx={{ mb: 2.5, '&:hover': { transform: 'none' }, borderLeft: '3px solid #26C6DA' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
          <TrendingUp sx={{ fontSize: 18, color: '#26C6DA' }} />
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>
            Tomorrow's forecast
          </Typography>
        </Box>

        <Stack spacing={1.5}>
          {tomorrow.map((p) => {
            const color = p.band && BAND_COLOR[p.band] ? BAND_COLOR[p.band] : '#5B8DEF';
            const acc = accuracy.find((a) => a.metric === p.metric);
            const why = whyLines(p);
            const isOpen = expanded === p.id;
            return (
              <Box key={p.id} sx={{ p: 1.25, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="caption" color="text.secondary">{metricLabel[p.metric] ?? p.metric}</Typography>
                      {p.confidence != null && (
                        <Typography variant="caption" color="text.secondary">· {Math.round(p.confidence * 100)}% conf</Typography>
                      )}
                    </Box>
                    <Typography variant="h6" fontWeight={700} sx={{ color, textTransform: 'capitalize', lineHeight: 1.2 }}>
                      {p.predicted}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                      {p.rationale}
                    </Typography>
                    {acc && acc.scored > 0 && (
                      <Tooltip title={`Scored against reality on ${acc.scored} past forecasts`}>
                        <Chip
                          size="small"
                          label={`track record: ${acc.hit_rate_pct}% (${acc.hits}/${acc.scored})`}
                          sx={{ mt: 0.75, height: 18, fontSize: '0.6rem', bgcolor: 'rgba(38,198,218,0.15)', color: '#26C6DA' }}
                        />
                      </Tooltip>
                    )}
                  </Box>
                  {why.length > 0 && (
                    <IconButton size="small" onClick={() => setExpanded(isOpen ? null : p.id)} sx={{ color: 'text.secondary' }}>
                      {isOpen ? <ExpandLess sx={{ fontSize: 18 }} /> : <ExpandMore sx={{ fontSize: 18 }} />}
                    </IconButton>
                  )}
                </Box>
                <Collapse in={isOpen}>
                  <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontStyle: 'italic' }}>
                      What the model learned from your data:
                    </Typography>
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                      {why.map((w, i) => (
                        <Chip key={i} size="small" label={w} sx={{ height: 20, fontSize: '0.62rem', bgcolor: 'rgba(91,141,239,0.12)' }} />
                      ))}
                    </Stack>
                  </Box>
                </Collapse>
              </Box>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default ForecastPanel;
