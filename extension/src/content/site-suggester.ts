// Per-site smart-capture suggestions. On certain domains, surface a small floating
// Dyno button with a prefilled capture targeted at the right agent.
// Stays out of the way: appears bottom-right, dismissible per-site for the session.

interface SiteRule {
  hostMatch: RegExp;
  agent: string;
  emoji: string;
  prompt: () => string;        // What to write into the capture
  label: () => string;         // Button label
}

const RULES: SiteRule[] = [
  {
    hostMatch: /(^|\.)goodreads\.com$/,
    agent: 'personal-assistant',
    emoji: '📚',
    prompt: () => `Add to reading list: ${document.title}`,
    label: () => 'Add to reading list',
  },
  {
    hostMatch: /(^|\.)(yelp|opentable|resy)\.com$/,
    agent: 'travel-agent',
    emoji: '🍽',
    prompt: () => `Restaurant to try: ${document.title}`,
    label: () => 'Save restaurant',
  },
  {
    hostMatch: /(^|\.)(strava|garmin)\.com$/,
    agent: 'trainer',
    emoji: '🏃',
    prompt: () => `Log this workout: ${document.title}`,
    label: () => 'Log workout',
  },
  {
    hostMatch: /(^|\.)linkedin\.com$/,
    agent: 'career-coach',
    emoji: '💼',
    prompt: () => `LinkedIn: ${document.title}`,
    label: () => 'Career note',
  },
  {
    hostMatch: /(^|\.)(amazon|amex|chase|capitalone)\.com$/,
    agent: 'financial-advisor',
    emoji: '💰',
    prompt: () => `Purchase / finance note: ${document.title}`,
    label: () => 'Log this',
  },
  {
    hostMatch: /(^|\.)(github)\.com$/,
    agent: 'builder',
    emoji: '🛠',
    prompt: () => `GitHub: ${document.title}`,
    label: () => 'Builder note',
  },
];

const BTN_ID = 'dyno-site-suggest';
const DISMISS_KEY = 'dyno-cockpit-dismissed-hosts';

function getHost(): string { return location.hostname.replace(/^www\./, ''); }

function getRule(): SiteRule | null {
  const host = getHost();
  return RULES.find((r) => r.hostMatch.test(host)) ?? null;
}

async function isDismissed(host: string): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.session.get([DISMISS_KEY], (data) => {
      const hosts: string[] = data[DISMISS_KEY] ?? [];
      resolve(hosts.includes(host));
    });
  });
}

async function dismissHost(host: string) {
  chrome.storage.session.get([DISMISS_KEY], (data) => {
    const hosts: string[] = data[DISMISS_KEY] ?? [];
    if (!hosts.includes(host)) hosts.push(host);
    chrome.storage.session.set({ [DISMISS_KEY]: hosts });
  });
}

function removeButton() { document.getElementById(BTN_ID)?.remove(); }

function showButton(rule: SiteRule) {
  if (document.getElementById(BTN_ID)) return;

  const wrap = document.createElement('div');
  wrap.id = BTN_ID;
  wrap.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 2147483646;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px 8px 10px;
    background: linear-gradient(135deg, rgba(102,126,234,0.95), rgba(118,75,162,0.95));
    border-radius: 999px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    animation: dyno-suggest-in 0.25s ease-out;
  `;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes dyno-suggest-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    #${BTN_ID} .dyno-x {
      display: inline-flex; align-items: center; justify-content: center;
      width: 18px; height: 18px; border-radius: 50%;
      background: rgba(0,0,0,0.25); margin-left: 6px; font-size: 11px;
      transition: background 0.12s;
    }
    #${BTN_ID} .dyno-x:hover { background: rgba(0,0,0,0.45); }
  `;
  wrap.appendChild(style);

  const emoji = document.createElement('span'); emoji.textContent = rule.emoji; emoji.style.fontSize = '15px';
  wrap.appendChild(emoji);

  const label = document.createElement('span'); label.textContent = rule.label();
  wrap.appendChild(label);

  const x = document.createElement('span'); x.className = 'dyno-x'; x.textContent = '×';
  x.addEventListener('click', async (e) => {
    e.stopPropagation();
    await dismissHost(getHost());
    removeButton();
  });
  wrap.appendChild(x);

  wrap.addEventListener('click', async () => {
    try {
      await chrome.runtime.sendMessage({
        type: 'site-suggestion',
        forcedAgent: rule.agent,
        content: rule.prompt(),
        url: location.href,
        title: document.title,
      });
      label.textContent = 'Captured ✓';
      setTimeout(removeButton, 900);
    } catch {
      label.textContent = 'Failed';
    }
  });

  document.body.appendChild(wrap);
}

(async () => {
  const rule = getRule();
  if (!rule) return;
  if (await isDismissed(getHost())) return;
  // Wait for body, then show.
  if (document.body) {
    showButton(rule);
  } else {
    document.addEventListener('DOMContentLoaded', () => showButton(rule), { once: true });
  }
})();
