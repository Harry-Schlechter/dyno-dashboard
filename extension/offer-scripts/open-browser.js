// Opens a real, visible Chrome window with a persistent profile saved to
// ./browser-profile/ -- log into your bank in this window once, and the
// session (cookies) will still be there next time this script runs, so we
// don't have to re-login every time while building/testing a script.
//
// Usage: node open-browser.js [start-url]
// Leave the window open after logging in -- run inspect.js in another
// terminal tab while this stays open to read the live page.

const { chromium } = require('playwright');
const path = require('path');

const PROFILE_DIR = path.join(__dirname, 'browser-profile');
const startUrl = process.argv[2] || 'https://www.chase.com';

(async () => {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: { width: 1280, height: 900 },
    // Exposes a CDP endpoint so inspect.js can ATTACH to this same running
    // browser instead of launching a second one against the same profile
    // (which Chromium would refuse -- profile dirs are single-instance).
    args: ['--remote-debugging-port=9333'],
  });
  const page = context.pages()[0] || await context.newPage();
  await page.goto(startUrl);
  console.log(`Browser open at ${startUrl}. Log in normally, then leave this running.`);
  console.log('Press Ctrl+C in this terminal to close when done.');

  // Keep the process alive until the window is closed or Ctrl+C.
  await new Promise(() => {});
})();
