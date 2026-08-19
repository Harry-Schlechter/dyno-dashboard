import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Typography, Card, Stack, Chip, IconButton, Divider } from '@mui/material';
import { Mic, VolumeUp, GraphicEq, Bolt, Storage } from '@mui/icons-material';
import { demoReply, DEMO_VOICE_SUGGESTIONS } from '../lib/demo/demoVoice';

const ACCENT = '#5B8DEF';

/**
 * Self-contained voice demo. Sits inside the normal dashboard layout rather
 * than taking over the screen, so a portfolio visitor keeps the sidebar and the
 * surface switcher.
 *
 * Deliberately NOT the real VoicePage: that one owns microphone permissions,
 * continuous listening, barge-in and a private backend. Reproducing it here
 * would mean threading demo branches through production code and asking a
 * stranger for mic access on page load. This runs the same scripted brain the
 * real page used in demo mode, driven by clicking questions instead.
 *
 * Speech synthesis is optional and off by default — nobody wants a portfolio
 * page talking at them unprompted.
 */

interface Turn {
  id: string;
  question: string;
  reply: string;
  route: 'chat' | 'agent';
  ms: number;
}

const ROUTE_META = {
  chat:  { label: 'fast chat model', color: '#4CAF50', icon: Bolt,    note: 'Small talk never touches the database.' },
  agent: { label: 'agent + database', color: '#FFB74D', icon: Storage, note: 'Data questions run the full agent.' },
} as const;

const DemoVoicePage: React.FC = () => {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [thinking, setThinking] = useState<string | null>(null);
  const [speak, setSpeak] = useState(false);
  const timers = useRef<number[]>([]);

  // Cancel any in-flight timer/speech if the visitor navigates away mid-answer.
  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    window.speechSynthesis?.cancel();
  }, []);

  const say = useCallback((text: string) => {
    if (!speak || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text.replace(/[*_#`>|]/g, ''));
    u.rate = 1.05;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => /Samantha|Google US English|Aria|Jenny/i.test(v.name))
      || voices.find(v => /^en/i.test(v.lang));
    if (preferred) u.voice = preferred;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }, [speak]);

  const ask = useCallback((question: string) => {
    if (thinking) return;
    const { reply, route, latency } = demoReply(question);
    setThinking(question);
    const t = window.setTimeout(() => {
      setTurns(prev => [{ id: `${Date.now()}`, question, reply, route, ms: Math.round(latency) }, ...prev]);
      setThinking(null);
      say(reply);
    }, latency);
    timers.current.push(t);
  }, [thinking, say]);

  const unasked = DEMO_VOICE_SUGGESTIONS.filter(q => !turns.some(t => t.question === q));

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Voice</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 700, lineHeight: 1.65 }}>
          A hands-free mode that feels like a phone call. The real thing listens continuously and
          speaks back; here you can tap a question instead, and watch how each one gets routed.
        </Typography>
      </Box>

      <Stack direction="row" spacing={1} sx={{ mb: 3 }} flexWrap="wrap" useFlexGap>
        <Chip
          label="Scripted demo — answers read the sample data"
          size="small"
          sx={{ bgcolor: 'rgba(91,141,239,0.12)', color: ACCENT }}
        />
        <Chip
          icon={<VolumeUp sx={{ fontSize: 15 }} />}
          label={speak ? 'Speech on' : 'Speech off'}
          size="small"
          variant={speak ? 'filled' : 'outlined'}
          onClick={() => {
            if (speak) window.speechSynthesis?.cancel();
            setSpeak(s => !s);
          }}
          sx={{
            cursor: 'pointer',
            ...(speak ? { bgcolor: 'rgba(76,175,80,0.16)', color: '#4CAF50' } : { color: 'text.secondary' }),
          }}
        />
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        {/* Conversation */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Card sx={{ p: 2.5, minHeight: 320, '&:hover': { transform: 'none' } }}>
            {turns.length === 0 && !thinking && (
              <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ py: 6, textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 64, height: 64, borderRadius: '50%',
                    display: 'grid', placeItems: 'center',
                    bgcolor: 'rgba(91,141,239,0.12)', border: `2px solid ${ACCENT}55`,
                  }}
                >
                  <Mic sx={{ color: ACCENT, fontSize: 28 }} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Pick a question to hear how it answers.
                </Typography>
              </Stack>
            )}

            {thinking && (
              <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 2 }}>
                <GraphicEq sx={{ color: ACCENT, fontSize: 18 }} />
                <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                  “{thinking}” — thinking…
                </Typography>
              </Stack>
            )}

            <Stack spacing={2.5}>
              {turns.map(t => {
                const meta = ROUTE_META[t.route];
                const RouteIcon = meta.icon;
                return (
                  <Box key={t.id}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <Box sx={{ px: 1.5, py: 0.75, borderRadius: 99, bgcolor: ACCENT, color: '#fff', fontSize: 13.5 }}>
                        {t.question}
                      </Box>
                    </Stack>

                    <Box
                      sx={{
                        px: 1.75, py: 1.25, borderRadius: 2,
                        bgcolor: '#1c2431', border: '1px solid #2a3441',
                        fontSize: 14, lineHeight: 1.6,
                      }}
                    >
                      {t.reply}
                      <IconButton
                        size="small"
                        onClick={() => say(t.reply)}
                        sx={{ ml: 0.5, p: 0.25, color: ACCENT }}
                        aria-label="Speak this answer"
                      >
                        <VolumeUp sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Box>

                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.75 }}>
                      <RouteIcon sx={{ fontSize: 14, color: meta.color }} />
                      <Typography variant="caption" sx={{ color: meta.color, fontWeight: 600 }}>
                        {meta.label}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        · {t.ms}ms · {meta.note}
                      </Typography>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          </Card>

          {/* Question picker */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
              {unasked.length ? 'Ask something' : 'Ask again'}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {(unasked.length ? unasked : DEMO_VOICE_SUGGESTIONS).map(q => (
                <Box
                  key={q}
                  onClick={() => ask(q)}
                  sx={{
                    px: 1.5, py: 0.85, borderRadius: 99, fontSize: 13,
                    cursor: thinking ? 'default' : 'pointer',
                    opacity: thinking ? 0.45 : 1,
                    border: '1px solid rgba(255,255,255,0.12)',
                    transition: 'all 0.15s',
                    '&:hover': thinking ? {} : { borderColor: ACCENT, color: ACCENT },
                  }}
                >
                  {q}
                </Box>
              ))}
            </Stack>
          </Box>
        </Box>

        {/* How it works */}
        <Box sx={{ width: { xs: '100%', md: 320 }, flexShrink: 0 }}>
          <Card sx={{ p: 2.5, '&:hover': { transform: 'none' } }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>How the real one works</Typography>

            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.4 }}>Browser does the speech</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6, fontSize: '0.83rem' }}>
                  Recognition and synthesis both run locally via the Web Speech API — no audio
                  upload, no per-minute cost, and no round trip before it starts transcribing.
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.4 }}>Two-way routing</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6, fontSize: '0.83rem' }}>
                  Conversational turns go to a fast model and come back in about 250ms. Anything
                  needing real data runs the full agent, which is slower but can actually query.
                  Sending everything to the agent made it feel sluggish; sending everything to the
                  fast model made it useless.
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.4 }}>Barge-in</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6, fontSize: '0.83rem' }}>
                  Talking over it cuts the speech and starts listening again, so it behaves like a
                  call rather than a walkie-talkie. Continuous mode reopens the mic automatically
                  after each answer.
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.4 }}>Long answers don't block</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6, fontSize: '0.83rem' }}>
                  Agent turns that take a while return an acknowledgement immediately and speak the
                  real answer when it lands, rather than leaving dead air.
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75} sx={{ mt: 2.5 }}>
              {['Web Speech API', 'Groq', 'Claude', 'Cloudflare tunnel'].map(s => (
                <Chip key={s} label={s} size="small" variant="outlined" sx={{ color: 'text.secondary' }} />
              ))}
            </Stack>
          </Card>
        </Box>
      </Stack>
    </Box>
  );
};

export default DemoVoicePage;
