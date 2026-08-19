import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Card, Stack, Chip, Divider } from '@mui/material';
import {
  ArrowForward,
  Insights,
  RecordVoiceOver,
  Extension,
  AutoAwesome,
  Timeline,
  Storage,
  Forum,
} from '@mui/icons-material';

const ACCENT = '#5B8DEF';

/**
 * Portfolio landing page for the public demo. Explains what the system is and
 * why it's interesting before dropping a visitor into a dashboard full of
 * numbers they have no context for.
 *
 * Only routed under /sample (see lib/demoMode.ts). Router links are relative to
 * the /sample basename, so navigate('/') lands on /sample, not the real app.
 */

const PILLARS = [
  {
    icon: Storage,
    title: 'Ingest',
    body: 'Sleep, vitals and workouts sync from wearables; spending from bank feeds. Everything else gets typed into Telegram in plain language and parsed into structured rows.',
  },
  {
    icon: Insights,
    title: 'Observe',
    body: 'An observation engine reads across every domain at once and writes down what it noticed. It describes, and deliberately never prescribes — no unsolicited advice.',
  },
  {
    icon: Timeline,
    title: 'Predict & self-score',
    body: 'The system commits to concrete forecasts for tomorrow, then grades itself against reality. Accuracy is published, including the misses.',
  },
  {
    icon: RecordVoiceOver,
    title: 'Act',
    body: 'Ten specialist personas you message in Telegram, a phone-call voice mode, and browser capture — all reading and writing the same database.',
  },
];

const HIGHLIGHTS = [
  {
    label: 'Cross-domain observation',
    to: '/patterns',
    body: 'It connects resting heart rate, HRV and skin temperature into a single "you were run down last week" — a conclusion no individual metric page could reach.',
  },
  {
    label: 'Forecasts that grade themselves',
    to: '/patterns',
    body: 'Five metrics predicted every night, scored the next morning. A hit rate you can audit is the difference between insight and horoscope.',
  },
  {
    label: 'Anomaly explanation',
    to: '/finances',
    body: 'Not just "you spent more" — which category, against what baseline, and which specific charges opened the gap.',
  },
  {
    label: 'Agent-generated pages',
    to: '/spaces',
    body: 'Agents write whole React pages into the app — trip plans, project hubs — from a constrained component library.',
  },
];

const STACK = ['React', 'TypeScript', 'MUI', 'Supabase / Postgres', 'Recharts', 'Claude + Groq', 'Netlify', 'Chrome MV3'];

const DemoLandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', px: { xs: 2.5, md: 6 }, py: { xs: 5, md: 8 } }}>
      <Box sx={{ maxWidth: 1000, mx: 'auto' }}>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <Chip
          label="Live demo · every number below is fabricated"
          size="small"
          sx={{ mb: 3, bgcolor: 'rgba(91,141,239,0.12)', color: ACCENT, fontWeight: 600 }}
        />

        <Typography variant="h1" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 2 }}>
          Dyno
        </Typography>

        <Typography variant="h5" sx={{ color: 'text.secondary', maxWidth: 680, lineHeight: 1.6, mb: 1.5 }}>
          A personal operating system that watches everything I measure — sleep, training,
          money, mood — and tells me what it noticed.
        </Typography>

        <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 680, lineHeight: 1.7, mb: 4 }}>
          Most quantified-self tools give you dashboards and leave the thinking to you. This one
          does the thinking: it reads across domains that normally never touch, writes down
          patterns worth knowing, predicts tomorrow, and keeps score of how often it was right.
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
          <Button
            variant="contained"
            size="large"
            endIcon={<ArrowForward />}
            onClick={() => navigate('/')}
            sx={{ fontWeight: 600, px: 3, py: 1.25 }}
          >
            Launch the live demo
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<Insights />}
            onClick={() => navigate('/patterns')}
            sx={{ fontWeight: 600, px: 3, py: 1.25 }}
          >
            Jump to the interesting part
          </Button>
        </Stack>

        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 7 }}>
          No login, nothing to install. The demo runs against an in-memory fixture — there is no
          database behind it and no real data in it.
        </Typography>

        {/* ── How it works ─────────────────────────────────────────────── */}
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>How it works</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
          Four stages, running continuously.
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
            mb: 7,
          }}
        >
          {PILLARS.map(({ icon: Icon, title, body }, i) => (
            <Card key={title} sx={{ p: 2.5, '&:hover': { transform: 'none' } }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                <Box
                  sx={{
                    width: 34, height: 34, borderRadius: 2,
                    display: 'grid', placeItems: 'center',
                    bgcolor: 'rgba(91,141,239,0.12)', color: ACCENT,
                  }}
                >
                  <Icon fontSize="small" />
                </Box>
                <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.08em' }}>
                  Stage {i + 1}
                </Typography>
              </Stack>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.75 }}>{title}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.65 }}>{body}</Typography>
            </Card>
          ))}
        </Box>

        {/* ── What to look at ──────────────────────────────────────────── */}
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>What's worth looking at</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
          If you only have two minutes, these four things are the point of the project.
        </Typography>

        <Stack spacing={1.5} sx={{ mb: 7 }}>
          {HIGHLIGHTS.map(h => (
            <Card
              key={h.label}
              onClick={() => navigate(h.to)}
              sx={{
                p: 2.5, cursor: 'pointer',
                borderLeft: `3px solid ${ACCENT}`,
                '&:hover': { transform: 'translateY(-2px)' },
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>{h.label}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>{h.body}</Typography>
                </Box>
                <ArrowForward sx={{ color: 'text.secondary', flexShrink: 0 }} fontSize="small" />
              </Stack>
            </Card>
          ))}
        </Stack>

        {/* ── Surfaces ─────────────────────────────────────────────────── */}
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>Four ways in</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
          The dashboard is the visual layer, not the whole system. Most of what it shows was
          captured somewhere else.
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
            mb: 7,
          }}
        >
          <Card
            onClick={() => navigate('/telegram')}
            sx={{ p: 2.5, cursor: 'pointer', border: `1px solid ${ACCENT}44`, '&:hover': { transform: 'translateY(-2px)' } }}
          >
            <Forum sx={{ color: ACCENT, mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.75 }}>
              Telegram <Chip label="primary" size="small" sx={{ ml: 0.5, height: 18, fontSize: 10, bgcolor: 'rgba(91,141,239,0.15)', color: ACCENT }} />
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.65 }}>
              Where the system actually lives. Ten agent personas, each owning a topic in one
              supergroup — type "chicken salad bowl" and it becomes structured data. It also starts
              conversations, rather than only answering them.
            </Typography>
          </Card>
          <Card sx={{ p: 2.5, '&:hover': { transform: 'none' } }}>
            <AutoAwesome sx={{ color: ACCENT, mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.75 }}>The dashboard</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.65 }}>
              Eleven pages of charts and detail — plus Spaces, where agents publish pages they wrote themselves.
            </Typography>
          </Card>
          <Card sx={{ p: 2.5, '&:hover': { transform: 'none' } }}>
            <RecordVoiceOver sx={{ color: ACCENT, mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.75 }}>Voice</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.65 }}>
              A hands-free phone-call mode. Small talk routes to a fast model in ~250ms; real questions
              route to an agent with database access.
            </Typography>
          </Card>
          <Card sx={{ p: 2.5, '&:hover': { transform: 'none' } }}>
            <Extension sx={{ color: ACCENT, mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.75 }}>Chrome extension</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.65 }}>
              Capture a page, a selection or a thought into the system from anywhere, without
              breaking flow to open the app.
            </Typography>
          </Card>
        </Box>

        {/* ── Stack ────────────────────────────────────────────────────── */}
        <Divider sx={{ mb: 3 }} />
        <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.08em' }}>
          Built with
        </Typography>
        <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ mt: 1.5, mb: 5 }}>
          {STACK.map(s => (
            <Chip key={s} label={s} size="small" variant="outlined" sx={{ color: 'text.secondary' }} />
          ))}
        </Stack>

        <Button
          variant="contained"
          size="large"
          endIcon={<ArrowForward />}
          onClick={() => navigate('/')}
          sx={{ fontWeight: 600, px: 3, py: 1.25, mb: 4 }}
        >
          Launch the live demo
        </Button>

        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          Demo data is generated fresh on each visit and is relative to today, so it never goes stale.
          Any resemblance to a real person's health or finances is coincidental.
        </Typography>
      </Box>
    </Box>
  );
};

export default DemoLandingPage;
