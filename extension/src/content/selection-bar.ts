// Floating action bar that appears when the user highlights text on any page.
// Each action sends a message to the service worker which routes it to capture-creation
// (so we don't have to import @supabase here, keeping the content script tiny).

const BAR_ID = 'dyno-selection-bar';
let lastSelectionText = '';

function removeBar() {
  document.getElementById(BAR_ID)?.remove();
}

function showBar(x: number, y: number, text: string) {
  removeBar();
  lastSelectionText = text;

  const bar = document.createElement('div');
  bar.id = BAR_ID;
  bar.style.cssText = `
    position: fixed;
    top: ${Math.max(8, y - 44)}px;
    left: ${Math.max(8, Math.min(window.innerWidth - 280, x - 80))}px;
    z-index: 2147483647;
    display: flex;
    gap: 4px;
    padding: 4px;
    background: rgba(18, 24, 33, 0.96);
    border: 1px solid rgba(91,141,239,0.4);
    border-radius: 999px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.6);
    backdrop-filter: blur(10px);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 11px;
    color: #e6edf3;
    animation: dyno-bar-in 0.15s ease-out;
  `;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes dyno-bar-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    #${BAR_ID} button {
      background: none; border: none; color: #e6edf3; cursor: pointer; padding: 5px 10px;
      border-radius: 999px; font-size: 11px; font-weight: 600; font-family: inherit; white-space: nowrap;
      transition: background 0.12s;
    }
    #${BAR_ID} button:hover { background: rgba(91,141,239,0.25); }
    #${BAR_ID} .dyno-bar-sep { width: 1px; background: rgba(255,255,255,0.1); margin: 4px 2px; }
  `;
  bar.appendChild(style);

  const make = (label: string, action: string, agent?: string) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await chrome.runtime.sendMessage({
          type: 'selection-capture',
          action,
          forcedAgent: agent ?? null,
          selection: lastSelectionText,
          url: location.href,
          title: document.title,
        });
        flash(b, '✓');
      } catch (err) {
        flash(b, '!');
      }
      setTimeout(removeBar, 400);
    });
    return b;
  };

  const flash = (b: HTMLButtonElement, mark: string) => {
    const orig = b.textContent;
    b.textContent = mark;
    setTimeout(() => { b.textContent = orig; }, 300);
  };

  bar.appendChild(make('💪 Trainer', 'capture', 'trainer'));
  bar.appendChild(make('📋 Task', 'capture', 'personal-assistant'));
  bar.appendChild(make('🔧 Journal', 'capture', 'maintenance'));
  const sep = document.createElement('div'); sep.className = 'dyno-bar-sep'; bar.appendChild(sep);
  bar.appendChild(make('🦕 Capture', 'capture'));

  document.body.appendChild(bar);
}

document.addEventListener('mouseup', (e) => {
  // Defer slightly so the selection is fully committed.
  setTimeout(() => {
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? '';
    if (!text || text.length < 3) { removeBar(); return; }

    // If the user clicked inside the bar itself, don't redraw on top.
    const target = e.target as HTMLElement | null;
    if (target?.closest(`#${BAR_ID}`)) return;

    showBar(e.clientX, e.clientY, text);
  }, 10);
});

document.addEventListener('mousedown', (e) => {
  const target = e.target as HTMLElement | null;
  if (target?.closest(`#${BAR_ID}`)) return;
  removeBar();
});

document.addEventListener('scroll', removeBar, { passive: true });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') removeBar(); });
