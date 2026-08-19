import React from 'react';
import { Box, Typography, Button, Stack, useMediaQuery, useTheme } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  InfoOutlined, Dashboard, Forum, RecordVoiceOver, Extension,
} from '@mui/icons-material';
import { isDemo } from '../../lib/demoMode';

const ACCENT = '#5B8DEF';

/**
 * Persistent demo strip: tells the visitor the data is fabricated, links back
 * to the explainer, and switches between the system's four surfaces.
 *
 * The surface links deliberately live here rather than in the sidebar — the
 * sidebar is the dashboard's own navigation, and listing Telegram/Voice/
 * Extension there made them look like more dashboard pages instead of separate
 * ways into the same system. Keeping them in the banner also means one bar
 * above the content rather than two stacked strips.
 */

const SURFACES = [
  { label: 'Dashboard', path: '/',          icon: Dashboard,       match: null as string | null },
  { label: 'Telegram',  path: '/telegram',  icon: Forum,           match: '/telegram' },
  { label: 'Voice',     path: '/voice',     icon: RecordVoiceOver, match: '/voice' },
  { label: 'Extension', path: '/extension', icon: Extension,       match: '/extension' },
];

const DemoBanner: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('md'));

  if (!isDemo()) return null;

  const path = location.pathname;
  const onOther = SURFACES.some(s => s.match && path.startsWith(s.match));

  return (
    <Box
      sx={{
        px: { xs: 1.5, sm: 2.5 },
        py: 0.85,
        bgcolor: 'rgba(91,141,239,0.10)',
        borderBottom: '1px solid rgba(91,141,239,0.22)',
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1.5}
        sx={{ flexWrap: 'nowrap' }}
      >
        {/* Notice */}
        <Stack direction="row" alignItems="center" spacing={0.85} sx={{ minWidth: 0 }}>
          <InfoOutlined sx={{ fontSize: 15, color: ACCENT, flexShrink: 0 }} />
          {!compact && (
            <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
              Demo — all data is fictional.
            </Typography>
          )}
          <Button
            size="small"
            onClick={() => navigate('/about')}
            sx={{ minWidth: 0, py: 0, px: 0.5, fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            {compact ? 'About' : 'What is this?'}
          </Button>
        </Stack>

        {/* Surfaces */}
        <Stack
          direction="row"
          spacing={0.6}
          alignItems="center"
          sx={{ overflowX: 'auto', flexShrink: 1, minWidth: 0, '&::-webkit-scrollbar': { display: 'none' } }}
        >
          {SURFACES.map(({ label, path: to, icon: Icon, match }) => {
            const active = match ? path.startsWith(match) : !onOther;
            return (
              <Box
                key={label}
                onClick={() => navigate(to)}
                title={label}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.5,
                  px: compact ? 0.9 : 1.25, py: 0.4, borderRadius: 99,
                  cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  fontSize: 12.5,
                  fontWeight: active ? 700 : 500,
                  color: active ? ACCENT : 'text.secondary',
                  bgcolor: active ? 'rgba(91,141,239,0.16)' : 'transparent',
                  border: `1px solid ${active ? 'rgba(91,141,239,0.45)' : 'rgba(255,255,255,0.10)'}`,
                  transition: 'all 0.15s',
                  '&:hover': { color: ACCENT, borderColor: 'rgba(91,141,239,0.45)' },
                }}
              >
                <Icon sx={{ fontSize: 15 }} />
                {!compact && label}
              </Box>
            );
          })}
        </Stack>
      </Stack>
    </Box>
  );
};

export default DemoBanner;
