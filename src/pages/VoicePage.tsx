import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Typography, Switch, FormControlLabel, IconButton, Stack } from '@mui/material';
import { Mic, MicOff, Stop, VolumeUp } from '@mui/icons-material';
import { supabase } from '../lib/supabase';

const VOICE_API_URL = process.env.REACT_APP_VOICE_API_URL || '';

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { authorization: `Bearer ${session.access_token}` } : {};
}

// Single-purpose page for voice-mode conversations with the general agent.
// Tap big button → record → release / 1.5s silence → transcribe → agent reply
// → autoplay TTS → optionally restart recording for continuous mode.
//
// Background follow-ups (deferred specialist tasks) are polled and played
// after the foreground reply finishes.

type State = 'idle' | 'recording' | 'thinking' | 'playing' | 'error';

interface Turn {
  id: string;
  transcript: string;
  reply: string;
  audioUrl: string;
  timestamp: number;
}

const SILENCE_THRESHOLD = 0.02;       // RMS below this = silence
const SILENCE_HANG_MS = 1200;         // require this long of silence to auto-stop
const MIN_RECORDING_MS = 800;         // ignore button-bumps shorter than this
const FOLLOWUP_POLL_INTERVAL_MS = 5000;

const VoicePage: React.FC = () => {
  const [state, setState] = useState<State>('idle');
  const [continuous, setContinuous] = useState(true);
  const [history, setHistory] = useState<Turn[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [conversationId] = useState(() => `voice-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}`);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recordStartRef = useRef<number>(0);
  const silenceStartRef = useRef<number | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const continuousRef = useRef(continuous);
  const lastFollowupCheckRef = useRef<string>(new Date().toISOString());
  useEffect(() => { continuousRef.current = continuous; }, [continuous]);

  // ── Recording ──────────────────────────────────────────────────────────

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';

      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioChunksRef.current = [];
      mediaRecorderRef.current = mr;
      recordStartRef.current = Date.now();
      silenceStartRef.current = null;

      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const elapsed = Date.now() - recordStartRef.current;
        if (elapsed < MIN_RECORDING_MS) {
          setState('idle');
          return;
        }
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || 'audio/webm' });
        await sendTurn(blob);
      };

      // Voice activity detection — auto-stop on silence
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      analyserRef.current = analyser;

      const buf = new Float32Array(analyser.fftSize);
      const tick = () => {
        if (!audioContextRef.current || mr.state !== 'recording') return;
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);
        const elapsed = Date.now() - recordStartRef.current;
        if (rms < SILENCE_THRESHOLD) {
          if (silenceStartRef.current === null) silenceStartRef.current = Date.now();
          else if (elapsed > MIN_RECORDING_MS && Date.now() - silenceStartRef.current > SILENCE_HANG_MS) {
            stopRecording();
            return;
          }
        } else {
          silenceStartRef.current = null;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

      mr.start();
      setState('recording');
    } catch (e: any) {
      setErrorMsg('Microphone access denied or unavailable');
      setState('error');
    }
  }, [stopRecording]);

  // ── Playback + send ────────────────────────────────────────────────────

  const playAudio = useCallback((url: string): Promise<void> => {
    return new Promise((resolve) => {
      const a = new Audio(url);
      audioElRef.current = a;
      a.onended = () => resolve();
      a.onerror = () => resolve();
      a.play().catch(() => resolve());
    });
  }, []);

  const sendTurn = useCallback(async (blob: Blob) => {
    setState('thinking');
    try {
      const r = await fetch(`${VOICE_API_URL}/api/voice-turn`, {
        method: 'POST',
        headers: {
          'content-type': blob.type || 'audio/webm',
          'x-conversation-id': conversationId,
          ...(await authHeader()),
        },
        body: blob,
      });
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(`turn ${r.status}: ${txt}`);
      }
      const data = await r.json();
      const turn: Turn = {
        id: crypto.randomUUID(),
        transcript: data.transcript,
        reply: data.reply,
        audioUrl: data.audio_url,
        timestamp: Date.now(),
      };
      setHistory(h => [turn, ...h].slice(0, 50));
      setState('playing');
      await playAudio(turn.audioUrl);
      // Continuous mode: restart after agent finishes speaking
      if (continuousRef.current) {
        await startRecording();
      } else {
        setState('idle');
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'unknown error');
      setState('error');
    }
  }, [conversationId, playAudio, startRecording]);

  // ── Follow-up polling ──────────────────────────────────────────────────

  useEffect(() => {
    const tick = async () => {
      // Don't interrupt active turns
      if (state === 'recording' || state === 'thinking' || state === 'playing') return;
      try {
        const since = lastFollowupCheckRef.current;
        const url = `${VOICE_API_URL}/api/voice-followups?since=${encodeURIComponent(since)}&conversation_id=${encodeURIComponent(conversationId)}`;
        const r = await fetch(url, { headers: await authHeader() });
        if (!r.ok) return;
        const data = await r.json();
        if (data.items && data.items.length > 0) {
          lastFollowupCheckRef.current = new Date().toISOString();
          for (const item of data.items) {
            const turn: Turn = {
              id: item.id,
              transcript: `[follow-up · ${item.assignee}]`,
              reply: item.text,
              audioUrl: item.audio_url,
              timestamp: Date.now(),
            };
            setHistory(h => [turn, ...h].slice(0, 50));
            if (item.audio_url) {
              setState('playing');
              await playAudio(item.audio_url);
              setState('idle');
            }
          }
        }
      } catch {}
    };
    const id = setInterval(tick, FOLLOWUP_POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [state, conversationId, playAudio]);

  // ── Manual button ──────────────────────────────────────────────────────

  const onButtonClick = () => {
    if (state === 'recording') stopRecording();
    else if (state === 'idle' || state === 'error') startRecording();
    else if (state === 'playing') {
      audioElRef.current?.pause();
      setState('idle');
    }
  };

  // Cleanup on unmount
  useEffect(() => () => stopRecording(), [stopRecording]);

  // ── UI ─────────────────────────────────────────────────────────────────

  const buttonColor = state === 'recording' ? '#F44336'
                    : state === 'thinking' ? '#FF9800'
                    : state === 'playing'  ? '#5B8DEF'
                    : '#4CAF50';
  const buttonLabel = state === 'recording' ? 'Tap to stop'
                    : state === 'thinking' ? 'Thinking...'
                    : state === 'playing'  ? 'Speaking...'
                    : state === 'error'    ? 'Tap to retry'
                    : 'Tap to talk';
  const ButtonIcon = state === 'recording' ? Stop
                   : state === 'thinking' ? Mic
                   : state === 'playing'  ? VolumeUp
                   : state === 'error'    ? MicOff
                   : Mic;

  return (
    <Box
      sx={{
        position: 'fixed', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        bgcolor: '#0d1117', color: '#e6edf3',
        p: { xs: 2, sm: 4 },
        gap: 4,
      }}
    >
      {/* Continuous toggle in corner */}
      <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
        <FormControlLabel
          control={<Switch checked={continuous} onChange={(_, v) => setContinuous(v)} size="small" />}
          label={<Typography variant="caption" color="text.secondary">Continuous</Typography>}
        />
      </Box>

      {/* Big mic button */}
      <Box onClick={onButtonClick} sx={{ cursor: 'pointer', userSelect: 'none' }}>
        <Box
          sx={{
            width: { xs: 220, sm: 280 }, height: { xs: 220, sm: 280 },
            borderRadius: '50%',
            bgcolor: `${buttonColor}22`,
            border: `4px solid ${buttonColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
            boxShadow: state === 'recording' ? `0 0 60px ${buttonColor}80` : 'none',
            animation: state === 'recording' ? 'pulse 1.2s ease-in-out infinite' : state === 'thinking' ? 'spin 1.5s linear infinite' : 'none',
            '@keyframes pulse': {
              '0%, 100%': { transform: 'scale(1)' },
              '50%': { transform: 'scale(1.06)' },
            },
            '@keyframes spin': {
              from: { transform: 'rotate(0deg)' },
              to: { transform: 'rotate(360deg)' },
            },
          }}
        >
          <ButtonIcon sx={{ fontSize: { xs: 88, sm: 110 }, color: buttonColor }} />
        </Box>
      </Box>
      <Typography variant="h5" sx={{ color: buttonColor, fontWeight: 600, mt: 1 }}>{buttonLabel}</Typography>

      {errorMsg && (
        <Typography variant="caption" color="error">{errorMsg}</Typography>
      )}

      {/* Recent turn transcript (just the last one for glanceability) */}
      {history[0] && (
        <Stack spacing={0.5} sx={{ maxWidth: 500, width: '100%', textAlign: 'center', mt: 2 }}>
          <Typography variant="caption" color="text.secondary">You said</Typography>
          <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
            {history[0].transcript}
          </Typography>
          <Typography variant="caption" color="text.secondary">Dyno</Typography>
          <Typography variant="body1">{history[0].reply}</Typography>
        </Stack>
      )}
    </Box>
  );
};

export default VoicePage;
