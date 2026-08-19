import React from 'react';
import { Box, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { Dashboard, Forum, RecordVoiceOver, Extension } from '@mui/icons-material';
import { isDemo } from '../../lib/demoMode';

const ACCENT = '#5B8DEF';

/**
 * Demo-only bar that sits above the page content and switches between the
 * system's four surfaces.
 *
 * These are deliberately NOT sidebar entries: the sidebar is the dashboard's
 * own navigation, and listing Telegram/Voice/Extension there made them look
 * like more dashboard pages rather than separate ways into the same system.
 *
 * "Dashboard" is active for every route that isn't one of the other three.
 */

const SURFACES = [
  { label: 'Dashboard', path: '/',          icon: Dashboard,        match: null as string | null },
  { label: 'Telegram',  path: '/telegram',  icon: Forum,            match: '/telegram' },
  { label: 'Voice',     path: '/voice',     icon: RecordVoiceOver,  match: '/voice' },
  { label: 'Extension', path: '/extension', icon: Extension,        match: '/extension' },
];

const SurfaceSwitcher: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('sm'));

  if (!isDemo()) return null;

  const path = location.pathname;
  const onOther = SURFACES.some(s => s.match && path.startsWith(s.match));

  return (
    <Box
      sx={{
        px: { xs: 1.5, sm: 2.5, md: 3 },
        pt: 1.5,
        pb: 1.25,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ overflowX: 'auto', pb: 0.25 }}>
        {!compact && (
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', mr: 0.75, whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            Surfaces
          </Typography>
        )}

        {SURFACES.map(({ label, path: to, icon: Icon, match }) => {
          const active = match ? path.startsWith(match) : !onOther;
          return (
            <Box
              key={label}
              onClick={() => navigate(to)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 0.75,
                px: 1.5, py: 0.75, borderRadius: 99,
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                color: active ? ACCENT : 'text.secondary',
                bgcolor: active ? 'rgba(91,141,239,0.12)' : 'transparent',
                border: `1px solid ${active ? 'rgba(91,141,239,0.4)' : 'rgba(255,255,255,0.09)'}`,
                transition: 'all 0.15s',
                '&:hover': {
                  color: ACCENT,
                  borderColor: 'rgba(91,141,239,0.4)',
                },
              }}
            >
              <Icon sx={{ fontSize: 16 }} />
              {label}
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};

export default SurfaceSwitcher;
