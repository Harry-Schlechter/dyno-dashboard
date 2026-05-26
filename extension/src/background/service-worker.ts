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
