import React from 'react';
import { Button } from '@mui/material';
import { ChatBubbleOutline } from '@mui/icons-material';
import { useLocation } from 'react-router-dom';
import { useChat, agentForPath } from './ChatContext';
import { isDemo } from '../../lib/demoMode';

// Per-page "Ask <specialist>" button. Picks the specialist for the current
// route and opens the chat panel with the page's data attached as context, so
// the specialist can answer about exactly what you're looking at.
const AskSpecialistButton: React.FC<{ context?: string; label?: string }> = ({ context, label }) => {
  const location = useLocation();
  const { openChat } = useChat();
  const { agent, label: agentLabel } = agentForPath(location.pathname);

  // The chat panel posts to the private voice backend, which a public demo
  // visitor cannot reach — the button would open a panel that never answers.
  if (isDemo()) return null;

  return (
    <Button
      variant="outlined"
      size="small"
      startIcon={<ChatBubbleOutline sx={{ fontSize: 16 }} />}
      onClick={() => openChat({ agent, label: label || agentLabel, context })}
      sx={{ whiteSpace: 'nowrap' }}
    >
      Ask {label || agentLabel}
    </Button>
  );
};

export default AskSpecialistButton;
