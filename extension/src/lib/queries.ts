import { getSupabase } from './supabase';
import type { Briefing, Task, Observation, MealRow } from './types';

// ─── Focus sessions ───────────────────────────────────────────────────────────

export interface FocusSession {
  id: string;
  title: string;
  description: string | null;
  started_at: string;
  ended_at: string | null;
  notes: any[];
}

export async function fetchActiveFocus(): Promise<FocusSession | null> {
  const { data, error } = await getSupabase()
    .from('focus_sessions')
    .select('*')
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) { console.warn('[dyno cockpit] fetchActiveFocus', error.message); return null; }
  return data as FocusSession | null;
}

export async function startFocus(title: string, description?: string): Promise<FocusSession | null> {
  // End any existing active session first.
  const supa = getSupabase();
  const { data: userData } = await supa.auth.getUser();
  if (!userData.user) return null;
  await supa.from('focus_sessions')
    .update({ ended_at: new Date().toISOString() })
    .is('ended_at', null)
    .eq('user_id', userData.user.id);
  const { data, error } = await supa.from('focus_sessions')
    .insert({ user_id: userData.user.id, title, description: description ?? null })
    .select()
    .single();
  if (error) { console.warn('[dyno cockpit] startFocus', error.message); return null; }
  return data as FocusSession;
}

export async function endFocus(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from('focus_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', id);
  if (error) console.warn('[dyno cockpit] endFocus', error.message);
}

// ─── Captures ─────────────────────────────────────────────────────────────────

export interface CreateCaptureArgs {
  content: string;
  ask?: string;
  page_url?: string;
  page_title?: string;
  page_selection?: string;
  page_metadata?: Record<string, any>;
  source?: 'capture-box' | 'selection-bar' | 'omnibox' | 'context-menu' | 'site-suggestion';
  focus_session_id?: string | null;
  forced_agent?: string | null;
}

export async function createCapture(args: CreateCaptureArgs): Promise<{ ok: boolean; error?: string }> {
  const supa = getSupabase();
  const { data: userData } = await supa.auth.getUser();
  if (!userData.user) return { ok: false, error: 'Not authenticated' };
  const { error } = await supa.from('captures').insert({
    user_id: userData.user.id,
    content: args.content,
    ask: args.ask ?? null,
    page_url: args.page_url ?? null,
    page_title: args.page_title ?? null,
    page_selection: args.page_selection ?? null,
    page_metadata: args.page_metadata ?? {},
    source: args.source ?? 'capture-box',
    focus_session_id: args.focus_session_id ?? null,
    forced_agent: args.forced_agent ?? null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ─── Agent queue ──────────────────────────────────────────────────────────────

export interface QueueItem {
  id: string;
  agent_id: string;
  title: string;
  body: string | null;
  url: string | null;
  metadata: Record<string, any>;
  status: 'pending' | 'opened' | 'completed' | 'dismissed';
  created_at: string;
}

export async function fetchQueue(): Promise<QueueItem[]> {
  const { data, error } = await getSupabase()
    .from('agent_queue')
    .select('id, agent_id, title, body, url, metadata, status, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) { console.warn('[dyno cockpit] fetchQueue', error.message); return []; }
  return (data as QueueItem[]) ?? [];
}

export async function markQueueItem(id: string, status: 'opened' | 'completed' | 'dismissed'): Promise<void> {
  const updates: Record<string, any> = { status };
  if (status === 'opened') updates.opened_at = new Date().toISOString();
  if (status === 'completed') updates.completed_at = new Date().toISOString();
  if (status === 'dismissed') updates.dismissed_at = new Date().toISOString();
  const { error } = await getSupabase().from('agent_queue').update(updates).eq('id', id);
  if (error) console.warn('[dyno cockpit] markQueueItem', error.message);
}

// ─── Cockpit quick links ──────────────────────────────────────────────────────

export interface CockpitLink {
  id: string;
  title: string;
  url: string;
  emoji: string | null;
  sort_order: number;
}

export async function fetchLinks(): Promise<CockpitLink[]> {
  const { data, error } = await getSupabase()
    .from('cockpit_links')
    .select('id, title, url, emoji, sort_order')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) { console.warn('[dyno cockpit] fetchLinks', error.message); return []; }
  return (data as CockpitLink[]) ?? [];
}

export async function createLink(args: { title: string; url: string; emoji?: string }): Promise<CockpitLink | null> {
  const supa = getSupabase();
  const { data: userData } = await supa.auth.getUser();
  if (!userData.user) return null;
  // Place at end by default.
  const { data: existing } = await supa
    .from('cockpit_links')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);
  const nextOrder = ((existing?.[0]?.sort_order as number | undefined) ?? 0) + 1;
  const { data, error } = await supa.from('cockpit_links').insert({
    user_id: userData.user.id,
    title: args.title,
    url: args.url,
    emoji: args.emoji ?? null,
    sort_order: nextOrder,
  }).select().single();
  if (error) { console.warn('[dyno cockpit] createLink', error.message); return null; }
  return data as CockpitLink;
}

export async function updateLink(id: string, patch: Partial<{ title: string; url: string; emoji: string | null; sort_order: number }>): Promise<void> {
  const { error } = await getSupabase().from('cockpit_links').update(patch).eq('id', id);
  if (error) console.warn('[dyno cockpit] updateLink', error.message);
}

export async function deleteLink(id: string): Promise<void> {
  const { error } = await getSupabase().from('cockpit_links').delete().eq('id', id);
  if (error) console.warn('[dyno cockpit] deleteLink', error.message);
}

// ─── Notes ────────────────────────────────────────────────────────────────────

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

export function noteTitle(n: Note): string {
  if (n.title && n.title.trim()) return n.title.trim();
  const firstLine = n.body.split('\n').find((l) => l.trim());
  if (firstLine) return firstLine.replace(/^#+\s*/, '').slice(0, 80);
  return 'Untitled';
}

export async function fetchNotes(limit = 200): Promise<Note[]> {
  const { data, error } = await getSupabase()
    .from('notes')
    .select('*')
    .is('archived_at', null)
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) { console.warn('[dyno cockpit] fetchNotes', error.message); return []; }
  return (data as Note[]) ?? [];
}

export async function createNote(patch: Partial<Pick<Note, 'title' | 'body' | 'tags' | 'pinned'>> = {}): Promise<Note | null> {
  const supa = getSupabase();
  const { data: userData } = await supa.auth.getUser();
  if (!userData.user) return null;
  const { data, error } = await supa.from('notes').insert({
    user_id: userData.user.id,
    title: patch.title ?? null,
    body: patch.body ?? '',
    tags: patch.tags ?? [],
    pinned: patch.pinned ?? false,
  }).select().single();
  if (error) { console.warn('[dyno cockpit] createNote', error.message); return null; }
  return data as Note;
}

export async function updateNote(id: string, patch: Partial<Pick<Note, 'title' | 'body' | 'tags' | 'pinned'>>): Promise<void> {
  const { error } = await getSupabase().from('notes').update(patch).eq('id', id);
  if (error) console.warn('[dyno cockpit] updateNote', error.message);
}

export async function archiveNote(id: string): Promise<void> {
  const { error } = await getSupabase().from('notes')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id);
  if (error) console.warn('[dyno cockpit] archiveNote', error.message);
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export async function fetchLatestBriefing(): Promise<Briefing | null> {
  const { data, error } = await getSupabase()
    .from('agent_briefings')
    .select('*')
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn('[dyno cockpit] fetchLatestBriefing', error.message);
    return null;
  }
  return data as Briefing | null;
}

export async function fetchPendingTasks(): Promise<Task[]> {
  const { data, error } = await getSupabase()
    .from('tasks')
    .select('*')
    .eq('status', 'pending')
    .order('priority', { ascending: true })
    .order('due_date', { ascending: true, nullsFirst: false });
  if (error) {
    console.warn('[dyno cockpit] fetchPendingTasks', error.message);
    return [];
  }
  return (data as Task[]) ?? [];
}

export async function completeTask(id: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await getSupabase()
    .from('tasks')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function fetchLatestObservation(): Promise<Observation | null> {
  const { data, error } = await getSupabase()
    .from('agent_observations')
    .select('id, agent_id, kind, severity, title, body, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn('[dyno cockpit] fetchLatestObservation', error.message);
    return null;
  }
  return data as Observation | null;
}

export async function fetchTodaysMeals(): Promise<MealRow[]> {
  const { data, error } = await getSupabase()
    .from('meals')
    .select('id, date, calories, protein_g, carbs_g, fat_g')
    .eq('date', todayISO());
  if (error) {
    console.warn('[dyno cockpit] fetchTodaysMeals', error.message);
    return [];
  }
  return (data as MealRow[]) ?? [];
}
