import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Stack, Typography, IconButton, InputBase, TextField, Card,
  Chip, useMediaQuery, useTheme, Tooltip,
} from '@mui/material';
import {
  Add as AddIcon, Search as SearchIcon, PushPin, PushPinOutlined,
  DeleteOutline, ArrowBack,
} from '@mui/icons-material';
import { useNotes, Note, noteTitle, noteSnippet } from '../hooks/useNotes';
import { formatDistanceToNow } from 'date-fns';

const NotesPage: React.FC = () => {
  const { data: notes, loading, create, update, archive } = useNotes();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Filtered + sorted (pinned first already from hook).
  const filtered = useMemo(() => {
    if (!query.trim()) return notes;
    const q = query.toLowerCase();
    return notes.filter((n) =>
      noteTitle(n).toLowerCase().includes(q) ||
      n.body.toLowerCase().includes(q) ||
      n.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [notes, query]);

  // Auto-select first note when list loads (desktop only).
  useEffect(() => {
    if (!isMobile && !selectedId && filtered.length > 0) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId, isMobile]);

  const selected = notes.find((n) => n.id === selectedId) ?? null;

  const handleNew = async () => {
    const n = await create({ body: '' });
    if (n) setSelectedId(n.id);
  };

  // Mobile: show list OR editor (not both).
  if (isMobile) {
    if (selected) {
      return (
        <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
          <Stack direction="row" alignItems="center" sx={{ px: 1, py: 1, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <IconButton onClick={() => setSelectedId(null)}><ArrowBack /></IconButton>
            <Box sx={{ flex: 1 }} />
            <NoteHeaderActions note={selected} onUpdate={update} onArchive={(id) => { archive(id); setSelectedId(null); }} />
          </Stack>
          <NoteEditor note={selected} onUpdate={update} />
        </Box>
      );
    }
    return (
      <Box sx={{ p: 2 }}>
        <NotesHeader query={query} setQuery={setQuery} onNew={handleNew} />
        <NotesList notes={filtered} loading={loading} selectedId={null} onSelect={setSelectedId} />
      </Box>
    );
  }

  // Desktop: two columns.
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 2, height: 'calc(100vh - 96px)' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <NotesHeader query={query} setQuery={setQuery} onNew={handleNew} />
        <Box sx={{ flex: 1, overflowY: 'auto', mt: 1 }}>
          <NotesList notes={filtered} loading={loading} selectedId={selectedId} onSelect={setSelectedId} />
        </Box>
      </Box>
      <Card sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, p: 2 }}>
        {selected ? (
          <>
            <Stack direction="row" alignItems="center" justifyContent="flex-end" sx={{ mb: 1 }}>
              <NoteHeaderActions note={selected} onUpdate={update} onArchive={(id) => { archive(id); setSelectedId(null); }} />
            </Stack>
            <NoteEditor note={selected} onUpdate={update} />
          </>
        ) : (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No note selected. Click + to start.
            </Typography>
          </Box>
        )}
      </Card>
    </Box>
  );
};

// ─── Header / search ─────────────────────────────────────────────────────────

const NotesHeader: React.FC<{ query: string; setQuery: (v: string) => void; onNew: () => void }> = ({ query, setQuery, onNew }) => (
  <Stack direction="row" alignItems="center" spacing={1}>
    <Typography variant="h5" sx={{ fontWeight: 700, flex: 1 }}>Notes</Typography>
    <Box sx={{
      display: 'flex', alignItems: 'center',
      bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2, px: 1, flex: 1,
      maxWidth: 240,
    }}>
      <SearchIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
      <InputBase
        size="small"
        placeholder="Search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ flex: 1, fontSize: '0.85rem' }}
      />
    </Box>
    <Tooltip title="New note">
      <IconButton onClick={onNew} sx={{ color: 'primary.main' }}>
        <AddIcon />
      </IconButton>
    </Tooltip>
  </Stack>
);

// ─── List ────────────────────────────────────────────────────────────────────

const NotesList: React.FC<{ notes: Note[]; loading: boolean; selectedId: string | null; onSelect: (id: string) => void }> = ({ notes, loading, selectedId, onSelect }) => {
  if (loading) return <Typography variant="body2" sx={{ color: 'text.secondary', p: 2 }}>Loading…</Typography>;
  if (notes.length === 0) return <Typography variant="body2" sx={{ color: 'text.secondary', p: 2 }}>No notes yet.</Typography>;
  return (
    <Stack spacing={0.5}>
      {notes.map((n) => (
        <Box
          key={n.id}
          onClick={() => onSelect(n.id)}
          sx={{
            p: 1.25,
            borderRadius: 1.5,
            cursor: 'pointer',
            bgcolor: selectedId === n.id ? 'rgba(91,141,239,0.18)' : 'transparent',
            border: '1px solid',
            borderColor: selectedId === n.id ? 'rgba(91,141,239,0.4)' : 'transparent',
            '&:hover': { bgcolor: selectedId === n.id ? 'rgba(91,141,239,0.22)' : 'rgba(255,255,255,0.03)' },
          }}
        >
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.25 }}>
            {n.pinned && <PushPin sx={{ fontSize: 12, color: 'warning.main' }} />}
            <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, minWidth: 0 }} noWrap>
              {noteTitle(n)}
            </Typography>
            {n.author_kind === 'agent' && n.author_agent && (
              <Chip label={n.author_agent} size="small" sx={{ height: 16, fontSize: '0.6rem' }} />
            )}
          </Stack>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.25 }} noWrap>
            {noteSnippet(n) || ' '}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>
            {formatDistanceToNow(new Date(n.updated_at), { addSuffix: true })}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
};

// ─── Editor ──────────────────────────────────────────────────────────────────

const NoteEditor: React.FC<{ note: Note; onUpdate: (id: string, patch: Partial<Note>) => void }> = ({ note, onUpdate }) => {
  const [body, setBody] = useState(note.body);
  const noteIdRef = useRef(note.id);
  const dirtyRef = useRef(false);

  // When the selected note changes, reset local state from the new note.
  useEffect(() => {
    if (note.id !== noteIdRef.current) {
      setBody(note.body);
      noteIdRef.current = note.id;
      dirtyRef.current = false;
    }
  }, [note.id, note.body]);

  // Debounced save — 600ms after typing stops.
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
      InputProps={{ disableUnderline: true, style: { fontSize: '0.95rem', lineHeight: 1.55 } }}
      sx={{ flex: 1, '& textarea': { fontFamily: 'inherit' } }}
    />
  );
};

const NoteHeaderActions: React.FC<{ note: Note; onUpdate: (id: string, patch: Partial<Note>) => void; onArchive: (id: string) => void }> = ({ note, onUpdate, onArchive }) => (
  <Stack direction="row" spacing={0.5}>
    <Tooltip title={note.pinned ? 'Unpin' : 'Pin'}>
      <IconButton size="small" onClick={() => onUpdate(note.id, { pinned: !note.pinned })}>
        {note.pinned ? <PushPin sx={{ fontSize: 18, color: 'warning.main' }} /> : <PushPinOutlined sx={{ fontSize: 18 }} />}
      </IconButton>
    </Tooltip>
    <Tooltip title="Archive">
      <IconButton size="small" onClick={() => { if (window.confirm('Archive this note?')) onArchive(note.id); }}>
        <DeleteOutline sx={{ fontSize: 18 }} />
      </IconButton>
    </Tooltip>
  </Stack>
);

export default NotesPage;
