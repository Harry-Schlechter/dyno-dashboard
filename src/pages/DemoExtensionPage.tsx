import React from 'react';
import { Box, Typography, Card, Stack, Chip, Divider } from '@mui/material';
import {
  Bolt, Notes as NotesIcon, WbSunny, Search, MenuBook, Link as LinkIcon,
} from '@mui/icons-material';

const ACCENT = '#5B8DEF';

/**
 * Static showcase for the Chrome extension. The extension itself can't run
 * inside the demo (it's a separate MV3 build that pairs with a real account),
 * so this page explains what it does and mocks up the side panel.
 *
 * Only routed under /sample (see lib/demoMode.ts).
 */

const SURFACES = [
  {
    icon: WbSunny,
    title: 'Now',
    body: "Today's briefing, pending tasks, and the newest thing the observation engine noticed — without opening the dashboard. Tasks can be completed straight from the panel.",
  },
  {
    icon: Bolt,
    title: 'Capture',
    body: 'Send the current page, a text selection, or a raw thought to a specific agent. Start and stop focus sessions. Keep a queue of things to deal with later.',
  },
  {
    icon: NotesIcon,
    title: 'Notes',
    body: 'Read and write notes from anywhere in the browser. Same store the dashboard reads, so anything captured shows up on the Notes page immediately.',
  },
];

const EXTRAS = [
  { icon: MenuBook, label: 'New tab override', body: 'Replaces the new-tab page with focus state, tasks, quick capture and pinned links.' },
  { icon: Search,   label: 'Omnibox keyword',  body: 'Type "dyno" in the address bar to send a note or question without leaving the keyboard.' },
  { icon: LinkIcon, label: 'Context menu',     body: 'Right-click any selection to capture it with its source URL attached.' },
];

/** Mock side-panel — deliberately static; it mirrors the real layout. */
const PanelMock: React.FC = () => (
  <Box
    sx={{
      width: 300, flexShrink: 0,
      border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: 3, overflow: 'hidden',
      bgcolor: '#0b1017',
      alignSelf: 'flex-start',
    }}
  >
    {/* chrome */}
    <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      <Stack direction="row" spacing={0.75} alignItems="center">
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ff5f57' }} />
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#febc2e' }} />
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#28c840' }} />
        <Typography variant="caption" sx={{ color: 'text.secondary', ml: 1 }}>Dyno Cockpit</Typography>
      </Stack>
    </Box>

    {/* tabs */}
    <Stack direction="row" sx={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      {['Now', 'Capture', 'Notes'].map((t, i) => (
        <Box
          key={t}
          sx={{
            flex: 1, textAlign: 'center', py: 1,
            borderBottom: i === 0 ? `2px solid ${ACCENT}` : '2px solid transparent',
          }}
        >
          <Typography variant="caption" sx={{ color: i === 0 ? ACCENT : 'text.secondary', fontWeight: i === 0 ? 700 : 400 }}>
            {t}
          </Typography>
        </Box>
      ))}
    </Stack>

    {/* body */}
    <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: '0.6rem' }}>Today</Typography>

      <Card sx={{ p: 1.5, bgcolor: '#121821', '&:hover': { transform: 'none' } }}>
        <Typography variant="caption" sx={{ color: ACCENT, fontWeight: 700, display: 'block', mb: 0.5 }}>
          MORNING BRIEFING
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, fontSize: '0.8rem' }}>
          You're on track today
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
          Recovery is back at baseline after last week's dip. Two meetings before noon, gym at 5:30.
        </Typography>
      </Card>

      <Card sx={{ p: 1.5, bgcolor: '#121821', '&:hover': { transform: 'none' } }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.75 }}>
          PENDING
        </Typography>
        {['Review Q2 roadmap', 'Book flights for trip'].map(t => (
          <Stack key={t} direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <Box sx={{ width: 13, height: 13, borderRadius: '50%', border: '1.5px solid #7d8590', flexShrink: 0 }} />
            <Typography variant="caption" sx={{ fontSize: '0.72rem' }}>{t}</Typography>
          </Stack>
        ))}
      </Card>

      <Card sx={{ p: 1.5, bgcolor: '#121821', borderLeft: `2px solid ${ACCENT}`, '&:hover': { transform: 'none' } }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.5 }}>
          LATEST INSIGHT
        </Typography>
        <Typography variant="caption" sx={{ lineHeight: 1.5, fontSize: '0.72rem' }}>
          Dining spend is tracking 62% above your 3-month average, driven entirely by weekday charges.
        </Typography>
      </Card>
    </Box>
  </Box>
);

const DemoExtensionPage: React.FC = () => (
  <Box>
    <Box sx={{ mb: 3 }}>
      <Typography variant="h4" fontWeight={700}>Chrome extension</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 680, lineHeight: 1.65 }}>
        A system you have to remember to open is a system you stop using. The extension puts
        capture and today's state one keystroke away, inside the browser where the work already
        happens.
      </Typography>
    </Box>

    <Chip
      label="Static mockup — the extension pairs with a real account and can't run in the demo"
      size="small"
      sx={{ mb: 3, bgcolor: 'rgba(91,141,239,0.12)', color: ACCENT }}
    />

    <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mb: 5 }}>
      <PanelMock />

      <Stack spacing={1.5} sx={{ flex: 1 }}>
        {SURFACES.map(({ icon: Icon, title, body }) => (
          <Card key={title} sx={{ p: 2.5, '&:hover': { transform: 'none' } }}>
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <Box
                sx={{
                  width: 34, height: 34, borderRadius: 2, flexShrink: 0,
                  display: 'grid', placeItems: 'center',
                  bgcolor: 'rgba(91,141,239,0.12)', color: ACCENT,
                }}
              >
                <Icon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>{title}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.65 }}>{body}</Typography>
              </Box>
            </Stack>
          </Card>
        ))}
      </Stack>
    </Stack>

    <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Beyond the panel</Typography>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 5 }}>
      {EXTRAS.map(({ icon: Icon, label, body }) => (
        <Card key={label} sx={{ p: 2.5, '&:hover': { transform: 'none' } }}>
          <Icon sx={{ color: ACCENT, mb: 1 }} fontSize="small" />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>{label}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>{body}</Typography>
        </Card>
      ))}
    </Box>

    <Divider sx={{ mb: 3 }} />

    <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>How pairing works</Typography>
    <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 720, lineHeight: 1.7, mb: 2 }}>
      The extension holds its own session rather than borrowing the dashboard's. On pairing it calls
      a server endpoint that mints an independent token scoped to the extension, which it then
      refreshes on its own schedule. An earlier version shared the dashboard's refresh token — when
      either surface refreshed, it invalidated the other, and the extension silently un-paired every
      few hours. Separate sessions fixed it.
    </Typography>

    <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
      {['Manifest V3', 'React', 'Vite', 'Supabase auth', 'Service worker', 'Side Panel API'].map(s => (
        <Chip key={s} label={s} size="small" variant="outlined" sx={{ color: 'text.secondary' }} />
      ))}
    </Stack>
  </Box>
);

export default DemoExtensionPage;
