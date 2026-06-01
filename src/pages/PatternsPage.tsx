import React, { useMemo, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, Stack, ToggleButton, ToggleButtonGroup,
  IconButton, Tooltip, Collapse, Divider, Skeleton, Alert,
} from '@mui/material';
import {
  AutoAwesomeRounded, ExpandMore, ExpandLess, ThumbUpOutlined, ThumbDownOutlined,
  CloseOutlined, StarBorderOutlined, StarRounded, InfoOutlined,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { useObservations, Observation, ObservationKind, ObservationSeverity, FeedbackReaction } from '../hooks/useObservations';

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

type SourceFilter = 'all' | 'analyst' | 'agents';
type ScopeFilter = 'all' | 'cross_domain' | 'single_domain';

const severityColor = (sev: ObservationSeverity, kindColor: string) =>
  sev === 'high' ? '#F44336' : sev === 'medium' ? '#FF9800' : kindColor;

const confidenceLabel = (data: any): { label: string; color: string } | null => {
  const c = data?.confidence;
  if (!c) return null;
  if (c === 'high')   return { label: 'high confidence',   color: '#4CAF50' };
  if (c === 'medium') return { label: 'medium confidence', color: '#5B8DEF' };
  if (c === 'low')    return { label: 'early signal',      color: '#FF9800' };
  return { label: String(c), color: '#7d8590' };
};

interface CardProps {
  obs: Observation;
  onReact: (id: string, reaction: FeedbackReaction) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
}

const PatternCard: React.FC<CardProps> = ({ obs, onReact, onDismiss }) => {
  const [expanded, setExpanded] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [starred, setStarred] = useState(false);
  const [reacted, setReacted] = useState<FeedbackReaction | null>(null);

  const meta = KIND_META[obs.kind];
  const agentMeta = AGENT_META[obs.agent_id] ?? { label: obs.agent_id, color: '#7d8590' };
  const borderColor = severityColor(obs.severity, meta.color);
  const conf = confidenceLabel(obs.data);
  const isCrossDomain = (obs.related_agents?.length ?? 0) > 0;
  const window = obs.data?.window_days;
  const evidence = obs.data?.evidence;

  const handleReact = async (e: React.MouseEvent, reaction: FeedbackReaction) => {
    e.stopPropagation();
    if (reacted) return;
    setReacted(reaction);
    try { await onReact(obs.id, reaction); } catch { setReacted(null); }
  };

  const handleStar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setStarred(true);
    try { await onReact(obs.id, 'starred'); } catch { setStarred(false); }
  };

  return (
    <Card
      sx={{
        '&:hover': { transform: 'none' },
        borderLeft: `3px solid ${borderColor}`,
        cursor: 'pointer',
      }}
      onClick={() => setExpanded(e => !e)}
    >
      <CardContent sx={{ pb: '14px !important', pt: 1.75, px: { xs: 1.75, sm: 2.25 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={0.75} sx={{ mb: 0.75, flexWrap: 'wrap', rowGap: 0.5 }}>
              <Chip size="small" label={`${meta.emoji} ${meta.label}`}
                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600,
                      bgcolor: `${meta.color}22`, color: meta.color, border: `1px solid ${meta.color}44` }} />
              <Chip size="small" label={agentMeta.label}
                sx={{ height: 20, fontSize: '0.65rem', bgcolor: `${agentMeta.color}1a`, color: agentMeta.color }} />
              {obs.related_agents?.map(ra => {
                const m = AGENT_META[ra] ?? { label: ra, color: '#7d8590' };
                return (
                  <Chip key={ra} size="small" label={`+${m.label}`}
                    sx={{ height: 20, fontSize: '0.6rem', bgcolor: `${m.color}10`, color: m.color, opacity: 0.85 }} />
                );
              })}
              {obs.source === 'cron' && (
                <Chip size="small" label="analyst"
                  sx={{ height: 20, fontSize: '0.6rem', bgcolor: 'rgba(91,141,239,0.15)', color: '#5B8DEF', fontWeight: 600 }} />
              )}
              {conf && (
                <Chip size="small" label={conf.label}
                  sx={{ height: 20, fontSize: '0.6rem', bgcolor: `${conf.color}15`, color: conf.color }} />
              )}
            </Stack>

            <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.35 }}>
              {obs.title}
            </Typography>

            <Collapse in={expanded} timeout="auto">
              {obs.body && (
                <Typography variant="body2" color="text.secondary"
                  sx={{ mt: 1, fontSize: '0.86rem', lineHeight: 1.55 }}>
                  {obs.body}
                </Typography>
              )}

              {evidence && (
                <Box sx={{ mt: 1.25 }}>
                  <Box
                    onClick={e => { e.stopPropagation(); setShowEvidence(s => !s); }}
                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, cursor: 'pointer',
                          color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
                  >
                    <InfoOutlined sx={{ fontSize: 12 }} />
                    <Typography variant="caption">
                      {showEvidence ? 'Hide evidence' : 'Show evidence'}
                    </Typography>
                  </Box>
                  <Collapse in={showEvidence}>
                    <Box sx={{ mt: 0.75, p: 1.25, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.03)',
                               border: '1px solid rgba(255,255,255,0.05)', fontFamily: 'ui-monospace, monospace',
                               fontSize: '0.72rem', overflowX: 'auto' }}>
                      <pre style={{ margin: 0, color: '#9aa4b2' }}>
                        {JSON.stringify(evidence, null, 2)}
                      </pre>
                    </Box>
                  </Collapse>
                </Box>
              )}
            </Collapse>

            <Stack direction="row" spacing={1.5} sx={{ mt: 0.75 }} alignItems="center">
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                {formatDistanceToNow(new Date(obs.created_at), { addSuffix: true })}
              </Typography>
              {window && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  · {window}d window
                </Typography>
              )}
              {isCrossDomain && (
                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: '#9C7BFF' }}>
                  · cross-domain
                </Typography>
              )}
            </Stack>
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
              <IconButton size="small" onClick={e => handleReact(e, 'useful')} sx={{ p: 0.5 }} disabled={!!reacted}>
                <ThumbUpOutlined sx={{ fontSize: 16, color: reacted === 'useful' ? '#4CAF50' : 'inherit' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Not useful">
              <IconButton size="small" onClick={e => handleReact(e, 'not_useful')} sx={{ p: 0.5 }} disabled={!!reacted}>
                <ThumbDownOutlined sx={{ fontSize: 16, color: reacted === 'not_useful' ? '#F44336' : 'inherit' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Dismiss">
              <IconButton size="small" onClick={e => { e.stopPropagation(); onDismiss(obs.id); }} sx={{ p: 0.5 }}>
                <CloseOutlined sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
};

const PatternsPage: React.FC = () => {
  const [source, setSource] = useState<SourceFilter>('all');
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [agentFilter, setAgentFilter] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<ObservationKind | null>(null);

  const { data, loading, react, dismiss, error } = useObservations({ limit: 200 });

  const filtered = useMemo(() => {
    return data.filter(o => {
      if (source === 'analyst' && o.source !== 'cron') return false;
      if (source === 'agents' && o.source !== 'agent') return false;
      if (scope === 'cross_domain' && (o.related_agents?.length ?? 0) === 0) return false;
      if (scope === 'single_domain' && (o.related_agents?.length ?? 0) > 0) return false;
      if (agentFilter && o.agent_id !== agentFilter) return false;
      if (kindFilter && o.kind !== kindFilter) return false;
      return true;
    });
  }, [data, source, scope, agentFilter, kindFilter]);

  const sorted = useMemo(() => {
    const sevOrder: Record<ObservationSeverity, number> = { high: 0, medium: 1, low: 2, info: 3 };
    return [...filtered].sort((a, b) => {
      const s = sevOrder[a.severity] - sevOrder[b.severity];
      if (s !== 0) return s;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [filtered]);

  // Counts for filter chips
  const counts = useMemo(() => {
    const c = { analyst: 0, agents: 0, crossDomain: 0 };
    for (const o of data) {
      if (o.source === 'cron') c.analyst++;
      else if (o.source === 'agent') c.agents++;
      if ((o.related_agents?.length ?? 0) > 0) c.crossDomain++;
    }
    return c;
  }, [data]);

  const agentsInUse = useMemo(() => {
    const s = new Set<string>();
    data.forEach(o => s.add(o.agent_id));
    return [...s];
  }, [data]);

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesomeRounded sx={{ fontSize: 24, color: '#5B8DEF' }} />
            <Typography variant="h4" fontWeight={700}>Patterns</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Cross-domain observations from your agents + the weekly analyst pass.
            Click a card for evidence and context.
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      {/* Filters */}
      <Card sx={{ '&:hover': { transform: 'none' }, mb: 2.5 }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'flex-start', md: 'center' }} flexWrap="wrap">
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontSize: '0.65rem', letterSpacing: 0.5 }}>SOURCE</Typography>
              <ToggleButtonGroup size="small" exclusive value={source} onChange={(_, v) => v && setSource(v)}>
                <ToggleButton value="all" sx={{ textTransform: 'none', px: 1.25, py: 0.25 }}>All ({data.length})</ToggleButton>
                <ToggleButton value="analyst" sx={{ textTransform: 'none', px: 1.25, py: 0.25 }}>Analyst ({counts.analyst})</ToggleButton>
                <ToggleButton value="agents" sx={{ textTransform: 'none', px: 1.25, py: 0.25 }}>Agents ({counts.agents})</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontSize: '0.65rem', letterSpacing: 0.5 }}>SCOPE</Typography>
              <ToggleButtonGroup size="small" exclusive value={scope} onChange={(_, v) => v && setScope(v)}>
                <ToggleButton value="all" sx={{ textTransform: 'none', px: 1.25, py: 0.25 }}>All</ToggleButton>
                <ToggleButton value="cross_domain" sx={{ textTransform: 'none', px: 1.25, py: 0.25 }}>Cross-domain ({counts.crossDomain})</ToggleButton>
                <ToggleButton value="single_domain" sx={{ textTransform: 'none', px: 1.25, py: 0.25 }}>Single</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {agentsInUse.length > 1 && (
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontSize: '0.65rem', letterSpacing: 0.5 }}>AGENT</Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  <Chip size="small" label="All"
                    onClick={() => setAgentFilter(null)}
                    sx={{ cursor: 'pointer', height: 24,
                          bgcolor: agentFilter === null ? 'rgba(91,141,239,0.2)' : 'rgba(255,255,255,0.04)',
                          color: agentFilter === null ? '#5B8DEF' : 'text.primary' }} />
                  {agentsInUse.map(a => {
                    const m = AGENT_META[a] ?? { label: a, color: '#7d8590' };
                    const active = agentFilter === a;
                    return (
                      <Chip key={a} size="small" label={m.label}
                        onClick={() => setAgentFilter(active ? null : a)}
                        sx={{ cursor: 'pointer', height: 24,
                              bgcolor: active ? `${m.color}33` : `${m.color}10`,
                              color: m.color, border: active ? `1px solid ${m.color}` : 'none' }} />
                    );
                  })}
                </Stack>
              </Box>
            )}
          </Stack>

          <Divider sx={{ my: 1.5, opacity: 0.4 }} />
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            <Chip size="small" label="All kinds" onClick={() => setKindFilter(null)}
              sx={{ cursor: 'pointer', height: 22,
                    bgcolor: kindFilter === null ? 'rgba(91,141,239,0.2)' : 'rgba(255,255,255,0.04)',
                    color: kindFilter === null ? '#5B8DEF' : 'text.primary' }} />
            {(Object.keys(KIND_META) as ObservationKind[]).map(k => {
              const m = KIND_META[k];
              const active = kindFilter === k;
              return (
                <Chip key={k} size="small" label={`${m.emoji} ${m.label}`}
                  onClick={() => setKindFilter(active ? null : k)}
                  sx={{ cursor: 'pointer', height: 22, fontSize: '0.7rem',
                        bgcolor: active ? `${m.color}33` : `${m.color}10`,
                        color: m.color, border: active ? `1px solid ${m.color}` : 'none' }} />
              );
            })}
          </Stack>
        </CardContent>
      </Card>

      {/* Observations */}
      {loading ? (
        <Stack spacing={1}>
          <Skeleton variant="rounded" height={88} />
          <Skeleton variant="rounded" height={88} />
          <Skeleton variant="rounded" height={88} />
        </Stack>
      ) : sorted.length === 0 ? (
        <Card sx={{ '&:hover': { transform: 'none' }, py: 6, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            {data.length === 0
              ? 'No observations yet. The weekly analyst runs Sunday 7am.'
              : 'No observations match these filters.'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {data.length === 0
              ? 'Want one now? On the VPS: python3 /root/openclaw/bin/deep-patterns.py'
              : 'Try widening source or scope.'}
          </Typography>
        </Card>
      ) : (
        <Stack spacing={1.25}>
          {sorted.map(obs => (
            <PatternCard key={obs.id} obs={obs} onReact={react} onDismiss={dismiss} />
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default PatternsPage;
