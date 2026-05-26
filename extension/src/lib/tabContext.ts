// Tab context utilities — what page is the user on, what did they select.

export interface TabContext {
  url: string;
  title: string;
  selection: string;
  favicon?: string;
}

// Side panel runs in its own tab context, NOT the page's. Use chrome.tabs to find
// the active tab in the currently focused window.
export async function getActiveTabContext(): Promise<TabContext | null> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab || !tab.id || !tab.url) return null;
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      return { url: tab.url, title: tab.title || '', selection: '', favicon: tab.favIconUrl };
    }
    // Try to grab the current selection via scripting.executeScript.
    let selection = '';
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection()?.toString() ?? '',
      });
      selection = results[0]?.result ?? '';
    } catch {
      // Some pages disallow scripting (chrome:// URLs, the web store, etc.).
    }
    return {
      url: tab.url,
      title: tab.title || '',
      selection,
      favicon: tab.favIconUrl,
    };
  } catch (e) {
    console.warn('[dyno cockpit] getActiveTabContext failed', e);
    return null;
  }
}

export function hostnameOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}
