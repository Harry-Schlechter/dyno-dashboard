// Connects to the ALREADY-RUNNING persistent browser (started by
// open-browser.js) and inspects whatever page is currently showing there --
// doesn't open a new window, just reads the live DOM of the existing one.
//
// Usage: node inspect.js [selector]
//   no args        -> dumps a trimmed-down outline of clickable elements
//                      (buttons, links, [role=button]) with their visible
//                      text, so we can spot the "Activate"/"Add" controls
//   node inspect.js ".some-css-selector"
//                  -> dumps full outerHTML of every element matching that
//                     selector, so we can see exact structure once we've
//                     narrowed in

const { chromium } = require('playwright');

(async () => {
  // Attach to the ALREADY-RUNNING browser from open-browser.js over CDP
  // (remote-debugging-port=9333) instead of launching a second Chromium
  // against the same profile dir, which Chromium refuses (profile lock).
  const browser = await chromium.connectOverCDP('http://localhost:9333');
  const context = browser.contexts()[0];
  // Use whichever tab is currently focused/most-recently-active, not
  // necessarily pages()[0] -- you may have navigated in the same tab or
  // opened a new one.
  const pages = context.pages();
  const page = pages[pages.length - 1];

  const selector = process.argv[2];

  if (!selector) {
    const outline = await page.evaluate(() => {
      const clickable = document.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]');
      const rows = [];
      clickable.forEach((el, i) => {
        const text = (el.innerText || el.value || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 80);
        if (!text) return;
        rows.push({
          i,
          tag: el.tagName.toLowerCase(),
          text,
          classes: el.className && typeof el.className === 'string' ? el.className.slice(0, 100) : '',
          id: el.id || '',
          testId: el.getAttribute('data-testid') || el.getAttribute('data-test') || '',
        });
      });
      return rows;
    });
    console.log(`Found ${outline.length} clickable elements with text:\n`);
    outline.forEach(r => {
      console.log(`[${r.i}] <${r.tag}> "${r.text}"  id="${r.id}" testId="${r.testId}" class="${r.classes}"`);
    });
  } else {
    const html = await page.evaluate((sel) => {
      return Array.from(document.querySelectorAll(sel)).map(el => el.outerHTML.slice(0, 2000));
    }, selector);
    console.log(`Found ${html.length} element(s) matching "${selector}":\n`);
    html.forEach((h, i) => console.log(`--- [${i}] ---\n${h}\n`));
  }

  // Deliberately NOT calling browser.close() / context.close() here -- on a
  // CDP-attached connection that's supposed to only disconnect this script's
  // client, not the real window, but Playwright's own docs flag ambiguity
  // around whether it also clears contexts. Safer to just let the process
  // exit naturally and leave your real browser session untouched.
  process.exit(0);
})();
