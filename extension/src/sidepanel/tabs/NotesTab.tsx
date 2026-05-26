import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Box, Stack, Typography, IconButton, TextField, InputBase, Chip, Tooltip, Card,
} from '@mui/material';
import {
  Add as AddIcon, Search as SearchIcon, PushPin, PushPinOutlined,
  DeleteOutline, ArrowBack,
} from '@mui/icons-material';
import {
  Note, fetchNotes, createNote, updateNote, archiveNote, noteTitle,
} from '../../lib/queries';

// Single side-panel tab — narrow layout: switches between list and editor.
export function NotesTab() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setNotes(await fetchNotes());
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const filtered = useMemo(() => {
    if (!query.trim()) return notes;
    const q = query.toLowerCase();
    return notes.filter((n) =>
      noteTitle(n).toLowerCase().includes(q) ||
      n.body.toLowerCase().includes(q)
    );
  }, [notes, query]);

  const selected = notes.find((n) => n.id === selectedId) ?? null;

  const handleNew = async () => {
    const n = await createNote({ body: '' });
    if (n) {
      setNotes((prev) => [n, ...prev]);
      setSelectedId(n.id);
    }
  };

  const handleUpdate = async (id: string, patch: Partial<Note>) => {
    setNotes((prev) => prev.map((n) => n.id === id ? { ...n, ...patch } : n));
    await updateNote(id, patch);
  };

  const handleArchive = async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setSelectedId(null);
    await archiveNote(id);
  };

  if (selected) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" alignItems="center" sx={{ px: 1, py: 0.75, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <IconButton size="small" onClick={() => setSelectedId(null)}><ArrowBack sx={{ fontSize: 18 }} /></IconButton>
          <Box sx={{ flex: 1 }} />
          <Tooltip title={selected.pinned ? 'Unpin' : 'Pin'}>
            <IconButton size="small" onClick={() => handleUpdate(selected.id, { pinned: !selected.pinned })}>
              {selected.pinned
                ? <PushPin sx={{ fontSize: 16, color: 'warning.main' }} />
                : <PushPinOutlined sx={{ fontSize: 16 }} />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Archive">
            <IconButton size="small" onClick={() => { if (confirm('Archive this note?')) handleArchive(selected.id); }}>
              <DeleteOutline sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Stack>
        <NoteEditor note={selected} onUpdate={handleUpdate} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2, px: 1, flex: 1 }}>
          <SearchIcon sx={{ fontSize: 14, color: 'text.secondary', mr: 0.5 }} />
          <InputBase size="small" placeholder="Search notes" value={query} onChange={(e) => setQuery(e.target.value)} sx={{ flex: 1, fontSize: '0.8rem' }} />
        </Box>
        <Tooltip title="New note">
          <IconButton size="small" onClick={handleNew} sx={{ color: 'primary.main' }}>
            <AddIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
      </Stack>

      {loading ? (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>Loading…</Typography>
      ) : filtered.length === 0 ? (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {query ? 'No matches.' : 'No notes yet. Click + to start.'}
        </Typography>
      ) : (
        <Stack spacing={0.5}>
          {filtered.map((n) => (
            <Box
              key={n.id}
              onClick={() => setSelectedId(n.id)}
              sx={{
                p: 1, borderRadius: 1.5,
                cursor: 'pointer',
                bgcolor: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
                '&:hover': { bgcolor: 'rgba(91,141,239,0.12)', borderColor: 'rgba(91,141,239,0.3)' },
              }}
            >
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.25 }}>
                {n.pinned && <PushPin sx={{ fontSize: 11, color: 'warning.main' }} />}
                <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, minWidth: 0 }} noWrap>
                  {noteTitle(n)}
                </Typography>
                {n.author_kind === 'agent' && n.author_agent && (
                  <Chip label={n.author_agent} size="small" sx={{ height: 14, fontSize: '0.55rem' }} />
                )}
              </Stack>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {n.body || ' '}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}

// ─── Editor ──────────────────────────────────────────────────────────────────

function NoteEditor({ note, onUpdate }: { note: Note; onUpdate: (id: string, patch: Partial<Note>) => void }) {
  const [body, setBody] = useState(note.body);
  const noteIdRef = useRef(note.id);
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (note.id !== noteIdRef.current) {
      setBody(note.body);
      noteIdRef.current = note.id;
      dirtyRef.current = false;
    }
  }, [note.id, note.body]);

  useEffect(() => {
    if (!dirtyRef.current) return;
    const id = setTimeout(() => {
      onUpdate(note.id, { body });
      dirtyRef.current = false;
    }, 600);
    return () => clearTimeout(id);
  }, [body, note.id, onUpdate]);

  return (
    <TextField
      multiline
      fullWidth
      autoFocus
      value={body}
      onChange={(e) => { dirtyRef.current = true; setBody(e.target.value); }}
      placeholder="Write…"
      variant="standard"
      InputProps={{ disableUnderline: true, style: { fontSize: '0.9rem', lineHeight: 1.55, padding: 12 } }}
      sx={{ flex: 1, p: 0 }}
    />
  );
}
