import React, { useMemo, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, IconButton, Stack,
  Collapse, Tooltip, Skeleton,
} from '@mui/material';
import {
  ThumbUpOutlined, ThumbDownOutlined, CloseOutlined,
  StarBorderOutlined, StarRounded, AutoAwesomeRounded,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import {
  useObservations, Observation, ObservationKind, ObservationSeverity,
  FeedbackReaction,
} from '../../hooks/useObservations';

const KIND_META: Record<ObservationKind, { label: string; color: string; emoji: string }> = {
  insight:        { label: 'Insight',        color: '#5B8DEF', emoji: '✨' },
  pattern:        { label: 'Pattern',        color: '#9C7BFF', emoji: '🔁' },
  anomaly:        { label: 'Anomaly',        color: '#FF9800', emoji: '⚡' },
  recommendation: { label: 'Suggested',      color: '#4CAF50', emoji: '💡' },
  milestone:      { label: 'Milestone',      color: '#FFD54F', emoji: '🏆' },
  warning:        { label: 'Heads up',       color: '#F44336', emoji: '⚠️' },
  forecast:       { label: 'Forecast',       color: '#26C6DA', emoji: '📈' },
};

const AGENT_META: Record<string, { label: string; color: string }> = {
  trainer:           { label: 'Trainer',          color: '#4CAF50' },
  nutritionist:      { label: 'Nutritionist',     color: '#FF9800' },
  'mental-health':   { label: 'Mental Health',    color: '#9C7BFF' },
  'financial-advisor': { label: 'Finance',        color: '#26C6DA' },
  'personal-assistant': { label: 'Assistant',     color: '#5B8DEF' },
  maintenance:       { label: 'Maintenance',      color: '#7d8590' },
  'travel-agent':    { label: 'Travel',           color: '#26A69A' },
  'wedding-planner': { label: 'Wedding',          color: '#EC407A' },
  'career-coach':    { label: 'Career',           color: '#FFCA28' },
  builder:           { label: 'Builder',          color: '#90A4AE' },
};

const severityBorder = (sev: ObservationSeverity, kindColor: string) => {
  if (sev === 'high')   return '#F44336';
  if (sev === 'medium') return '#FF9800';
  return kindColor;
};

interface CardProps {
  obs: Observation;
  onReact: (id: string, reaction: FeedbackReaction) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
}

const InsightCard: React.FC<CardProps> = ({ obs, onReact, onDismiss }) => {
  const [expanded, setExpanded] = useState(false);
  const [starred, setStarred] = useState(false);
  const [reacted, setReacted] = useState<FeedbackReaction | null>(null);
  const meta = KIND_META[obs.kind];
  const agentMeta = AGENT_META[obs.agent_id] ?? { label: obs.agent_id, color: '#7d8590' };
  const borderColor = severityBorder(obs.severity, meta.color);

  const handleReact = async (reaction: FeedbackReaction) => {
    if (reacted) return;
    setReacted(reaction);
    try { await onReact(obs.id, reaction); } catch { setReacted(null); }
  };

  const handleStar = async () => {
    setStarred(true);
    try { await onReact(obs.id, 'starred'); } catch { setStarred(false); }
  };

  return (
    <Card
      sx={{
        '&:hover': { transform: 'none' },
        borderLeft: `3px solid ${borderColor}`,
        bgcolor: 'rgba(18,24,33,0.85)',
        cursor: obs.body ? 'pointer' : 'default',
      }}
      onClick={() => obs.body && setExpanded(e => !e)}
    >
      <CardContent sx={{ pb: '12px !important', pt: 1.5, px: { xs: 1.5, sm: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={0.75} sx={{ mb: 0.5, flexWrap: 'wrap', rowGap: 0.5 }}>
              <Chip
                size="small"
                label={`${meta.emoji} ${meta.label}`}
                sx={{
                  height: 20, fontSize: '0.65rem', fontWeight: 600,
                  bgcolor: `${meta.color}22`, color: meta.color,
                  border: `1px solid ${meta.color}44`,
                }}
              />
              <Chip
                size="small"
                label={agentMeta.label}
                sx={{
                  height: 20, fontSize: '0.65rem',
                  bgcolor: `${agentMeta.color}1a`, color: agentMeta.color,
                }}
              />
            </Stack>
            <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.3 }}>
              {obs.title}
            </Typography>
            <Collapse in={expanded} timeout="auto">
              {obs.body && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1, fontSize: '0.85rem', lineHeight: 1.5 }}
                >
                  {obs.body}
                </Typography>
              )}
            </Collapse>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75, fontSize: '0.7rem' }}>
              {formatDistanceToNow(new Date(obs.created_at), { addSuffix: true })}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.25} onClick={e => e.stopPropagation()}>
            <Tooltip title={starred ? 'Saved' : 'Save'}>
              <IconButton size="small" onClick={handleStar} sx={{ p: 0.5 }}>
                {starred
                  ? <StarRounded sx={{ fontSize: 18, color: '#FFD54F' }} />
                  : <StarBorderOutlined sx={{ fontSize: 18 }} />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Useful">
              <IconButton size="small" onClick={() => handleReact('useful')} sx={{ p: 0.5 }} disabled={!!reacted}>
                <ThumbUpOutlined sx={{ fontSize: 16, color: reacted === 'useful' ? '#4CAF50' : 'inherit' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Not useful">
              <IconButton size="small" onClick={() => handleReact('not_useful')} sx={{ p: 0.5 }} disabled={!!reacted}>
                <ThumbDownOutlined sx={{ fontSize: 16, color: reacted === 'not_useful' ? '#F44336' : 'inherit' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Dismiss">
              <IconButton size="small" onClick={() => onDismiss(obs.id)} sx={{ p: 0.5 }}>
                <CloseOutlined sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
};

interface FeedProps {
  agentId?: string;
  kinds?: ObservationKind[];
  limit?: number;
  title?: string;
  emptyMessage?: string;
  hideHeader?: boolean;
}

const InsightsFeed: React.FC<FeedProps> = ({
  agentId,
  kinds,
  limit = 8,
  title = 'Insights',
  emptyMessage = "Nothing notable yet — Dyno's still watching.",
  hideHeader = false,
}) => {
  const { data, loading, react, dismiss } = useObservations({ agentId, kinds, limit });

  const sorted = useMemo(() => {
    const sevOrder: Record<ObservationSeverity, number> = { high: 0, medium: 1, low: 2, info: 3 };
    return [...data].sort((a, b) => {
      const s = sevOrder[a.severity] - sevOrder[b.severity];
      if (s !== 0) return s;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [data]);

  return (
    <Box>
      {!hideHeader && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <AutoAwesomeRounded sx={{ fontSize: 18, color: '#5B8DEF' }} />
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>
            {title}
          </Typography>
          {sorted.length > 0 && (
            <Chip
              size="small"
              label={sorted.length}
              sx={{ height: 18, fontSize: '0.65rem', ml: 'auto' }}
            />
          )}
        </Box>
      )}

      {loading ? (
        <Stack spacing={1}>
          <Skeleton variant="rounded" height={72} />
          <Skeleton variant="rounded" height={72} />
        </Stack>
      ) : sorted.length === 0 ? (
        <Card sx={{ '&:hover': { transform: 'none' }, py: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">{emptyMessage}</Typography>
        </Card>
      ) : (
        <Stack spacing={1}>
          {sorted.map(obs => (
            <InsightCard key={obs.id} obs={obs} onReact={react} onDismiss={dismiss} />
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default InsightsFeed;
