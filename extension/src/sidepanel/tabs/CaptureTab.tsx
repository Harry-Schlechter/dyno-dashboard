import { useEffect, useState, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, IconButton, Stack, TextField,
  Button, Chip, Skeleton, Tooltip, Collapse, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  PlayArrow, Stop, Edit, Refresh, Send, OpenInNew,
  CheckCircleOutline, Close, AutoAwesome, AttachFile,
  Add, Delete, Link as LinkIcon, StickyNote2, Mic,
} from '@mui/icons-material';
import { DASHBOARD_URL } from '../../lib/config';
import {
  fetchActiveFocus, startFocus, endFocus,
  createCapture, fetchQueue, markQueueItem,
  fetchLinks, createLink, updateLink, deleteLink,
  createNote,
  FocusSession, QueueItem, CockpitLink,
} from '../../lib/queries';
import { AGENTS, AGENT_BY_ID } from '../../lib/agents';
import { getActiveTabContext, hostnameOf, TabContext } from '../../lib/tabContext';

export function CaptureTab() {
  const [focus, setFocus] = useState<FocusSession | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [links, setLinks] = useState<CockpitLink[]>([]);
  const [tabCtx, setTabCtx] = useState<TabContext | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const [f, q, l, ctx] = await Promise.all([
      fetchActiveFocus(),
      fetchQueue(),
      fetchLinks(),
      getActiveTabContext(),
    ]);
    setFocus(f);
    setQueue(q);
    setLinks(l);
    setTabCtx(ctx);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // Refresh tab context whenever a different tab becomes active.
  useEffect(() => {
    const handler = () => { getActiveTabContext().then(setTabCtx); };
    chrome.tabs.onActivated.addListener(handler);
    chrome.tabs.onUpdated.addListener(handler);
    return () => {
      chrome.tabs.onActivated.removeListener(handler);
      chrome.tabs.onUpdated.removeListener(handler);
    };
  }, []);

  return (
    <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <FocusHeader focus={focus} loading={loading} onChange={setFocus} />
      <CaptureBox tabCtx={tabCtx} focus={focus} onSubmit={reload} />
      <QueueCard queue={queue} loading={loading} onChange={setQueue} />
      <LinksCard links={links} loading={loading} onChange={setLinks} />

      <Stack direction="row" justifyContent="flex-end" sx={{ pt: 0.5 }}>
        <IconButton size="small" onClick={reload} sx={{ color: 'text.secondary' }}>
          <Refresh sx={{ fontSize: 18 }} />
        </IconButton>
      </Stack>
    </Box>
  );
}

// ─── Focus header ─────────────────────────────────────────────────────────────

function FocusHeader({ focus, loading, onChange }: { focus: FocusSession | null; loading: boolean; onChange: (f: FocusSession | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [elapsedSec, setElapsedSec] = useState(0);

  // Tick a second-counter for the active focus session.
  useEffect(() => {
    if (!focus) return;
    const tick = () => setElapsedSec(Math.floor((Date.now() - new Date(focus.started_at).getTime()) / 1000));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [focus]);

  const handleStart = async () => {
    if (!draft.trim()) return;
    const f = await startFocus(draft.trim());
    if (f) { onChange(f); setEditing(false); setDraft(''); }
  };

  const handleEnd = async () => {
    if (!focus) return;
    await endFocus(focus.id);
    onChange(null);
  };

  if (loading) return <Skeleton variant="rounded" height={64} />;

  if (focus && !editing) {
    return (
      <Card sx={{ background: 'linear-gradient(135deg, rgba(102,126,234,0.15) 0%, rgba(118,75,162,0.15) 100%)', border: '1px solid rgba(91,141,239,0.3)' }}>
        <CardContent sx={{ '&:last-child': { pb: 1.25 }, py: 1.25 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main', boxShadow: '0 0 8px #4CAF50' }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: '0.6rem', lineHeight: 1 }}>
                Focus · {formatDuration(elapsedSec)}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.25 }} noWrap>
                {focus.title}
              </Typography>
            </Box>
            <Tooltip title="Talk to Dyno">
              <IconButton
                size="small"
                onClick={() => chrome.tabs.create({ url: `${DASHBOARD_URL}/voice` })}
                sx={{ color: '#8ba4f5' }}
              >
                <Mic sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="End focus">
              <IconButton size="small" onClick={handleEnd}><Stop sx={{ fontSize: 18 }} /></IconButton>
            </Tooltip>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent sx={{ '&:last-child': { pb: 1.25 }, py: 1.25 }}>
        {!editing ? (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: '0.6rem' }}>Focus</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                Not focused on anything yet.
              </Typography>
            </Box>
            <Button size="small" startIcon={<PlayArrow />} onClick={() => setEditing(true)} variant="outlined">Start</Button>
            <Button
              size="small"
              startIcon={<Mic />}
              variant="contained"
              onClick={() => chrome.tabs.create({ url: `${DASHBOARD_URL}/voice` })}
              sx={{
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                whiteSpace: 'nowrap',
                '&:hover': { background: 'linear-gradient(135deg, #7b8ff0, #764ba2)' },
              }}
            >
              Talk to Dyno
            </Button>
          </Stack>
        ) : (
          <Stack spacing={1}>
            <TextField
              autoFocus
              size="small"
              placeholder="What are you working on?"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleStart(); if (e.key === 'Escape') setEditing(false); }}
              fullWidth
            />
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button size="small" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="small" variant="contained" onClick={handleStart} disabled={!draft.trim()}>Start focus</Button>
            </Stack>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ─── Capture box ──────────────────────────────────────────────────────────────

function CaptureBox({ tabCtx, focus, onSubmit }: { tabCtx: TabContext | null; focus: FocusSession | null; onSubmit: () => void }) {
  const [content, setContent] = useState('');
  const [ask, setAsk] = useState('');
  const [showAsk, setShowAsk] = useState(false);
  const [attachPage, setAttachPage] = useState(true);
  const [forcedAgent, setForcedAgent] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const [justNoted, setJustNoted] = useState(false);

  const handleSaveNote = async () => {
    if (!content.trim()) return;
    setSending(true);
    // Compose body: capture content first, then any attached page link or selection.
    const lines = [content.trim()];
    if (attachPage && tabCtx?.url) {
      lines.push('');
      lines.push(`[${tabCtx.title || tabCtx.url}](${tabCtx.url})`);
    }
    if (attachPage && tabCtx?.selection) {
      lines.push('');
      lines.push('> ' + tabCtx.selection.replace(/\n/g, '\n> '));
    }
    const note = await createNote({ body: lines.join('\n') });
    setSending(false);
    if (note) {
      setContent(''); setAsk(''); setShowAsk(false); setForcedAgent(null);
      setJustNoted(true);
      setTimeout(() => setJustNoted(false), 1500);
      onSubmit();
    }
  };

  const handleSend = async () => {
    if (!content.trim()) return;
    setSending(true);
    const result = await createCapture({
      content: content.trim(),
      ask: ask.trim() || undefined,
      page_url: attachPage ? tabCtx?.url : undefined,
      page_title: attachPage ? tabCtx?.title : undefined,
      page_selection: attachPage && tabCtx?.selection ? tabCtx.selection : undefined,
      page_metadata: attachPage && tabCtx?.favicon ? { favicon: tabCtx.favicon } : undefined,
      source: 'capture-box',
      focus_session_id: focus?.id ?? null,
      forced_agent: forcedAgent,
    });
    setSending(false);
    if (result.ok) {
      setContent('');
      setAsk('');
      setShowAsk(false);
      setForcedAgent(null);
      setJustSent(true);
      setTimeout(() => setJustSent(false), 1500);
      onSubmit();
    }
  };

  const pageHost = tabCtx?.url ? hostnameOf(tabCtx.url) : '';

  return (
    <Card>
      <CardContent sx={{ '&:last-child': { pb: 1.5 }, py: 1.5 }}>
        <TextField
          multiline
          minRows={2}
          maxRows={6}
          fullWidth
          placeholder="Capture anything → routes to the right agent…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSend(); }
          }}
        />

        {tabCtx && attachPage && pageHost && (
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.75 }}>
            <AttachFile sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', flex: 1, minWidth: 0 }} noWrap>
              {pageHost}{tabCtx.selection ? ` · "${tabCtx.selection.slice(0, 40)}${tabCtx.selection.length > 40 ? '…' : ''}"` : ''}
            </Typography>
            <IconButton size="small" sx={{ p: 0.25 }} onClick={() => setAttachPage(false)}>
              <Close sx={{ fontSize: 14 }} />
            </IconButton>
          </Stack>
        )}

        <Collapse in={showAsk}>
          <TextField
            size="small"
            fullWidth
            placeholder="Optional: what do you want the agent to do?"
            value={ask}
            onChange={(e) => setAsk(e.target.value)}
            sx={{ mt: 1 }}
          />
        </Collapse>

        <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip
            size="small"
            label="Auto"
            icon={<AutoAwesome sx={{ fontSize: 12 }} />}
            color={forcedAgent === null ? 'primary' : 'default'}
            onClick={() => setForcedAgent(null)}
            variant={forcedAgent === null ? 'filled' : 'outlined'}
            sx={{ height: 22 }}
          />
          {AGENTS.map((a) => (
            <Chip
              key={a.id}
              size="small"
              label={`${a.emoji} ${a.label}`}
              onClick={() => setForcedAgent(forcedAgent === a.id ? null : a.id)}
              variant={forcedAgent === a.id ? 'filled' : 'outlined'}
              sx={{
                height: 22,
                ...(forcedAgent === a.id && { bgcolor: a.color + '40', borderColor: a.color }),
              }}
            />
          ))}
        </Box>

        <Stack direction="row" alignItems="center" sx={{ mt: 1 }} spacing={0.5}>
          <Button
            size="small"
            onClick={() => setShowAsk((v) => !v)}
            sx={{ minWidth: 0, color: 'text.secondary', textTransform: 'none', fontSize: '0.7rem' }}
          >
            {showAsk ? '− ask' : '+ ask'}
          </Button>
          {!attachPage && tabCtx && (
            <Button
              size="small"
              onClick={() => setAttachPage(true)}
              sx={{ minWidth: 0, color: 'text.secondary', textTransform: 'none', fontSize: '0.7rem' }}
            >
              + attach page
            </Button>
          )}
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Save as note instead of sending">
            <Button
              variant="outlined"
              size="small"
              endIcon={justNoted ? <CheckCircleOutline /> : <StickyNote2 />}
              onClick={handleSaveNote}
              disabled={!content.trim() || sending}
            >
              {justNoted ? 'Saved' : 'Note'}
            </Button>
          </Tooltip>
          <Button
            variant="contained"
            size="small"
            endIcon={justSent ? <CheckCircleOutline /> : <Send />}
            onClick={handleSend}
            disabled={!content.trim() || sending}
          >
            {justSent ? 'Sent' : 'Send'}
          </Button>
        </Stack>
        <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled', mt: 0.5, fontSize: '0.65rem' }}>
          ⌘+Enter to send · Note button saves it instead of routing
        </Typography>
      </CardContent>
    </Card>
  );
}

// ─── Queue ────────────────────────────────────────────────────────────────────

function QueueCard({ queue, loading, onChange }: { queue: QueueItem[]; loading: boolean; onChange: (q: QueueItem[]) => void }) {
  if (loading) return null;
  if (queue.length === 0) return null;

  const handleOpen = async (item: QueueItem) => {
    if (item.url) chrome.tabs.create({ url: item.url });
    await markQueueItem(item.id, 'opened');
  };
  const handleDismiss = async (item: QueueItem) => {
    onChange(queue.filter((q) => q.id !== item.id));
    await markQueueItem(item.id, 'dismissed');
  };
  const handleComplete = async (item: QueueItem) => {
    onChange(queue.filter((q) => q.id !== item.id));
    await markQueueItem(item.id, 'completed');
  };

  return (
    <Card>
      <CardContent sx={{ '&:last-child': { pb: 1.5 }, py: 1.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
          <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
            From your agents
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{queue.length}</Typography>
        </Stack>
        <Box sx={{ maxHeight: 240, overflowY: 'auto', mx: -0.5, px: 0.5 }}>
          {queue.map((item) => {
            const meta = AGENT_BY_ID[item.agent_id];
            return (
              <Box key={item.id} sx={{ mt: 0.75, p: 0.75, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.02)' }}>
                <Stack direction="row" alignItems="flex-start" spacing={0.75}>
                  <Avatar sx={{ width: 20, height: 20, fontSize: '0.7rem', bgcolor: meta?.color || 'grey.700' }}>
                    {meta?.emoji ?? '?'}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>{item.title}</Typography>
                    {item.body && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        {item.body}
                      </Typography>
                    )}
                    <Stack direction="row" spacing={0.25} sx={{ mt: 0.5 }}>
                      {item.url && (
                        <Tooltip title="Open"><IconButton size="small" sx={{ p: 0.25 }} onClick={() => handleOpen(item)}>
                          <OpenInNew sx={{ fontSize: 14 }} />
                        </IconButton></Tooltip>
                      )}
                      <Tooltip title="Done"><IconButton size="small" sx={{ p: 0.25 }} onClick={() => handleComplete(item)}>
                        <CheckCircleOutline sx={{ fontSize: 14 }} />
                      </IconButton></Tooltip>
                      <Tooltip title="Dismiss"><IconButton size="small" sx={{ p: 0.25 }} onClick={() => handleDismiss(item)}>
                        <Close sx={{ fontSize: 14 }} />
                      </IconButton></Tooltip>
                    </Stack>
                  </Box>
                </Stack>
              </Box>
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );
}

// ─── Quick links (same curated set as the new-tab page) ──────────────────────

function LinksCard({ links, loading, onChange }: { links: CockpitLink[]; loading: boolean; onChange: (l: CockpitLink[]) => void }) {
  const [editor, setEditor] = useState<{ mode: 'add' } | { mode: 'edit'; link: CockpitLink } | null>(null);

  if (loading) return <Skeleton variant="rounded" height={120} />;

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
      <CardContent sx={{ '&:last-child': { pb: 1.5 }, py: 1.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <LinkIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>Quick links</Typography>
          </Stack>
          <Button size="small" startIcon={<Add sx={{ fontSize: 14 }} />} onClick={() => setEditor({ mode: 'add' })} sx={{ minHeight: 0, py: 0.25, fontSize: '0.7rem' }}>
            Add
          </Button>
        </Stack>

        {links.length === 0 ? (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
            No links yet. Add them on the new-tab page.
          </Typography>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0.75 }}>
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
      onClick={() => chrome.tabs.create({ url: link.url })}
      sx={{
        position: 'relative',
        p: 1, borderRadius: 1.5,
        bgcolor: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'all 0.15s',
        '&:hover': {
          bgcolor: 'rgba(91,141,239,0.12)',
          borderColor: 'rgba(91,141,239,0.4)',
          '& .link-actions': { opacity: 1 },
        },
      }}
    >
      <Box sx={{ fontSize: '1.25rem', lineHeight: 1, mb: 0.5 }}>
        {link.emoji ? (
          <span>{link.emoji}</span>
        ) : (
          <img src={favicon} alt="" width={20} height={20} style={{ borderRadius: 4, verticalAlign: 'middle' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        )}
      </Box>
      <Typography variant="caption" sx={{ fontWeight: 600, lineHeight: 1.2, display: 'block' }} noWrap>
        {link.title}
      </Typography>
      <Box className="link-actions" sx={{ position: 'absolute', top: 2, right: 2, display: 'flex', gap: 0.25, opacity: 0, transition: 'opacity 0.15s' }}>
        <Tooltip title="Edit">
          <IconButton size="small" sx={{ p: 0.2 }} onClick={(e) => { e.stopPropagation(); onEdit(); }}>
            <Edit sx={{ fontSize: 12 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" sx={{ p: 0.2 }} onClick={(e) => { e.stopPropagation(); onDelete(); }}>
            <Delete sx={{ fontSize: 12 }} />
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
          <TextField autoFocus size="small" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
          <TextField size="small" label="URL" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} fullWidth />
          <TextField size="small" label="Emoji (optional)" placeholder="🐙" value={emoji} onChange={(e) => setEmoji(e.target.value)} inputProps={{ maxLength: 4 }} sx={{ width: 140 }} />
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
