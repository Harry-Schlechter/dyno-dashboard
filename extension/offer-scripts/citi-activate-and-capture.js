// Activates every pending Citi offer AND captures merchant/reward/category
// data for ALL offers (pending + already-activated) in ONE combined pass.
//
// Design history (worth keeping -- this took two wrong turns to get right):
//  1. First version ran activation and capture as two SEPARATE passes
//     (activate everything, then scroll through again to capture
//     everything). Harry correctly flagged this as backwards -- captured
//     only 278 of ~330 unique offers.
//  2. Suspected the offers list was virtualized (DOM nodes unmounted as you
//     scroll past them) and rewrote as a combined scroll+activate+capture
//     loop with "stop once no new merchants found for N scrolls" bottom
//     detection -- still landed on 277-278, and finished suspiciously fast
//     (~4s) each time.
//  3. Actually debugged it: the list is NOT virtualized after all -- once
//     the page finishes its initial load, ALL ~400 offer buttons
//     (379 offer-like + ~277 truly unique after de-duping the Featured-strip
//     duplicates) are already in the DOM simultaneously, confirmed by
//     reading document.querySelectorAll(...).length at every scroll
//     position without it ever changing. So 277 unique merchants IS the
//     correct, complete count -- there was never a missing 50, that was a
//     misreading of Citi's own (apparently stale/inconsistent) category tab
//     labels against the real card count.
//  The real, simple fix: scroll to the bottom ONCE up front (forces
//  whatever initial lazy-load exists to finish), then do ONE flat read of
//  the whole already-rendered DOM -- no repeated scroll-and-rescan loop
//  needed at all. Scrolling during the activation loop is still needed
//  per-click (scrollIntoViewIfNeeded) since offscreen elements can't be
//  clicked, but that's positional, not a data-loading concern.
//
// Other discovery notes:
//  - Clicking a pending offer's button activates it immediately (confirmed:
//    background list shows a green checkmark right away) AND opens a
//    detail/confirmation modal with spend threshold, cap, and expiration --
//    richer data than Chase's grid view, no separate detail-page visit
//    needed like Chase required.
//  - Must close the modal (`[aria-label="Close"]`) before the next click,
//    waiting for it to actually render first -- closing too early (before
//    a slower-rendering modal, e.g. ones with a "You might also like..."
//    recommendation section) left a stuck modal blocking all further
//    clicks in testing. Escape is a fallback if the Close click itself
//    doesn't register.
//  - Each real offer's aria-label CHANGES on activation: pending is
//    "Enroll in Offer for X", activated is "<reward> for X" -- capture
//    must match both shapes, not just one.
//  - 700+ pending offers total on first run (Harry: "a lot of these are
//    local restaurants which i dont give a shit about" -- decided to
//    activate everything anyway since activation is free).
//
// Usage: node citi-activate-and-capture.js [maxToActivate]

const { chromium } = require('playwright');
const fs = require('fs');
const { execFileSync } = require('child_process');

const VPS_HOST = 'dyno';
const VPS_OFFERS_DIR = '/root/openclaw/personas/financial-advisor/offers';
const MAX = parseInt(process.argv[2] || '1000', 10);

function log(...args) {
  console.log(new Date().toISOString().slice(11, 19), ...args);
}

const CATEGORY_HEADINGS = ['Featured', 'Travel', 'Dining', 'Shopping', 'Entertainment', 'Health & Wellness', 'Other'];

async function readVisibleOffers(page) {
  // Everything currently rendered: pending ones (still showing "Enroll in
  // Offer for X") and already-activated ones (label swapped to
  // "<reward> for X"). Returns enough to both capture data AND know which
  // pending offer to click next.
  return page.evaluate((CATS) => {
    const headingEls = Array.from(document.querySelectorAll('h2, h3, h4'))
      .filter(h => CATS.some(c => h.textContent.trim().startsWith(c)));
    function categoryFor(el) {
      let best = null;
      for (const h of headingEls) {
        if (h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) best = h;
      }
      return best ? best.textContent.trim().replace(/\s*\(\d+\)\s*$/, '') : 'Unknown';
    }
    function daysLeftFor(el) {
      let container = el.parentElement;
      for (let d = 0; d < 5 && container; d++) {
        const m = container.textContent.match(/(\d+)d left/);
        if (m) return parseInt(m[1], 10);
        container = container.parentElement;
      }
      return null;
    }

    const pending = [];
    const activated = [];

    document.querySelectorAll('[aria-label^="Enroll in Offer for"]').forEach((btn) => {
      const merchant = (btn.getAttribute('aria-label') || '').replace(/^Enroll in Offer for /, '');
      let container = btn.parentElement;
      for (let d = 0; d < 5 && container; d++) {
        const text = container.textContent.trim();
        if (/back|%/i.test(text) && text.length < 200) break;
        container = container.parentElement;
      }
      const raw = container ? container.textContent.replace(/\s+/g, ' ').trim() : '';
      const rewardMatch = raw.match(/(\$[\d.]+ Back|\d+% Back)/i);
      pending.push({
        merchant, ariaLabel: btn.getAttribute('aria-label'),
        reward: rewardMatch ? rewardMatch[0] : null,
        daysLeft: daysLeftFor(btn), category: categoryFor(btn),
      });
    });

    document.querySelectorAll('button[aria-label]').forEach((btn) => {
      const label = btn.getAttribute('aria-label') || '';
      const m = label.match(/^(\$[\d.]+ Back|\d+% Back) for (.+)$/i);
      if (!m) return;
      activated.push({
        merchant: m[2].trim(), reward: m[1],
        daysLeft: daysLeftFor(btn), category: categoryFor(btn),
      });
    });

    return { pending, activated };
  }, CATEGORY_HEADINGS);
}

async function forceFullLoad(page) {
  // The page appears to lazy-render its initial content on first paint
  // (confirmed: a fresh reload shows 0 offer buttons before any scroll),
  // but once that settles, ALL offers are in the DOM simultaneously --
  // it's not a scroll-triggered virtualized list. One pass to the bottom
  // and back is enough to force everything to materialize; no repeated
  // scroll-read loop is needed after that.
  let lastCount = -1;
  for (let i = 0; i < 15; i++) {
    await page.mouse.wheel(0, 3000);
    await page.waitForTimeout(400);
    const count = await page.evaluate(() => document.querySelectorAll('button[aria-label]').length);
    if (count === lastCount) break;
    lastCount = count;
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
}

async function runCombinedPass(page) {
  const byMerchant = new Map(); // final captured data, de-duped
  let activatedCount = 0;
  let failedCount = 0;
  let consecutiveFailures = 0;

  await forceFullLoad(page);

  const { pending, activated } = await readVisibleOffers(page);
  log(`Found ${activated.length} already-activated, ${pending.length} pending (raw counts, pre-de-dupe).`);

  // Record already-activated offers as-is.
  for (const entry of activated) {
    const existing = byMerchant.get(entry.merchant);
    if (!existing || (!existing.reward && entry.reward)) byMerchant.set(entry.merchant, { ...entry, status: 'activated' });
  }

  // Activate + record every pending offer. scrollIntoViewIfNeeded per-click
  // handles bringing each one into view -- the whole list is already in
  // the DOM (see forceFullLoad), this is purely positional, not a
  // data-loading concern.
  const seenPending = new Set();
  for (const offer of pending) {
    if (activatedCount + failedCount >= MAX) break;
    if (seenPending.has(offer.ariaLabel)) continue; // same offer duplicated (Featured strip + main list)
    seenPending.add(offer.ariaLabel);
    if (byMerchant.has(offer.merchant) && byMerchant.get(offer.merchant).status === 'activated') continue; // already done
    try {
      const btn = page.locator(`[aria-label="${offer.ariaLabel}"]`).first();
      await btn.scrollIntoViewIfNeeded({ timeout: 5000 });
      await btn.click({ timeout: 8000 });
      const closeBtn = page.locator('[aria-label="Close"]').first();
      const appeared = await closeBtn.waitFor({ state: 'visible', timeout: 4000 }).then(() => true).catch(() => false);
      if (appeared) {
        await closeBtn.click({ timeout: 5000 }).catch(async () => { await page.keyboard.press('Escape').catch(() => {}); });
        await closeBtn.waitFor({ state: 'hidden', timeout: 4000 }).catch(async () => { await page.keyboard.press('Escape').catch(() => {}); });
      }
      await page.waitForTimeout(250);
      byMerchant.set(offer.merchant, { merchant: offer.merchant, reward: offer.reward, daysLeft: offer.daysLeft, category: offer.category, status: 'activated' });
      activatedCount++;
      consecutiveFailures = 0;
      if (activatedCount % 10 === 0) log(`  ...${activatedCount} activated so far`);
    } catch (e) {
      failedCount++;
      consecutiveFailures++;
      log(`  ⚠️  activation failed (${consecutiveFailures} in a row) on "${offer.merchant}": ${e.message.split('\n')[0]}`);
      await page.keyboard.press('Escape').catch(() => {});
      await page.locator('[aria-label="Close"]').first().click({ timeout: 3000 }).catch(() => {});
      if (!byMerchant.has(offer.merchant)) {
        byMerchant.set(offer.merchant, { merchant: offer.merchant, reward: offer.reward, daysLeft: offer.daysLeft, category: offer.category, status: 'activation_failed' });
      }
      if (consecutiveFailures >= 5) {
        log('  5 consecutive failures -- stopping activation, will still finish capturing.');
        break;
      }
    }
  }

  log(`Activated ${activatedCount} offers this run (${failedCount} activation failures). Captured ${byMerchant.size} unique merchants total.`);
  return Array.from(byMerchant.values());
}

function fmtOffer(o) {
  return `| ${o.merchant} | ${o.reward || '—'} | ${o.category} | ${o.daysLeft != null ? o.daysLeft + 'd' : '—'} |`;
}

function buildMarkdown(offers, capturedDate) {
  let md = `# Current Merchant Offers — Citi Custom Cash (auto-captured, replaced monthly)\n\n`;
  md += `**Last captured:** ${capturedDate} · **Card:** Citi Custom Cash (...8318)\n\n`;
  md += `**This file is fully REPLACED each capture run** — it always reflects only what's active right now. Prior state is archived at \`offers/archive/citi-<YYYY-MM>.md\` before each overwrite.\n\n`;
  md += `**How to use this:** when Harry mentions a purchase or asks what to buy, check this table for the merchant first — if there's an active offer, tell him the effective discount and to use the Citi Custom Cash card. Note: this catalog is large (~300+ offers) and includes many small local/regional merchants alongside national retailers — Shopping and Travel categories are generally the most relevant; Dining is mostly small local restaurant deals.\n\n`;

  const activatedOnly = offers.filter(o => o.status !== 'activation_failed');
  const failed = offers.filter(o => o.status === 'activation_failed');

  const byCategory = {};
  for (const o of activatedOnly) (byCategory[o.category] = byCategory[o.category] || []).push(o);

  const order = ['Featured', 'Travel', 'Shopping', 'Entertainment', 'Health & Wellness', 'Dining', 'Other', 'Unknown'];
  for (const cat of order) {
    const list = byCategory[cat];
    if (!list || list.length === 0) continue;
    const sorted = [...list].sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));
    md += `\n### ${cat} (${list.length} offers)\n\n`;
    md += '| Merchant | Reward | Category | Days Left |\n';
    md += '|---|---|---|---|\n';
    for (const o of sorted) md += fmtOffer(o) + '\n';
  }

  if (failed.length > 0) {
    md += `\n### Activation failed this run (${failed.length}) — retry next capture\n\n`;
    md += '| Merchant | Reward | Category |\n|---|---|---|\n';
    for (const o of failed) md += `| ${o.merchant} | ${o.reward || '—'} | ${o.category} |\n`;
  }

  return md;
}

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9333');
  const context = browser.contexts()[0];
  const page = context.pages()[context.pages().length - 1];

  log('=== Citi Custom Cash ===');
  const offers = await runCombinedPass(page);

  const capturedDate = new Date().toISOString().slice(0, 10);
  const yearMonth = capturedDate.slice(0, 7);
  const md = buildMarkdown(offers, capturedDate);

  const OFFERS_DIR = __dirname + '/offers';
  fs.mkdirSync(OFFERS_DIR + '/archive', { recursive: true });
  fs.writeFileSync(OFFERS_DIR + '/citi-current.md', md);
  fs.writeFileSync(`${OFFERS_DIR}/archive/citi-${yearMonth}.md`, md);
  fs.writeFileSync(`${OFFERS_DIR}/archive/citi-${yearMonth}.json`, JSON.stringify(offers, null, 2));
  log(`Written to offers/citi-current.md, offers/archive/citi-${yearMonth}.md/.json`);

  try {
    log(`\nDeploying to ${VPS_HOST}...`);
    execFileSync('ssh', [VPS_HOST, `mkdir -p ${VPS_OFFERS_DIR}/archive`]);
    execFileSync('scp', [OFFERS_DIR + '/citi-current.md', `${VPS_HOST}:${VPS_OFFERS_DIR}/citi-current.md`]);
    execFileSync('scp', [`${OFFERS_DIR}/archive/citi-${yearMonth}.md`, `${VPS_HOST}:${VPS_OFFERS_DIR}/archive/citi-${yearMonth}.md`]);
    execFileSync('scp', [`${OFFERS_DIR}/archive/citi-${yearMonth}.json`, `${VPS_HOST}:${VPS_OFFERS_DIR}/archive/citi-${yearMonth}.json`]);
    log(`Deployed: offers/citi-current.md + offers/archive/citi-${yearMonth}.md/.json on ${VPS_HOST}.`);
  } catch (e) {
    log(`⚠️  Deploy to VPS failed: ${e.message.split('\n')[0]}`);
    log(`   Files are still saved locally in offers/ -- copy them up manually.`);
  }

  process.exit(0);
})();
