import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

// chrome.storage.local-backed storage adapter for supabase-js.
// The default adapter is localStorage, which doesn't exist in service workers
// and isn't shared across extension surfaces. chrome.storage.local is shared
// between the side panel, options page, and service worker.

const chromeStorageAdapter = {
  getItem: (key: string): Promise<string | null> =>
    new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => resolve(result[key] ?? null));
    }),
  setItem: (key: string, value: string): Promise<void> =>
    new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => resolve());
    }),
  removeItem: (key: string): Promise<void> =>
    new Promise((resolve) => {
      chrome.storage.local.remove([key], () => resolve());
    }),
};

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: chromeStorageAdapter as any,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        storageKey: 'dyno-cockpit-auth',
      },
    });
  }
  return client;
}

// Convenience getter for current session — returns null if not signed in.
export async function getCurrentSession(): Promise<Session | null> {
  const { data } = await getSupabase().auth.getSession();
  return data.session;
}

// Manually inject a session that we got from a pairing-code redemption.
// supabase-js will then handle refresh from there.
export async function setSessionFromPairing(payload: {
  access_token: string;
  refresh_token: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await getSupabase().auth.setSession({
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
