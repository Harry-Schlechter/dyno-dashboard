import React, { useState } from 'react';
import { Box, Typography, Card, Stack, Chip, Divider } from '@mui/material';
import { Bolt, Forum, Schedule, CallSplit } from '@mui/icons-material';

const ACCENT = '#5B8DEF';

/**
 * Static showcase for the Telegram interface — the system's primary surface.
 *
 * The real thing is a supergroup where each persona owns a topic, so messages
 * route to the right agent by which topic you post in. None of that can run in
 * a public demo (it's a private group tied to a real account), so this page
 * mocks the conversation instead.
 *
 * Deliberately contains no group ids, handles, or bot tokens.
 *
 * Only routed under /sample (see lib/demoMode.ts).
 */

interface Persona {
  id: string;
  label: string;
  emoji: string;
  color: string;
  blurb: string;
}

// Mirrors the real persona roster (extension/src/lib/agents.ts).
const PERSONAS: Persona[] = [
  { id: 'trainer',            label: 'Trainer',     emoji: '💪', color: '#EF5350', blurb: 'Programs training, tracks lifts and reads recovery before telling you to push.' },
  { id: 'nutritionist',       label: 'Nutritionist', emoji: '🥗', color: '#66BB6A', blurb: 'Logs meals from plain descriptions and keeps macros honest.' },
  { id: 'financial-advisor',  label: 'Financial',   emoji: '💰', color: '#FFB74D', blurb: 'Categorizes spending, watches for drift, flags subscriptions worth killing.' },
  { id: 'career-coach',       label: 'Career',      emoji: '🎯', color: '#7E57C2', blurb: 'Keeps track of goals, prep, and the things you keep avoiding.' },
  { id: 'travel-agent',       label: 'Travel',      emoji: '✈️', color: '#26C6DA', blurb: 'Plans trips and writes them up as pages in Spaces.' },
  { id: 'wedding-planner',    label: 'Wedding',     emoji: '💍', color: '#EC407A', blurb: 'Venues, vendors, timeline, budget — one long-running thread.' },
  { id: 'health-wellness',    label: 'Health',      emoji: '🩺', color: '#42A5F5', blurb: 'Vitals, sleep and recovery. Owns the cross-domain health picture.' },
  { id: 'personal-assistant', label: 'Assistant',   emoji: '📋', color: '#5B8DEF', blurb: 'Calendar, tasks, and the daily briefing. The default catch-all.' },
  { id: 'maintenance',        label: 'Maintenance', emoji: '🔧', color: '#9E9E9E', blurb: 'Keeps the system itself running — syncs, backups, data hygiene.' },
  { id: 'builder',            label: 'Builder',     emoji: '🛠️', color: '#26A69A', blurb: 'Writes new pages and features into the dashboard on request.' },
];

interface Msg {
  from: 'you' | 'agent';
  persona?: Persona;
  text: string;
  time: string;
}

const THREADS: Record<string, Msg[]> = {
  nutritionist: [
    { from: 'you', text: 'chicken salad bowl with quinoa for lunch', time: '12:41' },
    { from: 'agent', persona: PERSONAS[1], text: 'Logged — roughly 620 cal, 40g protein, 55g carbs, 25g fat. That puts you at 1,240 cal and 65g protein so far today. You usually land near 150g, so dinner is doing a lot of the work.', time: '12:41' },
    { from: 'you', text: 'am I behind on protein this week?', time: '12:42' },
    { from: 'agent', persona: PERSONAS[1], text: 'A little. You averaged 141g over the last 14 days against your 150g target, and the misses are all on days with no lunch logged. Not a big gap — it just shows up on the same days.', time: '12:42' },
  ],
  trainer: [
    { from: 'you', text: 'should I push deadlifts today', time: '17:12' },
    { from: 'agent', persona: PERSONAS[0], text: 'Recovery is green — HRV is above baseline and resting HR came back down after last week. Your working sets have moved 295 → 315 over eight weeks. I would take 320 for a triple and stop there rather than testing a single.', time: '17:12' },
  ],
  'financial-advisor': [
    { from: 'agent', persona: PERSONAS[2], text: 'Heads up: dining is running about 62% above your three-month average, and it is entirely weekday charges. Weekends are unchanged. Want me to break it out by merchant?', time: '09:03' },
    { from: 'you', text: 'yeah', time: '09:05' },
    { from: 'agent', persona: PERSONAS[2], text: 'Eight charges, six of them lunches near the office. Two subscriptions also renew this week — Gym ($65) tomorrow and Cloud Storage ($9.99) Thursday.', time: '09:05' },
  ],
};

const Bubble: React.FC<{ msg: Msg }> = ({ msg }) => {
  const mine = msg.from === 'you';
  return (
    <Box sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', mb: 1 }}>
      <Box sx={{ maxWidth: '86%' }}>
        {!mine && msg.persona && (
          <Typography variant="caption" sx={{ color: msg.persona.color, fontWeight: 700, display: 'block', mb: 0.25, ml: 0.5 }}>
            {msg.persona.emoji} {msg.persona.label}
          </Typography>
        )}
        <Box
          sx={{
            px: 1.5, py: 1,
            borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
            bgcolor: mine ? ACCENT : '#1c2431',
            color: mine ? '#fff' : '#e6edf3',
            border: mine ? 'none' : '1px solid #2a3441',
            fontSize: 13.5, lineHeight: 1.5,
          }}
        >
          {msg.text}
          <Typography component="span" sx={{ display: 'block', fontSize: 10, opacity: 0.55, mt: 0.5, textAlign: 'right' }}>
            {msg.time}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

const HOW_IT_WORKS = [
  { icon: Forum,     title: 'One topic per persona', body: 'The system lives in a Telegram supergroup where every persona owns a topic. Posting in a topic routes the message to that agent — no commands, no prefixes, just the right room.' },
  { icon: Bolt,      title: 'Capture beats logging',  body: 'You type "chicken salad bowl" and it becomes structured nutrition data. The friction of logging is what kills tracking, so the interface is just a chat you already have open.' },
  { icon: Schedule,  title: 'It talks first',         body: 'Briefings arrive each morning, and agents raise things unprompted when the data warrants it — an anomaly, a renewal, a streak. You do not have to remember to check.' },
  { icon: CallSplit, title: 'Everything lands here',  body: 'Whatever gets captured in Telegram shows up on this dashboard, in the extension, and in voice. Telegram is the front door; the dashboard is the visual layer over the same data.' },
];

const DemoTelegramPage: React.FC = () => {
  const [active, setActive] = useState<string>('nutritionist');
  const thread = THREADS[active];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Telegram</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 700, lineHeight: 1.65 }}>
          The primary interface. Dyno runs 24/7 in a Telegram supergroup where each persona owns
          its own topic — this dashboard is the visual layer over what gets captured there.
        </Typography>
      </Box>

      <Chip
        label="Static mockup — the real group is private and tied to a live account"
        size="small"
        sx={{ mb: 3, bgcolor: 'rgba(91,141,239,0.12)', color: ACCENT }}
      />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mb: 5 }}>
        {/* Mock chat */}
        <Box
          sx={{
            width: { xs: '100%', md: 380 }, flexShrink: 0, alignSelf: 'flex-start',
            border: '1px solid rgba(255,255,255,0.09)', borderRadius: 3,
            overflow: 'hidden', bgcolor: '#0b1017',
          }}
        >
          <Box sx={{ px: 1.75, py: 1.25, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <Typography variant="body2" fontWeight={700}>Dyno+</Typography>
            <Typography variant="caption" color="text.secondary">
              {PERSONAS.length} topics · always on
            </Typography>
          </Box>

          {/* Topic switcher */}
          <Stack direction="row" spacing={0.5} sx={{ px: 1, py: 1, overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            {Object.keys(THREADS).map(id => {
              const p = PERSONAS.find(x => x.id === id)!;
              const on = id === active;
              return (
                <Box
                  key={id}
                  onClick={() => setActive(id)}
                  sx={{
                    px: 1.25, py: 0.5, borderRadius: 99, cursor: 'pointer', whiteSpace: 'nowrap',
                    fontSize: 12, fontWeight: on ? 700 : 400,
                    bgcolor: on ? `${p.color}22` : 'transparent',
                    color: on ? p.color : 'text.secondary',
                    border: `1px solid ${on ? `${p.color}66` : 'transparent'}`,
                  }}
                >
                  {p.emoji} {p.label}
                </Box>
              );
            })}
          </Stack>

          <Box sx={{ p: 1.5, minHeight: 300 }}>
            {thread.map((m, i) => <Bubble key={i} msg={m} />)}
          </Box>

          <Box sx={{ px: 1.5, py: 1.25, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <Box sx={{ px: 1.5, py: 1, borderRadius: 99, bgcolor: '#121821', border: '1px solid #2a3441' }}>
              <Typography variant="caption" color="text.secondary">Message…</Typography>
            </Box>
          </Box>
        </Box>

        {/* How it works */}
        <Stack spacing={1.5} sx={{ flex: 1 }}>
          {HOW_IT_WORKS.map(({ icon: Icon, title, body }) => (
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

      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>The personas</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, maxWidth: 700, lineHeight: 1.65 }}>
        Each one has its own instructions, its own memory, and its own slice of the database. They
        write to the same tables this dashboard reads, and they can hand work to each other.
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' }, gap: 1.5, mb: 5 }}>
        {PERSONAS.map(p => (
          <Card key={p.id} sx={{ p: 2, borderLeft: `3px solid ${p.color}`, '&:hover': { transform: 'none' } }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
              {p.emoji} {p.label}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6, fontSize: '0.82rem' }}>
              {p.blurb}
            </Typography>
          </Card>
        ))}
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Why Telegram</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 720, lineHeight: 1.7, mb: 2 }}>
        A tracking system you have to open is a tracking system you abandon in a fortnight. Telegram
        was already open, already on every device, and already the place where quick thoughts get
        typed — so capture costs nothing. Topics gave the personas somewhere to live without
        building a chat UI, and bots can start conversations rather than only answering them, which
        is what lets the system surface things you did not think to ask about.
      </Typography>

      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
        {['Telegram Bot API', 'Supergroup topics', 'Claude', 'Postgres / Supabase', 'Cron briefings'].map(s => (
          <Chip key={s} label={s} size="small" variant="outlined" sx={{ color: 'text.secondary' }} />
        ))}
      </Stack>
    </Box>
  );
};

export default DemoTelegramPage;
