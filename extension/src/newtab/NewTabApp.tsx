import { useEffect, useState, useCallback } from 'react';
import {
  Box, Container, Typography, Stack, TextField, Button, Card, CardContent,
  IconButton, Chip, Skeleton, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogActions, Tooltip,
} from '@mui/material';
import {
  Search, Send, OpenInNew, CheckCircleOutline,
  Stop, PlayArrow, OpenInNew as OpenIcon, Add, Edit, Delete, Link as LinkIcon,
} from '@mui/icons-material';
import {
  fetchActiveFocus, startFocus, endFocus, FocusSession,
  fetchPendingTasks, completeTask,
  fetchQueue, QueueItem,
  createCapture,
  fetchLinks, createLink, updateLink, deleteLink, CockpitLink,
} from '../lib/queries';
import { getCurrentSession } from '../lib/supabase';
import { DASHBOARD_URL } from '../lib/config';
import type { Task } from '../lib/types';
import { hostnameOf } from '../lib/tabContext';

export function NewTabApp() {
  const [paired, setPaired] = useState<boolean | null>(null);
  const [focus, setFocus] = useState<FocusSession | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [links, setLinks] = useState<CockpitLink[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const session = await getCurrentSession();
    if (!session) {
      setPaired(false);
      setLoading(false);
      return;
    }
    setPaired(true);
    const [f, t, q, l] = await Promise.all([
      fetchActiveFocus(),
      fetchPendingTasks(),
      fetchQueue(),
      fetchLinks(),
    ]);
    setFocus(f);
    setTasks(t);
    setQueue(q);
    setLinks(l);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  if (paired === null) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!paired) {
    return (
      <Container maxWidth="sm" sx={{ pt: '20vh', textAlign: 'center' }}>
        <Typography variant="h1" sx={{ fontWeight: 700, mb: 1 }}>🦕 Dyno</Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
          Pair the extension to use this new tab.
        </Typography>
        <Button variant="contained" onClick={() => chrome.runtime.openOptionsPage()}>
          Open pairing page
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 }, pb: { xs: 12, md: 14 } }}>
      <HeaderRow />
      <FocusPill focus={focus} onChange={setFocus} loading={loading} />
      <CaptureSearchBox focus={focus} onCapture={reload} />
      <Stack spacing={2.5} sx={{ mt: 4 }}>
        <LinksRow links={links} loading={loading} onChange={setLinks} />
        <TasksRow tasks={tasks} loading={loading} onComplete={async (id) => {
          setTasks((prev) => prev.filter((t) => t.id !== id));
          const r = await completeTask(id);
          if (!r.ok) setTasks(await fetchPendingTasks());
        }} />
        <QueueRow queue={queue} loading={loading} />
      </Stack>
    </Container>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function HeaderRow() {
  const d = new Date();
  const dateStr = d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const hour = d.getHours();
  const part = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

  return (
    <Stack direction="row" justifyContent="space-between" alignItems="flex-end" sx={{ mb: 3 }}>
      <Box>
        <Typography variant="h1" sx={{ fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          🦕 Good {part}, Harry
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>{dateStr}</Typography>
      </Box>
      <IconButton size="small" onClick={() => window.open(DASHBOARD_URL, '_blank')} sx={{ color: 'text.secondary' }}>
        <OpenInNew sx={{ fontSize: 18 }} />
      </IconButton>
    </Stack>
  );
}

// ─── Focus ────────────────────────────────────────────────────────────────────

function FocusPill({ focus, onChange, loading }: { focus: FocusSession | null; onChange: (f: FocusSession | null) => void; loading: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!focus) return;
    const tick = () => setElapsed(Math.floor((Date.now() - new Date(focus.started_at).getTime()) / 1000));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [focus]);

  if (loading) return <Skeleton variant="rounded" height={48} sx={{ mb: 3 }} />;

  if (focus && !editing) {
    return (
      <Box
        sx={{
          mb: 3, p: 1.5, px: 2, borderRadius: 999,
          display: 'flex', alignItems: 'center', gap: 1.5,
          background: 'linear-gradient(135deg, rgba(102,126,234,0.18), rgba(118,75,162,0.18))',
          border: '1px solid rgba(91,141,239,0.4)',
        }}
      >
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'success.main', boxShadow: '0 0 10px #4CAF50' }} />
        <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
          Focus · {formatDuration(elapsed)}
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 600, flex: 1 }} noWrap>
          {focus.title}
        </Typography>
        <IconButton size="small" onClick={async () => { await endFocus(focus.id); onChange(null); }}>
          <Stop sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>
    );
  }

  if (editing) {
    return (
      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
        <TextField
          autoFocus
          size="small"
          fullWidth
          placeholder="What are you working on?"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={async (e) => {
            if (e.key === 'Enter' && draft.trim()) {
              const f = await startFocus(draft.trim());
              if (f) { onChange(f); setEditing(false); setDraft(''); }
            }
            if (e.key === 'Escape') setEditing(false);
          }}
        />
        <Button onClick={() => setEditing(false)} size="small">Cancel</Button>
      </Stack>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Button startIcon={<PlayArrow />} onClick={() => setEditing(true)} variant="outlined" size="small">
        Start focus
      </Button>
    </Box>
  );
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ─── Capture / Search box ─────────────────────────────────────────────────────

function CaptureSearchBox({ focus, onCapture }: { focus: FocusSession | null; onCapture: () => void }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const handleCapture = async () => {
    if (!text.trim()) return;
    setSending(true);
    const result = await createCapture({
      content: text.trim(),
      source: 'capture-box',
      focus_session_id: focus?.id ?? null,
    });
    setSending(false);
    if (result.ok) {
      setText('');
      onCapture();
    }
  };

  const handleSearch = () => {
    if (!text.trim()) return;
    const q = encodeURIComponent(text.trim());
    window.location.href = `https://www.google.com/search?q=${q}`;
  };

  return (
    <Card sx={{ '&:hover': { transform: 'none' } /* disable card hover for input area */ }}>
      <CardContent sx={{ '&:last-child': { pb: 2 }, py: 2 }}>
        <TextField
          autoFocus
          multiline
          minRows={1}
          maxRows={6}
          fullWidth
          placeholder="Capture a thought, or search the web…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          variant="standard"
          InputProps={{
            disableUnderline: true,
            style: { fontSize: '1.05rem' },
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleCapture(); }
          }}
        />
        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} justifyContent="flex-end">
          <Button
            startIcon={<Search />}
            onClick={handleSearch}
            disabled={!text.trim()}
            variant="outlined"
            size="small"
          >
            Search
          </Button>
          <Button
            startIcon={<Send />}
            onClick={handleCapture}
            disabled={!text.trim() || sending}
            variant="contained"
            size="small"
          >
            Capture
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ─── Tasks row ────────────────────────────────────────────────────────────────

function TasksRow({ tasks, loading, onComplete }: { tasks: Task[]; loading: boolean; onComplete: (id: string) => void }) {
  if (loading) return <Skeleton variant="rounded" height={140} />;

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>Pending tasks</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {tasks.length} total
          </Typography>
        </Stack>
        {tasks.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>Nothing pending — nice.</Typography>
        ) : (
          <Box sx={{ maxHeight: 360, overflowY: 'auto', mx: -1, px: 1 }}>
            {tasks.map((t) => (
              <Stack key={t.id} direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
                <IconButton size="small" onClick={() => onComplete(t.id)} sx={{ p: 0.5 }}>
                  <CheckCircleOutline sx={{ fontSize: 20, color: 'text.secondary' }} />
                </IconButton>
                <PriorityDot priority={t.priority} />
                <Typography variant="body1" sx={{ flex: 1, wordBreak: 'break-word' }}>{t.title}</Typography>
                {t.due_date && (
                  <Chip size="small" label={t.due_date} variant="outlined" sx={{ height: 20 }} />
                )}
              </Stack>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function PriorityDot({ priority }: { priority: number }) {
  const color = priority === 1 ? '#EF5350' : priority === 2 ? '#FFB74D' : '#64B5F6';
  return <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />;
}

// ─── Queue row ────────────────────────────────────────────────────────────────

function QueueRow({ queue, loading }: { queue: QueueItem[]; loading: boolean }) {
  if (loading) return null;
  if (queue.length === 0) return null;
  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>
            📥 From your agents
          </Typography>
          <Chip label={queue.length} size="small" />
        </Stack>
        {queue.slice(0, 3).map((q) => (
          <Stack key={q.id} direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
            <Typography variant="body2" sx={{ flex: 1 }}>{q.title}</Typography>
            {q.url && (
              <IconButton size="small" onClick={() => window.open(q.url!, '_blank')} sx={{ p: 0.5 }}>
                <OpenIcon sx={{ fontSize: 16 }} />
              </IconButton>
            )}
          </Stack>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Quick links (curated, clickable, configurable) ───────────────────────────

function LinksRow({ links, loading, onChange }: { links: CockpitLink[]; loading: boolean; onChange: (l: CockpitLink[]) => void }) {
  const [editor, setEditor] = useState<{ mode: 'add' } | { mode: 'edit'; link: CockpitLink } | null>(null);

  if (loading) return <Skeleton variant="rounded" height={140} />;

  const handleSaved = async () => {
    setEditor(null);
    onChange(await fetchLinks());
  };

  const handleDelete = async (id: string) => {
    onChange(links.filter((l) => l.id !== id));
    await deleteLink(id);
  };

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <LinkIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>Quick links</Typography>
          </Stack>
          <Button size="small" startIcon={<Add />} onClick={() => setEditor({ mode: 'add' })}>
            Add
          </Button>
        </Stack>

        {links.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            No links yet. Add a few to make this your launchpad.
          </Typography>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 1 }}>
            {links.map((l) => <LinkTile key={l.id} link={l} onEdit={() => setEditor({ mode: 'edit', link: l })} onDelete={() => handleDelete(l.id)} />)}
          </Box>
        )}
      </CardContent>

      <LinkEditorDialog
        open={editor !== null}
        initial={editor?.mode === 'edit' ? editor.link : undefined}
        onClose={() => setEditor(null)}
        onSaved={handleSaved}
      />
    </Card>
  );
}

function LinkTile({ link, onEdit, onDelete }: { link: CockpitLink; onEdit: () => void; onDelete: () => void }) {
  const host = hostnameOf(link.url);
  const favicon = `https://www.google.com/s2/favicons?sz=64&domain=${host}`;
  return (
    <Box
      sx={{
        position: 'relative',
        p: 1.5,
        borderRadius: 2,
        bgcolor: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        cursor: 'pointer',
        transition: 'all 0.18s',
        textAlign: 'center',
        '&:hover': {
          bgcolor: 'rgba(91,141,239,0.12)',
          borderColor: 'rgba(91,141,239,0.4)',
          transform: 'translateY(-2px)',
          '& .link-actions': { opacity: 1 },
        },
      }}
      onClick={() => window.open(link.url, '_blank')}
    >
      <Box sx={{ fontSize: '1.75rem', lineHeight: 1, mb: 0.75 }}>
        {link.emoji ? (
          <span>{link.emoji}</span>
        ) : (
          <img src={favicon} alt="" width={28} height={28} style={{ borderRadius: 6 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        )}
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }} noWrap>
        {link.title}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
        {host}
      </Typography>
      <Box className="link-actions" sx={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 0.25, opacity: 0, transition: 'opacity 0.15s' }}>
        <Tooltip title="Edit">
          <IconButton size="small" sx={{ p: 0.25 }} onClick={(e) => { e.stopPropagation(); onEdit(); }}>
            <Edit sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" sx={{ p: 0.25 }} onClick={(e) => { e.stopPropagation(); onDelete(); }}>
            <Delete sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}

function LinkEditorDialog({ open, initial, onClose, onSaved }: { open: boolean; initial?: CockpitLink; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [emoji, setEmoji] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(initial?.title ?? '');
      setUrl(initial?.url ?? '');
      setEmoji(initial?.emoji ?? '');
    }
  }, [open, initial]);

  const handleSave = async () => {
    if (!title.trim() || !url.trim()) return;
    setSaving(true);
    let fullUrl = url.trim();
    if (!/^https?:\/\//i.test(fullUrl)) fullUrl = 'https://' + fullUrl;
    if (initial) {
      await updateLink(initial.id, { title: title.trim(), url: fullUrl, emoji: emoji.trim() || null });
    } else {
      await createLink({ title: title.trim(), url: fullUrl, emoji: emoji.trim() || undefined });
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{initial ? 'Edit link' : 'Add quick link'}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
          <TextField
            autoFocus
            size="small"
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
          />
          <TextField
            size="small"
            label="URL"
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            fullWidth
          />
          <TextField
            size="small"
            label="Emoji (optional)"
            placeholder="🐙"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            inputProps={{ maxLength: 4 }}
            sx={{ width: 140 }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !title.trim() || !url.trim()}>
          {initial ? 'Save' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
