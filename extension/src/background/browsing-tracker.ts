// Lightweight browsing tracker that lives in the service worker.
//
// What it does:
//   - Listens for tab activation / focus / URL change.
//   - For each "active tab session", accumulates dwell time per URL.
//   - Stores everything in chrome.storage.local under DAY_KEY.
//   - At the start of each new day (or on first activity of the day), flushes the
//     previous day into the browsing_summaries Supabase table.
//
// Privacy-respecting bits:
//   - chrome://, chrome-extension://, extension dashboard, etc. are ignored.
//   - Only meaningful dwells (≥3s) are recorded.
//   - Tracker can be flipped off entirely via chrome.storage.local.tracking_enabled = false.

import { getSupabase } from '../lib/supabase';

const DAY_KEY = 'dyno-browsing-day';
const TRACK_ENABLED_KEY = 'tracking_enabled';
const MIN_DWELL_MS = 3000;

interface DayState {
  date: string;                              // YYYY-MM-DD (local)
  domainSeconds: Record<string, number>;
  pages: Array<{ url: string; title: string; seconds: number; opened_at: string }>;
}

interface ActiveSession {
  tabId: number;
  url: string;
  title: string;
  startedAt: number;
}

let active: ActiveSession | null = null;

function todayLocalISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function hostOf(u: string): string {
  try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; }
}

function isIgnorableUrl(u: string): boolean {
  if (!u) return true;
  if (u.startsWith('chrome://')) return true;
  if (u.startsWith('chrome-extension://')) return true;
  if (u.startsWith('about:')) return true;
  if (u.startsWith('edge://')) return true;
  return false;
}

async function isTrackingEnabled(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.local.get([TRACK_ENABLED_KEY], (data) => {
      // Default ON if never set.
      resolve(data[TRACK_ENABLED_KEY] !== false);
    });
  });
}

async function loadDayState(): Promise<DayState> {
  return new Promise((resolve) => {
    chrome.storage.local.get([DAY_KEY], (data) => {
      const today = todayLocalISO();
      if (!data[DAY_KEY] || data[DAY_KEY].date !== today) {
        resolve({ date: today, domainSeconds: {}, pages: [] });
      } else {
        resolve(data[DAY_KEY]);
      }
    });
  });
}

async function saveDayState(state: DayState): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [DAY_KEY]: state }, () => resolve());
  });
}

async function flushActiveDwell(): Promise<void> {
  if (!active) return;
  const dwellMs = Date.now() - active.startedAt;
  if (dwellMs < MIN_DWELL_MS) { active = null; return; }
  const seconds = Math.round(dwellMs / 1000);
  const host = hostOf(active.url);

  const state = await loadDayState();
  if (host) state.domainSeconds[host] = (state.domainSeconds[host] ?? 0) + seconds;

  // Merge into pages — if last entry was same URL, just extend it; otherwise push new.
  const last = state.pages[state.pages.length - 1];
  if (last && last.url === active.url) {
    last.seconds += seconds;
  } else {
    state.pages.push({
      url: active.url,
      title: active.title,
      seconds,
      opened_at: new Date(active.startedAt).toISOString(),
    });
    // Cap retained pages so storage doesn't grow unbounded.
    if (state.pages.length > 500) state.pages = state.pages.slice(-500);
  }
  await saveDayState(state);
  active = null;
}

async function setActiveFromTab(tab: chrome.tabs.Tab) {
  await flushActiveDwell();
  if (!tab || !tab.url || isIgnorableUrl(tab.url)) return;
  if (!tab.id) return;
  active = { tabId: tab.id, url: tab.url, title: tab.title || '', startedAt: Date.now() };
}

async function refreshActive() {
  if (!(await isTrackingEnabled())) { active = null; return; }
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab) await setActiveFromTab(tab);
  } catch {}
}

// ─── Upload yesterday ────────────────────────────────────────────────────────

async function maybeUploadYesterday() {
  // If the stored day is not today, flush it to Supabase and clear.
  return new Promise<void>((resolve) => {
    chrome.storage.local.get([DAY_KEY], async (data) => {
      const stored: DayState | undefined = data[DAY_KEY];
      const today = todayLocalISO();
      if (!stored || stored.date === today) { resolve(); return; }
      try {
        const supa = getSupabase();
        const { data: userData } = await supa.auth.getUser();
        if (!userData.user) { resolve(); return; }

        // Build a quick headline + themes from top domains (no LLM needed for v1 — keep it free).
        const topDomains = Object.entries(stored.domainSeconds)
          .sort(([, a], [, b]) => b - a).slice(0, 5).map(([d]) => d);
        const totalMin = Math.round(
          Object.values(stored.domainSeconds).reduce((a, b) => a + b, 0) / 60
        );
        const headline = topDomains.length
          ? `${totalMin}m across ${Object.keys(stored.domainSeconds).length} sites · top: ${topDomains.join(', ')}`
          : `Light browsing day`;

        await supa.from('browsing_summaries').upsert({
          user_id: userData.user.id,
          for_date: stored.date,
          themes: topDomains,            // simple v1: just the top domains
          headline,
          domain_seconds: stored.domainSeconds,
          pages: stored.pages,
        }, { onConflict: 'user_id,for_date' });

        // Clear yesterday and start fresh today.
        await saveDayState({ date: today, domainSeconds: {}, pages: [] });
        console.log('[dyno cockpit] uploaded browsing summary for', stored.date);
      } catch (e) {
        console.warn('[dyno cockpit] browsing summary upload failed', e);
      }
      resolve();
    });
  });
}

// ─── Wire up listeners ────────────────────────────────────────────────────────

export function installBrowsingTracker() {
  chrome.tabs.onActivated.addListener(async ({ tabId }) => {
    if (!(await isTrackingEnabled())) return;
    try {
      const tab = await chrome.tabs.get(tabId);
      await setActiveFromTab(tab);
    } catch {}
  });

  chrome.tabs.onUpdated.addListener(async (_tabId, info, tab) => {
    if (!(await isTrackingEnabled())) return;
    if (info.status !== 'complete' && !info.url) return;
    if (tab.active) await setActiveFromTab(tab);
  });

  chrome.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      await flushActiveDwell();
      return;
    }
    await refreshActive();
  });

  chrome.idle.onStateChanged.addListener(async (state) => {
    if (state !== 'active') await flushActiveDwell();
    else await refreshActive();
  });
  try { chrome.idle.setDetectionInterval(60); } catch {}

  // Run a check at boot + on alarm — uploads previous day if it's now a new day.
  chrome.alarms.create('dyno-browsing-flush', { periodInMinutes: 30 });
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== 'dyno-browsing-flush') return;
    await flushActiveDwell();
    await maybeUploadYesterday();
  });

  // Initial pass.
  (async () => {
    await maybeUploadYesterday();
    await refreshActive();
  })();
}
