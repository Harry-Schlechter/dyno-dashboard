import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Drawer, Box, Typography, IconButton, TextField, Stack, CircularProgress,
} from '@mui/material';
import { Close, Send } from '@mui/icons-material';
import { supabase } from '../../lib/supabase';
import { useChat } from './ChatContext';

const VOICE_API_URL = process.env.REACT_APP_VOICE_API_URL || '';

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { authorization: `Bearer ${session.access_token}` } : {};
}

interface Msg { id: string; role: 'user' | 'dyno'; text: string; pending?: boolean; }

// Slide-out chat panel. Reuses the voice backend's text pipeline (/api/voice-text
// + /api/voice-job) but typed. When opened for a specialist with page context,
// it forces that agent and attaches what you're looking at.
const ChatPanel: React.FC = () => {
  const { open, closeChat } = useChat();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [conversationId] = useState(() => `chat-${Date.now()}`);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  // Reset the thread each time a new chat target opens.
  useEffect(() => {
    if (open) setMsgs([]);
  }, [open?.agent, open?.label]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [msgs]);

  const pollJob = useCallback(async (jobId: string): Promise<string | null> => {
    const deadline = Date.now() + 90_000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 1200));
      try {
        const r = await fetch(`${VOICE_API_URL}/api/voice-job?id=${encodeURIComponent(jobId)}`, { headers: await authHeader() });
        if (!r.ok) continue;
        const d = await r.json();
        if (d.status === 'done') return d.reply as string;
        if (d.status === 'error' || d.status === 'unknown') return null;
      } catch { /* keep polling */ }
    }
    return null;
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy || !open) return;
    setInput('');
    setBusy(true);
    const userMsg: Msg = { id: crypto.randomUUID(), role: 'user', text };
    const pendingId = crypto.randomUUID();
    setMsgs((m) => [...m, userMsg, { id: pendingId, role: 'dyno', text: '', pending: true }]);
    try {
      const r = await fetch(`${VOICE_API_URL}/api/voice-text`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({
          text,
          conversation_id: conversationId,
          mode: 'text',
          ...(open.agent !== 'general' ? { agent: open.agent } : {}),
          ...(open.context ? { context: open.context } : {}),
        }),
      });
      if (!r.ok) throw new Error(`chat ${r.status}`);
      const data = await r.json();
      let reply = data.reply as string;
      // Async agent path: reply is an ack; poll for the real answer.
      if (data.done === false && data.job_id) {
        const answer = await pollJob(data.job_id);
        reply = answer || "Sorry, I couldn't pull that up.";
      }
      setMsgs((m) => m.map((x) => (x.id === pendingId ? { ...x, text: reply, pending: false } : x)));
    } catch (e: any) {
      setMsgs((m) => m.map((x) => (x.id === pendingId ? { ...x, text: 'Something went wrong. Try again.', pending: false } : x)));
    } finally {
      setBusy(false);
    }
  }, [input, busy, open, conversationId, pollJob]);

  return (
    <Drawer
      anchor="right"
      open={!!open}
      onClose={closeChat}
      PaperProps={{ sx: { width: { xs: '100%', sm: 400 }, maxWidth: '100%', bgcolor: '#0d1117', color: '#e6edf3' } }}
    >
      {open && (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 1.5, borderBottom: '1px solid #1c2431' }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{open.label}</Typography>
              {open.context && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>knows what's on this page</Typography>
              )}
            </Box>
            <IconButton size="small" onClick={closeChat} sx={{ color: 'text.secondary' }}><Close /></IconButton>
          </Stack>

          {/* Thread */}
          <Box ref={bodyRef} sx={{ flex: 1, overflowY: 'auto', px: 2, py: 2, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {msgs.length === 0 && (
              <Typography variant="body2" sx={{ color: 'text.secondary', m: 'auto', textAlign: 'center' }}>
                Ask {open.label} anything{open.context ? ' about this page' : ''}.
              </Typography>
            )}
            {msgs.map((m) => (
              <Box key={m.id} sx={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%' }}>
                <Box sx={{
                  bgcolor: m.role === 'user' ? '#5B8DEF' : '#1c2431',
                  color: m.role === 'user' ? '#fff' : '#e6edf3',
                  border: m.role === 'user' ? 'none' : '1px solid #2a3441',
                  px: 1.5, py: 1,
                  borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {m.pending ? <CircularProgress size={14} sx={{ color: '#5B8DEF' }} /> : m.text}
                </Box>
              </Box>
            ))}
          </Box>

          {/* Input */}
          <Stack direction="row" spacing={1} sx={{ p: 1.5, borderTop: '1px solid #1c2431' }}>
            <TextField
              fullWidth size="small" placeholder={`Message ${open.label}…`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              multiline maxRows={4}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#161b22', color: '#e6edf3' } }}
            />
            <IconButton onClick={send} disabled={busy || !input.trim()} sx={{ color: '#5B8DEF' }}><Send /></IconButton>
          </Stack>
        </Box>
      )}
    </Drawer>
  );
};

export default ChatPanel;
