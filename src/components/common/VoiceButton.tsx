import React from 'react';
import { Fab, Tooltip } from '@mui/material';
import { Mic } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth';

// One-tap voice button, fixed top-right on every dashboard page. Taps through
// to the full /voice interface. Owner-only, and hidden while already on /voice.
const VoiceButton: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Voice is owner-only (the /voice route is owner-gated too).
  if (user?.role !== 'owner') return null;
  if (location.pathname.startsWith('/voice')) return null;

  return (
    <Tooltip title="Talk to Dyno" placement="left">
      <Fab
        color="primary"
        aria-label="Talk to Dyno"
        onClick={() => navigate('/voice')}
        sx={{
          position: 'fixed',
          top: { xs: 12, sm: 16 },
          right: { xs: 12, sm: 16 },
          zIndex: (theme) => theme.zIndex.drawer + 2,
          width: { xs: 48, sm: 56 },
          height: { xs: 48, sm: 56 },
          background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          color: '#fff',
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
  );
};

export default VoiceButton;
