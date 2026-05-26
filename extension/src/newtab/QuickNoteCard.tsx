import { useEffect, useRef, useState } from 'react';
import { Box, Card, CardContent, Stack, Typography, IconButton, TextField, Tooltip, Button } from '@mui/material';
import { VisibilityOff, Visibility, OpenInNew, Add, StickyNote2 } from '@mui/icons-material';
import { getSupabase } from '../lib/supabase';
import { Note, fetchNotes, createNote, updateNote } from '../lib/queries';
import { DASHBOARD_URL } from '../lib/config';

const HIDE_KEY = 'cockpit-quicknote-hidden';
const QUICK_TAG = 'quick-note';

// Find the existing quick-note (tag includes 'quick-note') or null.
async function findQuickNote(): Promise<Note | null> {
  const supa = getSupabase();
  const { data, error } = await supa
    .from('notes')
    .select('*')
    .contains('tags', [QUICK_TAG])
    .is('archived_at', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data as Note | null;
}

export function QuickNoteCard() {
  const [note, setNote] = useState<Note | null>(null);
  const [body, setBody] = useState('');
  const [hidden, setHidden] = useState<boolean>(false);
  const [loaded, setLoaded] = useState(false);
  const dirtyRef = useRef(false);

  // Load hidden preference + the existing quick note.
  useEffect(() => {
    chrome.storage.local.get([HIDE_KEY], async (data) => {
      setHidden(!!data[HIDE_KEY]);
      const n = await findQuickNote();
      setNote(n);
      setBody(n?.body ?? '');
      setLoaded(true);
    });
  }, []);

  // Debounced auto-save. Creates the row on first non-empty edit.
  useEffect(() => {
    if (!dirtyRef.current) return;
    const id = setTimeout(async () => {
      dirtyRef.current = false;
      if (note) {
        await updateNote(note.id, { body });
        setNote((prev) => prev ? { ...prev, body, updated_at: new Date().toISOString() } : prev);
      } else if (body.trim()) {
        const fresh = await createNote({ body, tags: [QUICK_TAG] });
        if (fresh) setNote(fresh);
      }
    }, 600);
    return () => clearTimeout(id);
  }, [body, note]);

  const handleHide = () => {
    chrome.storage.local.set({ [HIDE_KEY]: true });
    setHidden(true);
  };
  const handleShow = () => {
    chrome.storage.local.set({ [HIDE_KEY]: false });
    setHidden(false);
  };

  if (!loaded) return null;

  // Hidden state — show a tiny button to bring it back.
  if (hidden) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, mb: 2 }}>
        <Button
          size="small"
          startIcon={<StickyNote2 sx={{ fontSize: 14 }} />}
          onClick={handleShow}
          sx={{ color: 'text.secondary', textTransform: 'none', fontSize: '0.75rem' }}
        >
          Show quick note
        </Button>
      </Box>
    );
  }

  return (
    <Card sx={{ mt: 2.5, mb: 2.5, '&:hover': { transform: 'none' } }}>
      <CardContent sx={{ '&:last-child': { pb: 2 }, py: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <StickyNote2 sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>Quick note</Typography>
            {note && (
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                · auto-saving
              </Typography>
            )}
          </Stack>
          <Stack direction="row" spacing={0.25}>
            <Tooltip title="Open in Notes">
              <IconButton size="small" onClick={() => window.open(`${DASHBOARD_URL}/notes`, '_blank')}>
                <OpenInNew sx={{ fontSize: 16, color: 'text.secondary' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Hide">
              <IconButton size="small" onClick={handleHide}>
                <VisibilityOff sx={{ fontSize: 16, color: 'text.secondary' }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
        <TextField
          multiline
          minRows={2}
          maxRows={10}
          fullWidth
          placeholder="Jot a thought, list, anything…"
          value={body}
          onChange={(e) => { dirtyRef.current = true; setBody(e.target.value); }}
          variant="standard"
          InputProps={{ disableUnderline: true, style: { fontSize: '0.95rem', lineHeight: 1.55 } }}
        />
      </CardContent>
    </Card>
  );
}
