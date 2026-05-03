import React, { useMemo, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Stack, Skeleton, Chip,
  IconButton, TextField, Button, Collapse, Tooltip,
} from '@mui/material';
import { ChatBubbleOutline, Send, CheckRounded } from '@mui/icons-material';
import { useObservations, ObservationKind } from '../../hooks/useObservations';
import { useDashboardFeedback } from '../../hooks/useDashboardFeedback';
import { formatDistanceToNowStrict } from 'date-fns';

const AGENT_META: Record<string, { label: string; color: string; emoji: string; voice: string }> = {
  trainer:              { label: 'Your Trainer',         color: '#4CAF50', emoji: '🏋️', voice: 'Trainer' },
  nutritionist:         { label: 'Your Nutritionist',    color: '#FF9800', emoji: '🥗', voice: 'Nutritionist' },
  'mental-health':      { label: 'Mental Health Coach',  color: '#9C7BFF', emoji: '🧠', voice: 'Mental health' },
  'financial-advisor':  { label: 'Your Financial Advisor', color: '#26C6DA', emoji: '💰', voice: 'Financial advisor' },
  'personal-assistant': { label: 'Your Assistant',       color: '#5B8DEF', emoji: '📋', voice: 'Assistant' },
  'travel-agent':       { label: 'Travel Agent',         color: '#26A69A', emoji: '✈️', voice: 'Travel agent' },
  'wedding-planner':    { label: 'Wedding Planner',      color: '#EC407A', emoji: '💍', voice: 'Wedding planner' },
  'career-coach':       { label: 'Career Coach',         color: '#FFCA28', emoji: '🎯', voice: 'Career coach' },
};

interface Props {
  agentId: string;
  /** Optional: filter to specific kinds. Defaults to insight + pattern + recommendation + warning. */
  kinds?: ObservationKind[];
  /** Optional fallback message when this persona has nothing to say yet. */
  emptyMessage?: string;
  /** How many observations to show as bullet points. Default 3. */
  limit?: number;
}

const AgentVoiceCard: React.FC<Props> = ({
  agentId,
  kinds = ['insight', 'pattern', 'recommendation', 'warning', 'milestone', 'forecast'],
  emptyMessage,
  limit = 3,
}) => {
  const { data, loading } = useObservations({ agentId, kinds, limit: limit + 5 });
  const meta = AGENT_META[agentId] ?? { label: agentId, color: '#7d8590', emoji: '•', voice: agentId };
  const items = useMemo(() => data.slice(0, limit), [data, limit]);

  const { send, sending } = useDashboardFeedback();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!body.trim()) return;
    const ok = await send({ agentId, body: body.trim(), kind: 'note' });
    if (ok) {
      setSent(true);
      setBody('');
      setTimeout(() => { setSent(false); setOpen(false); }, 1500);
    }
  };

  return (
    <Card
      sx={{
        '&:hover': { transform: 'none' },
        borderLeft: `3px solid ${meta.color}`,
        bgcolor: `${meta.color}0a`,
      }}
    >
      <CardContent sx={{ pb: '16px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Typography sx={{ fontSize: 20 }}>{meta.emoji}</Typography>
          <Typography variant="overline" fontWeight={600} sx={{ letterSpacing: 1.5, color: meta.color, flex: 1 }}>
            {meta.label}
          </Typography>
          <Tooltip title={open ? 'Cancel' : `Tell ${meta.voice} something`}>
            <IconButton
              size="small"
              onClick={() => setOpen(o => !o)}
              sx={{ p: 0.5, color: open ? meta.color : 'text.secondary' }}
            >
              <ChatBubbleOutline sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {loading ? (
          <Stack spacing={1}>
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="text" width="60%" />
          </Stack>
        ) : items.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
            {emptyMessage ?? `${meta.voice} hasn't flagged anything recent.`}
          </Typography>
        ) : (
          <Stack spacing={1.25}>
            {items.map(obs => (
              <Box key={obs.id}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap', rowGap: 0.5 }}>
                  <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.875rem', flex: 1, minWidth: 0 }}>
                    {obs.title}
                  </Typography>
                  <Chip
                    size="small"
                    label={obs.kind}
                    sx={{
                      height: 18,
                      fontSize: '0.6rem',
                      bgcolor: `${meta.color}1a`,
                      color: meta.color,
                      textTransform: 'capitalize',
                    }}
                  />
                </Box>
                {obs.body && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mt: 0.25, fontSize: '0.78rem', lineHeight: 1.4 }}
                  >
                    {obs.body}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', opacity: 0.6 }}>
                  {formatDistanceToNowStrict(new Date(obs.created_at), { addSuffix: true })}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}

        <Collapse in={open} timeout="auto">
          <Box sx={{ mt: 2, pt: 2, borderTop: `1px dashed ${meta.color}33` }}>
            {sent ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: meta.color }}>
                <CheckRounded sx={{ fontSize: 18 }} />
                <Typography variant="caption">Sent — {meta.voice} will see it on next session.</Typography>
              </Box>
            ) : (
              <Stack spacing={1}>
                <TextField
                  size="small"
                  multiline
                  minRows={2}
                  maxRows={5}
                  placeholder={`Tell ${meta.voice} something — context, correction, or a heads-up.`}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  disabled={sending}
                  fullWidth
                  inputProps={{ style: { fontSize: '0.85rem' } }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleSend}
                    disabled={!body.trim() || sending}
                    endIcon={<Send sx={{ fontSize: 14 }} />}
                    sx={{
                      bgcolor: meta.color,
                      textTransform: 'none',
                      '&:hover': { bgcolor: meta.color, filter: 'brightness(1.1)' },
                    }}
                  >
                    {sending ? 'Sending…' : 'Send'}
                  </Button>
                </Box>
              </Stack>
            )}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default AgentVoiceCard;
