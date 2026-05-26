import { useCallback, useEffect, useState } from 'react';
import { supabase, USER_ID } from '../lib/supabase';

export interface Note {
  id: string;
  title: string | null;
  body: string;
  tags: string[];
  pinned: boolean;
  author_kind: 'user' | 'agent';
  author_agent: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

// Infer a display title from the body if no explicit title is set.
export function noteTitle(n: Note): string {
  if (n.title && n.title.trim()) return n.title.trim();
  const firstLine = n.body.split('\n').find((l) => l.trim());
  if (firstLine) return firstLine.replace(/^#+\s*/, '').slice(0, 80);
  return 'Untitled';
}

export function noteSnippet(n: Note, maxLen = 140): string {
  const body = n.body.split('\n').slice(1).join(' ').trim();
  if (body) return body.length > maxLen ? body.slice(0, maxLen) + '…' : body;
  return '';
}

interface UseNotesOpts {
  includeArchived?: boolean;
  limit?: number;
}

export function useNotes(opts: UseNotesOpts = {}) {
  const { includeArchived = false, limit = 500 } = opts;
  const [data, setData] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let q = supabase
        .from('notes')
        .select('*')
        .eq('user_id', USER_ID)
        .order('pinned', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(limit);
      if (!includeArchived) q = q.is('archived_at', null);
      const { data: rows, error: err } = await q;
      if (err) throw err;
      setData((rows as Note[]) || []);
    } catch (e: any) {
      setError(e.message ?? 'Failed to fetch notes');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [includeArchived, limit]);

  useEffect(() => { refetch(); }, [refetch]);

  const create = useCallback(async (patch: Partial<Note> = {}): Promise<Note | null> => {
    const { data: row, error: err } = await supabase
      .from('notes')
      .insert({
        user_id: USER_ID,
        title: patch.title ?? null,
        body: patch.body ?? '',
        tags: patch.tags ?? [],
        pinned: patch.pinned ?? false,
      })
      .select()
      .single();
    if (err) { console.warn('notes.create', err.message); return null; }
    await refetch();
    return row as Note;
  }, [refetch]);

  const update = useCallback(async (id: string, patch: Partial<Pick<Note, 'title' | 'body' | 'tags' | 'pinned'>>) => {
    const { error: err } = await supabase
      .from('notes')
      .update(patch)
      .eq('id', id)
      .eq('user_id', USER_ID);
    if (err) console.warn('notes.update', err.message);
    // Optimistic local merge.
    setData((prev) => prev.map((n) => n.id === id ? { ...n, ...patch } as Note : n));
  }, []);

  const archive = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from('notes')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', USER_ID);
    if (err) console.warn('notes.archive', err.message);
    setData((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return { data, loading, error, refetch, create, update, archive };
}
