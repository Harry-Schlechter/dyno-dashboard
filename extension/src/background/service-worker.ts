// Dyno Cockpit service worker.
// Responsibilities:
//   - Open side panel on action-icon click.
//   - Receive captures from content scripts (selection bar, site suggester).
//   - Handle omnibox 'dyno <text>' input → capture.
//   - Drive the browsing-summary tracker.

import { getSupabase } from '../lib/supabase';
import { createCapture, fetchActiveFocus } from '../lib/queries';
import { installBrowsingTracker } from './browsing-tracker';

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err) => console.warn('[dyno cockpit] sidePanel.setPanelBehavior failed', err));
  ensureSessionRefreshAlarm();
  refreshSessionSilently();
});

// ─── Session keepalive ────────────────────────────────────────────────────────
// Manifest V3 service workers are killed after ~30s idle. Supabase's
// autoRefreshToken interval dies with the worker, so we can't rely on it. An
// alarm wakes the SW every 25 min to refresh the access token (TTL is 60 min).
// Refresh token lives in chrome.storage.local with a 60-day TTL, so as long as
// this fires once per ~50 days the pairing stays valid indefinitely.

const SESSION_REFRESH_ALARM = 'dyno-session-refresh';
const SESSION_REFRESH_PERIOD_MIN = 25;

async function ensureSessionRefreshAlarm() {
  const existing = await chrome.alarms.get(SESSION_REFRESH_ALARM);
  if (!existing) {
    chrome.alarms.create(SESSION_REFRESH_ALARM, {
      periodInMinutes: SESSION_REFRESH_PERIOD_MIN,
      delayInMinutes: 1, // first refresh shortly after install/startup
    });
  }
}

async function refreshSessionSilently(): Promise<{ ok: boolean; reason?: string }> {
  try {
    const supa = getSupabase();
    const { data, error } = await supa.auth.getSession();
    if (error) {
      console.warn('[dyno cockpit] getSession error:', error.message);
      return { ok: false, reason: error.message };
    }
    if (!data.session) {
      // No session at all — user needs to pair (first time, or refresh token wiped).
      await chrome.storage.local.set({ 'dyno-cockpit-unpaired': true });
      return { ok: false, reason: 'no-session' };
    }
    // getSession() returns a valid session and supabase-js will have already
    // refreshed if the access_token was close to expiring. Clear any prior
    // unpaired flag so the UI hides the re-pair prompt.
    await chrome.storage.local.remove('dyno-cockpit-unpaired');
    return { ok: true };
  } catch (e: any) {
    console.warn('[dyno cockpit] refresh threw:', e?.message ?? e);
    return { ok: false, reason: e?.message ?? 'unknown' };
  }
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SESSION_REFRESH_ALARM) refreshSessionSilently();
});

chrome.runtime.onStartup.addListener(() => {
  ensureSessionRefreshAlarm();
  refreshSessionSilently();
});

chrome.action.onClicked.addListener((tab) => {
  if (tab.windowId !== undefined) {
    chrome.sidePanel.open({ windowId: tab.windowId }).catch((err) => {
      console.warn('[dyno cockpit] sidePanel.open failed', err);
    });
  }
});

// ─── Capture entry points ─────────────────────────────────────────────────────

async function captureFromBackground(args: {
  content: string;
  ask?: string;
  url?: string;
  title?: string;
  selection?: string;
  forcedAgent?: string | null;
  source: 'selection-bar' | 'omnibox' | 'context-menu' | 'site-suggestion';
}): Promise<{ ok: boolean; error?: string }> {
  // Sanity-check we're paired.
  const supa = getSupabase();
  const { data: userData } = await supa.auth.getUser();
  if (!userData.user) return { ok: false, error: 'not paired' };

  const focus = await fetchActiveFocus();
  return createCapture({
    content: args.content,
    ask: args.ask,
    page_url: args.url,
    page_title: args.title,
    page_selection: args.selection,
    source: args.source,
    focus_session_id: focus?.id ?? null,
    forced_agent: args.forcedAgent ?? null,
  });
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'selection-capture') {
    captureFromBackground({
      content: msg.selection,
      url: msg.url,
      title: msg.title,
      selection: msg.selection,
      forcedAgent: msg.forcedAgent,
      source: 'selection-bar',
    }).then(sendResponse);
    return true; // keep channel open
  }
  if (msg?.type === 'site-suggestion') {
    captureFromBackground({
      content: msg.content,
      url: msg.url,
      title: msg.title,
      forcedAgent: msg.forcedAgent,
      source: 'site-suggestion',
    }).then(sendResponse);
    return true;
  }
  if (msg?.type === 'refresh-session') {
    refreshSessionSilently().then(sendResponse);
    return true;
  }
  return false;
});

// ─── Omnibox: type "dyno <something>" in the URL bar ─────────────────────────

chrome.omnibox.onInputEntered.addListener(async (text) => {
  const trimmed = text.trim();
  if (!trimmed) return;
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    await captureFromBackground({
      content: trimmed,
      url: tab?.url,
      title: tab?.title,
      source: 'omnibox',
    });
  } catch (e) {
    console.warn('[dyno cockpit] omnibox capture failed', e);
  }
});

chrome.omnibox.setDefaultSuggestion?.({
  description: 'Capture to Dyno → routes to the right agent',
});

// ─── Browsing tracker ────────────────────────────────────────────────────────

installBrowsingTracker();
