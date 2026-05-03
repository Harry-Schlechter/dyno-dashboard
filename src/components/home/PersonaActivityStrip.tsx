import React from 'react';
import { Box, Card, Typography, Stack, Tooltip, Skeleton } from '@mui/material';
import { format } from 'date-fns';
import { useSupabase } from '../../hooks/useSupabase';

interface AgentActivityRow {
  user_id: string;
  agent_id: string;
  message_count: number;
  last_message_at: string;
  actions_taken: number;
  intents: string[] | null;
}

const AGENT_META: Record<string, { label: string; color: string; emoji: string }> = {
  trainer:              { label: 'Trainer',         color: '#4CAF50', emoji: '🏋️' },
  nutritionist:         { label: 'Nutritionist',    color: '#FF9800', emoji: '🥗' },
  'mental-health':      { label: 'Mental Health',   color: '#9C7BFF', emoji: '🧠' },
  'financial-advisor':  { label: 'Finance',         color: '#26C6DA', emoji: '💰' },
  'personal-assistant': { label: 'Assistant',       color: '#5B8DEF', emoji: '📋' },
  maintenance:          { label: 'Maintenance',     color: '#7d8590', emoji: '🔧' },
  'travel-agent':       { label: 'Travel',          color: '#26A69A', emoji: '✈️' },
  'wedding-planner':    { label: 'Wedding',         color: '#EC407A', emoji: '💍' },
  'career-coach':       { label: 'Career',          color: '#FFCA28', emoji: '🎯' },
  builder:              { label: 'Builder',         color: '#90A4AE', emoji: '🛠️' },
};

const PersonaActivityStrip: React.FC = () => {
  const { data, loading } = useSupabase<AgentActivityRow>({
    table: 'agent_activity_today',
    isView: true,
    order: { column: 'last_message_at', ascending: false },
    limit: 20,
  });

  if (loading) {
    return (
      <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
        {[1, 2, 3].map(i => <Skeleton key={i} variant="rounded" width={120} height={56} />)}
      </Stack>
    );
  }

  if (data.length === 0) {
    return (
      <Card sx={{ '&:hover': { transform: 'none' }, py: 1.5, px: 2 }}>
        <Typography variant="caption" color="text.secondary">
          No agent activity yet today.
        </Typography>
      </Card>
    );
  }

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        overflowX: 'auto',
        pb: 1,
        // hide scrollbar on mobile — feels native
        scrollbarWidth: 'thin',
        '&::-webkit-scrollbar': { height: 4 },
        '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 },
      }}
    >
      {data.map(row => {
        const meta = AGENT_META[row.agent_id] ?? { label: row.agent_id, color: '#7d8590', emoji: '•' };
        const lastTime = new Date(row.last_message_at);
        return (
          <Tooltip
            key={row.agent_id}
            title={
              <Box>
                <div>{row.message_count} message{row.message_count > 1 ? 's' : ''}</div>
                <div>{row.actions_taken} action{row.actions_taken !== 1 ? 's' : ''}</div>
                <div>last: {format(lastTime, 'h:mm a')}</div>
                {row.intents && row.intents.length > 0 && (
                  <div style={{ marginTop: 4, fontSize: 11, opacity: 0.7 }}>
                    {row.intents.slice(0, 3).join(', ')}
                  </div>
                )}
              </Box>
            }
            arrow
          >
            <Card
              sx={{
                '&:hover': { transform: 'translateY(-2px)' },
                px: 1.5, py: 1,
                borderLeft: `2px solid ${meta.color}`,
                minWidth: 110,
                cursor: 'pointer',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Typography sx={{ fontSize: 16 }}>{meta.emoji}</Typography>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" fontWeight={600} sx={{ display: 'block', fontSize: '0.7rem', color: meta.color, lineHeight: 1.2 }}>
                    {meta.label}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', lineHeight: 1.2 }}>
                    {row.message_count} msg · {format(lastTime, 'h:mma').toLowerCase()}
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Tooltip>
        );
      })}
    </Stack>
  );
};

export default PersonaActivityStrip;
