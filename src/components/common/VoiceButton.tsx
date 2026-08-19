import React from 'react';
import { Fab, Tooltip, Stack } from '@mui/material';
import { Mic, ChatBubbleOutline } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { useChat } from '../chat/ChatContext';
import { isDemo } from '../../lib/demoMode';

// Global top-right controls on every dashboard page (owner-only):
//   • mic  → the full /voice interface
//   • chat → a text chat panel with the general Dyno agent
// Hidden while already on /voice.
const VoiceButton: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { openChat } = useChat();

  if (user?.role !== 'owner') return null;
  if (location.pathname.startsWith('/voice')) return null;
  // Hidden in the demo: the chat FAB posts to the private voice backend, which
  // a public visitor can't reach, and the mic duplicates the SurfaceSwitcher's
  // Voice link. Better to omit both than to ship two dead buttons.
  if (isDemo()) return null;

  const gradient = (theme: any) => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`;

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        position: 'fixed',
        top: { xs: 12, sm: 16 },
        right: { xs: 12, sm: 16 },
        zIndex: (theme) => theme.zIndex.drawer + 2,
      }}
    >
      <Tooltip title="Chat with Dyno" placement="bottom">
        <Fab
          size="medium"
          aria-label="Chat with Dyno"
          onClick={() => openChat({ agent: 'general', label: 'Dyno' })}
          sx={{
            width: { xs: 48, sm: 56 }, height: { xs: 48, sm: 56 },
            bgcolor: '#1c2431', color: '#e6edf3',
            border: '1px solid #2a3441',
            boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
            '&:hover': { bgcolor: '#242c3a' },
          }}
        >
          <ChatBubbleOutline />
        </Fab>
      </Tooltip>
      <Tooltip title="Talk to Dyno" placement="bottom">
        <Fab
          aria-label="Talk to Dyno"
          onClick={() => navigate('/voice')}
          sx={{
            width: { xs: 48, sm: 56 }, height: { xs: 48, sm: 56 },
            background: gradient, color: '#fff',
            boxShadow: '0 6px 20px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.08)',
            '&:hover': {
              background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.light}, ${theme.palette.secondary.main})`,
              boxShadow: '0 8px 26px rgba(0,0,0,0.55)',
            },
          }}
        >
          <Mic />
        </Fab>
      </Tooltip>
    </Stack>
  );
};

export default VoiceButton;
