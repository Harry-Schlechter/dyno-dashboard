import React from 'react';
import { Card, CardContent, Typography, Box, Chip, Tooltip, LinearProgress } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { useRecovery } from '../../hooks/useRecovery';

// Whoop-style recovery ring: a single 0-100 score with band color, the top
// drivers that moved it, and a confidence badge so a thin-data day reads honestly.

const Ring: React.FC<{ score: number; color: string }> = ({ score, color }) => {
  const size = 132;
  const stroke = 11;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  return (
    <Box sx={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h3" fontWeight={800} sx={{ color, lineHeight: 1 }}>{score}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 1 }}>RECOVERY</Typography>
      </Box>
    </Box>
  );
};

const RecoveryRing: React.FC = () => {
  const { latest, trend, color, loading } = useRecovery('30d');

  if (loading) return null;
  if (!latest || latest.score == null) {
    return (
      <Card>
        <CardContent>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>Recovery</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            No score yet — wear the watch to bed (HRV + sleep) and it'll compute overnight.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const drivers = (latest.drivers ?? []).slice(0, 3);
  const bandLabel = latest.band === 'green' ? 'Recovered' : latest.band === 'yellow' ? 'Moderate' : 'Strained';

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>Recovery</Typography>
          {latest.confidence !== 'high' && (
            <Tooltip title="Score confidence is limited by missing overnight data. Wear the watch nightly to sharpen it.">
              <Chip size="small" label={`${latest.confidence} confidence`} sx={{ height: 18, fontSize: '0.6rem' }} />
            </Tooltip>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <Ring score={latest.score} color={color} />

          <Box sx={{ flex: 1, minWidth: 180 }}>
            <Chip
              size="small" label={bandLabel}
              sx={{ mb: 1, fontWeight: 700, bgcolor: `${color}22`, color }}
            />
            {drivers.map((d) => {
              const good = d.contribution > 0;
              return (
                <Box key={d.name} sx={{ mb: 0.75 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {good ? <TrendingUp sx={{ fontSize: 14, color: '#4CAF50' }} /> : <TrendingDown sx={{ fontSize: 14, color: '#FF9800' }} />}
                    <Typography variant="caption" fontWeight={600}>{d.name}</Typography>
                    <Typography variant="caption" color="text.secondary">— {d.note}</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, Math.abs(d.contribution) * 40)}
                    sx={{
                      height: 3, borderRadius: 2, mt: 0.25,
                      bgcolor: 'rgba(255,255,255,0.06)',
                      '& .MuiLinearProgress-bar': { bgcolor: good ? '#4CAF50' : '#FF9800' },
                    }}
                  />
                </Box>
              );
            })}
          </Box>

          {trend.length > 3 && (
            <Box sx={{ width: 90, height: 60 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <YAxis hide domain={[0, 100]} />
                  <Line type="monotone" dataKey="score" stroke={color} strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          )}
        </Box>

        {latest.flags && latest.flags.length > 0 && (
          <Box sx={{ mt: 1.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {latest.flags.map((f) => (
              <Chip key={f} size="small" label={f.replace(/_/g, ' ')} sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'rgba(229,115,115,0.15)', color: '#E57373' }} />
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default RecoveryRing;
