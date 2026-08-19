import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Typography, Switch, FormControlLabel, IconButton } from '@mui/material';
import { Mic, MicOff, VolumeUp } from '@mui/icons-material';
import { supabase } from '../lib/supabase';

const VOICE_API_URL = process.env.REACT_APP_VOICE_API_URL || '';

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { authorization: `Bearer ${session.access_token}` } : {};
}

// Phone-call-style voice conversation with the general agent.
//
// Speech is handled in the BROWSER for latency + zero server round-trips:
//  - SpeechRecognition (Web Speech API) streams STT while you talk and
//    auto-ends on silence.
//  - The transcript is POSTed to /api/voice-text, which routes it: fast
//    direct chat (~250ms) for conversation, or the full general agent when
//    it needs Harry's data.
//  - speechSynthesis speaks the reply locally (instant, free).
//  - Barge-in: talking (or tapping) while Dyno speaks interrupts it.
//
// Continuous mode auto-restarts listening after Dyno finishes, so it feels
// like an open phone line.

type State = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

interface Turn {
  id: string;
  transcript: string;
  reply: string;
  route?: string;
  timestamp: number;
}

// Strip characters that TTS would read literally / that look wrong in the thread.
function cleanForSpeech(s: string): string {
  return s
    .replace(/[*_#`>|]/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/—/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Grab whichever SpeechRecognition the browser exposes.
function getSpeechRecognition(): any {
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

const VoicePage: React.FC = () => {
  const [state, setState] = useState<State>('idle');
  const [continuous, setContinuous] = useState(true);
  const [history, setHistory] = useState<Turn[]>([]);
  const [interim, setInterim] = useState('');       // live partial transcript while talking
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const [conversationId] = useState(() => `voice-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}`);

  const recognitionRef = useRef<any>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const continuousRef = useRef(continuous);
  const stateRef = useRef<State>('idle');
  const finalTranscriptRef = useRef('');
  useEffect(() => { continuousRef.current = continuous; }, [continuous]);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [history, interim]);

  // ── TTS (browser speechSynthesis) ────────────────────────────────────────

  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      const synth = window.speechSynthesis;
      if (!synth) return resolve();
      synth.cancel(); // stop anything currently speaking (barge-in)
      const u = new SpeechSynthesisUtterance(cleanForSpeech(text));
      u.rate = 1.05;
      u.pitch = 1.0;
      // Prefer a natural-sounding English voice if the device has one.
      const voices = synth.getVoices();
      const preferred = voices.find(v => /Samantha|Google US English|Aria|Jenny|Natural/i.test(v.name) && /en/i.test(v.lang))
        || voices.find(v => /en-US/i.test(v.lang))
        || voices.find(v => /^en/i.test(v.lang));
      if (preferred) u.voice = preferred;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      synth.speak(u);
    });
  }, []);

  // ── Send transcript to the reply brain ───────────────────────────────────

  // Poll /api/voice-job until the async agent result is ready (or times out).
  const pollJob = useCallback(async (jobId: string): Promise<string | null> => {
    const deadline = Date.now() + 90_000; // agent turns can run long
    while (Date.now() < deadline) {
      await new Promise(res => setTimeout(res, 1200));
      try {
        const r = await fetch(`${VOICE_API_URL}/api/voice-job?id=${encodeURIComponent(jobId)}`, {
          headers: await authHeader(),
        });
        if (!r.ok) continue;
        const d = await r.json();
        if (d.status === 'done')  return d.reply as string;
        if (d.status === 'error') return null;
        if (d.status === 'unknown') return null;
      } catch { /* keep polling */ }
    }
    return null;
  }, []);

  const finishTurn = useCallback(() => {
    if (continuousRef.current) startListening();
    else setState('idle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendText = useCallback(async (text: string) => {
    setState('thinking');
    const turnId = crypto.randomUUID();
    try {
      const r = await fetch(`${VOICE_API_URL}/api/voice-text`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ text, conversation_id: conversationId }),
      });
      if (!r.ok) throw new Error(`reply ${r.status}: ${await r.text()}`);
      const data = await r.json();

      // Add the turn (reply is either the final answer, or the ack for async).
      const turn: Turn = { id: turnId, transcript: text, reply: data.reply, route: data.route, timestamp: Date.now() };
      setHistory(h => [turn, ...h].slice(0, 50));
      setState('speaking');
      await speak(data.reply);

      // Async agent path: speak the ack, then wait for and speak the real answer.
      if (data.done === false && data.job_id) {
        setState('thinking');
        const answer = await pollJob(data.job_id);
        if (answer) {
          setHistory(h => h.map(t => t.id === turnId ? { ...t, reply: answer } : t));
          setState('speaking');
          await speak(answer);
        } else {
          const miss = "Sorry, I couldn't pull that up.";
          setHistory(h => h.map(t => t.id === turnId ? { ...t, reply: miss } : t));
          await speak(miss);
        }
      }
      finishTurn();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'reply failed');
      setState('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, speak, pollJob, finishTurn]);

  // ── STT (browser SpeechRecognition) ──────────────────────────────────────

  const startListening = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) { setSupported(false); return; }
    // Barge-in: kill any speech before we start listening.
    window.speechSynthesis?.cancel();

    setErrorMsg(null);
    setInterim('');
    finalTranscriptRef.current = '';

    const rec = new SR();
    rec.lang = 'en-US';
    rec.continuous = false;         // stop automatically at end of an utterance
    rec.interimResults = true;      // stream partials for the live caption

    rec.onresult = (e: any) => {
      let interimText = '';
      let finalText = finalTranscriptRef.current;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const chunk = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += chunk;
        else interimText += chunk;
      }
      finalTranscriptRef.current = finalText;
      setInterim(interimText || finalText);
    };

    rec.onerror = (e: any) => {
      if (e.error === 'no-speech' || e.error === 'aborted') { setState('idle'); return; }
      setErrorMsg(`mic: ${e.error}`);
      setState('error');
    };

    rec.onend = () => {
      const text = finalTranscriptRef.current.trim();
      setInterim('');
      if (text) sendText(text);
      else if (stateRef.current === 'listening') setState('idle');
    };

    recognitionRef.current = rec;
    try {
      rec.start();
      setState('listening');
    } catch {
      // start() throws if already started — ignore.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendText]);

  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch {}
  }, []);

  // ── Button ───────────────────────────────────────────────────────────────

  const onButtonClick = () => {
    if (state === 'listening') stopListening();
    else if (state === 'speaking') { window.speechSynthesis?.cancel(); setState('idle'); }
    else startListening();
  };

  // Poll for completed background tasks (delegated to specialist agents) and
  // speak them mid-conversation, so "have the trainer analyze X" comes back
  // spoken when it's done without blocking the chat.
  const lastFollowupRef = useRef<string>(new Date().toISOString());
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      // Don't interrupt an active turn.
      if (stateRef.current === 'listening' || stateRef.current === 'thinking' || stateRef.current === 'speaking') return;
      try {
        const since = lastFollowupRef.current;
        const url = `${VOICE_API_URL}/api/voice-followups?since=${encodeURIComponent(since)}&conversation_id=${encodeURIComponent(conversationId)}`;
        const r = await fetch(url, { headers: await authHeader() });
        if (!r.ok) return;
        const data = await r.json();
        if (data.items && data.items.length > 0) {
          lastFollowupRef.current = new Date().toISOString();
          for (const item of data.items) {
            if (stop) return;
            const who = (item.assignee || 'update').replace(/-/g, ' ');
            const turn: Turn = { id: crypto.randomUUID(), transcript: `↳ ${who} finished`, reply: item.text, route: 'followup', timestamp: Date.now() };
            setHistory(h => [turn, ...h].slice(0, 50));
            setState('speaking');
            await speak(item.text);
            setState('idle');
          }
        }
      } catch { /* keep polling */ }
    };
    const id = setInterval(tick, 5000);
    return () => { stop = true; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, speak]);

  // Warm up voice list (some browsers populate async) + cleanup.
  // Also ping /api/voice-start so the server refreshes Dyno's briefing (recent
  // health, finances, tasks, context) at the start of the conversation.
  useEffect(() => {
    window.speechSynthesis?.getVoices();
    if (!getSpeechRecognition()) setSupported(false);
    (async () => {
      try {
        await fetch(`${VOICE_API_URL}/api/voice-start`, { method: 'POST', headers: await authHeader() });
      } catch { /* non-fatal */ }
    })();
    return () => { try { recognitionRef.current?.abort(); } catch {}; window.speechSynthesis?.cancel(); };
  }, []);

  // ── UI ─────────────────────────────────────────────────────────────────

  const buttonColor = state === 'listening' ? '#F44336'
                    : state === 'thinking' ? '#FF9800'
                    : state === 'speaking' ? '#5B8DEF'
                    : '#4CAF50';
  const buttonLabel = state === 'listening' ? 'Listening…'
                    : state === 'thinking' ? 'Thinking…'
                    : state === 'speaking' ? 'Speaking…'
                    : state === 'error'    ? 'Tap to retry'
                    : 'Tap to talk';
  const ButtonIcon = state === 'listening' ? Mic
                   : state === 'thinking' ? Mic
                   : state === 'speaking' ? VolumeUp
                   : state === 'error'    ? MicOff
                   : Mic;

  const thread = [...history].reverse();

  return (
    <Box sx={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: '#0d1117', color: '#e6edf3' }}>
      {/* Continuous toggle */}
      <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 2 }}>
        <FormControlLabel
          control={<Switch checked={continuous} onChange={(_, v) => setContinuous(v)} size="small" />}
          label={<Typography variant="caption" color="text.secondary">Continuous</Typography>}
        />
      </Box>

      {/* Conversation thread */}
      <Box ref={threadRef} sx={{ flex: 1, width: '100%', maxWidth: 640, overflowY: 'auto', px: { xs: 2, sm: 3 }, pt: 8, pb: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {thread.length === 0 && !interim && (
          <Box sx={{ m: 'auto', textAlign: 'center', color: 'text.secondary' }}>
            <Typography variant="body2">Tap the mic and start talking.</Typography>
            {!supported && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                This browser doesn't support speech recognition. Try Chrome.
              </Typography>
            )}
          </Box>
        )}
        {thread.map((t) => (
          <React.Fragment key={t.id}>
            <Box sx={{ alignSelf: 'flex-end', maxWidth: '85%' }}>
              <Box sx={{ bgcolor: '#5B8DEF', color: '#fff', px: 1.75, py: 1, borderRadius: '16px 16px 4px 16px', fontSize: 15, lineHeight: 1.4 }}>
                {t.transcript}
              </Box>
            </Box>
            <Box sx={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
              <Box sx={{ bgcolor: '#1c2431', color: '#e6edf3', px: 1.75, py: 1, borderRadius: '16px 16px 16px 4px', fontSize: 15, lineHeight: 1.4, border: '1px solid #2a3441' }}>
                {t.reply || <em style={{ opacity: 0.6 }}>…</em>}
                <IconButton size="small" onClick={() => speak(t.reply)} sx={{ ml: 0.5, p: 0.25, color: '#5B8DEF' }}>
                  <VolumeUp sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            </Box>
          </React.Fragment>
        ))}
        {/* Live interim caption while listening */}
        {interim && (
          <Box sx={{ alignSelf: 'flex-end', maxWidth: '85%' }}>
            <Box sx={{ bgcolor: '#5B8DEF66', color: '#fff', px: 1.75, py: 1, borderRadius: '16px 16px 4px 16px', fontSize: 15, lineHeight: 1.4, fontStyle: 'italic' }}>
              {interim}
            </Box>
          </Box>
        )}
      </Box>

      {/* Mic control */}
      <Box sx={{ flexShrink: 0, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: { xs: 2, sm: 3 }, borderTop: '1px solid #1c2431' }}>
        <Box onClick={onButtonClick} sx={{ cursor: 'pointer', userSelect: 'none' }}>
          <Box
            sx={{
              width: { xs: 96, sm: 112 }, height: { xs: 96, sm: 112 }, borderRadius: '50%',
              bgcolor: `${buttonColor}22`, border: `4px solid ${buttonColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
              boxShadow: state === 'listening' ? `0 0 40px ${buttonColor}80` : 'none',
              animation: state === 'listening' ? 'pulse 1.2s ease-in-out infinite' : state === 'thinking' ? 'spin 1.5s linear infinite' : 'none',
              '@keyframes pulse': { '0%, 100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.06)' } },
              '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
            }}
          >
            <ButtonIcon sx={{ fontSize: { xs: 40, sm: 48 }, color: buttonColor }} />
          </Box>
        </Box>
        <Typography variant="caption" sx={{ color: buttonColor, fontWeight: 600 }}>{buttonLabel}</Typography>
        {errorMsg && <Typography variant="caption" color="error">{errorMsg}</Typography>}
      </Box>
    </Box>
  );
};

export default VoicePage;
