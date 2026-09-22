// Activates every pending Amex offer (data-testid="merchantOfferListAddButton")
// on the currently-open offers page, then captures ALL offers (already-added
// + just-activated) into current.md + a dated archive, matching the Chase
// layout under personas/financial-advisor/offers/.
//
// Differences from Chase, discovered by hand before writing this:
//  - Amex's page runs with `eval` DISABLED (a CSP/runtime protection) --
//    page.evaluate() throws "eval is disabled". Everything here uses
//    Playwright locators (textContent(), getAttribute(), click()) instead,
//    never page.evaluate().
//  - Activation is IN-PLACE: clicking the "+" button flips it to a
//    checkmark on the same page, no navigation -- much simpler than Chase's
//    click-navigates-to-detail-page-and-back dance.
//  - All offers load in the DOM at once (confirmed: scrolling didn't
//    increase the count), no pagination or "see all" view needed -- this
//    genuinely is the full list already.
//  - Amex's real Chrome browser (not Playwright's bundled Chromium) was
//    REQUIRED to get past login at all -- Amex blocks Playwright's browser
//    binary outright before credentials are even checked. Run this against
//    a real Chrome instance launched with --remote-debugging-port, not
//    open-browser.js's Playwright-launched one.
//  - Only one card (Amex Gold) -- no account switcher needed.
//
// Usage: node amex-activate-and-capture.js [maxToActivate]

const { chromium } = require('playwright');
const fs = require('fs');
const { execFileSync } = require('child_process');

const VPS_HOST = 'dyno';
const VPS_OFFERS_DIR = '/root/openclaw/personas/financial-advisor/offers';
const MAX = parseInt(process.argv[2] || '300', 10);

function log(...args) {
  console.log(new Date().toISOString().slice(11, 19), ...args);
}

function parseOfferText(raw) {
  // Depth-2 ancestor text looks like:
  // "<Merchant><Reward line>Expires <date>Terms applyView Details"
  // Isolate everything BEFORE "Expires <date>" first, then find the reward
  // clause within that slice -- matching reward-then-trimming-to-Expires in
  // one greedy regex over the full string overruns into "Terms applyView
  // Details" whenever the reward text has no literal period to stop at
  // (verified against real samples: worked for one offer shape, silently
  // wrong for two others before this fix).
  const text = raw.replace(/\s+/g, ' ').trim();
  const expiresMatch = text.match(/Expires (\d{1,2}\/\d{1,2}\/\d{2,4})/);
  const expiresIdx = expiresMatch ? text.indexOf(expiresMatch[0]) : -1;
  const beforeExpires = expiresIdx >= 0 ? text.slice(0, expiresIdx) : text;
  // Broad on purpose: reward phrasing varies a lot (cash percentage, flat
  // dollar, Membership Rewards points, "Use at least N points") -- tested
  // against 94 real offers, this 3-way prefix match (Spend $.../Use at
  // least.../Earn...) correctly separated merchant from reward on all of
  // them, vs. an earlier narrower pattern that missed 10/94 point-based offers.
  const rewardMatch = beforeExpires.match(/(Spend \$[\d,.]+.*|Use at least.*|Earn.*)$/i);
  const merchant = rewardMatch
    ? beforeExpires.slice(0, beforeExpires.indexOf(rewardMatch[1])).trim()
    : beforeExpires.trim();
  return {
    merchant: merchant || beforeExpires.slice(0, 60),
    reward: rewardMatch ? rewardMatch[1].trim() : null,
    expires: expiresMatch ? expiresMatch[1] : null,
  };
}

async function activatePending(page) {
  let activatedCount = 0;
  let consecutiveFailures = 0;
  for (let i = 0; i < MAX; i++) {
    const buttons = await page.locator('[data-testid="merchantOfferListAddButton"]').all();
    if (buttons.length === 0) {
      log(activatedCount === 0 ? 'No pending offers to activate.' : `No more pending offers after ${activatedCount}.`);
      break;
    }
    try {
      // scrollIntoViewIfNeeded first -- clicking buttons[0] repeatedly as
      // the list reflows (activated offers stay in place here, they don't
      // disappear/reorder, but the page can still drift) caused a timeout
      // after 10 clicks on the first unguarded attempt.
      await buttons[0].scrollIntoViewIfNeeded({ timeout: 5000 });
      await buttons[0].click({ timeout: 8000 });
      await page.waitForTimeout(500);
      activatedCount++;
      consecutiveFailures = 0;
      if (activatedCount % 10 === 0) log(`  ...${activatedCount} activated so far`);
    } catch (e) {
      consecutiveFailures++;
      log(`  ⚠️  activation click failed (${consecutiveFailures} in a row): ${e.message.split('\n')[0]}`);
      if (consecutiveFailures >= 3) {
        log('  3 consecutive failures -- stopping rather than looping on a stuck element.');
        break;
      }
      await page.waitForTimeout(1500); // brief pause before retrying the next pending offer
    }
  }
  log(`Activated ${activatedCount} offers.`);
  return activatedCount;
}

async function captureAll(page) {
  // After activation, ALL offer cards (both the "Added to Card" strip and
  // the "Recommended Offers" list) represent active offers. Anchor on
  // data-testid="merchantOfferDetailsLink" -- present on every card
  // regardless of activation state (unlike the add-button testid, which
  // disappears once activated). Confirmed by hand: its 2nd ancestor
  // (xpath ../..) is exactly one offer's clean text block, consistently,
  // across both the added-to-card strip and the main list -- an earlier
  // attempt anchoring on the "View Details" TEXT instead of this testid
  // gave inconsistent depths per card because that text appears twice per
  // card in different structural positions.
  const detailLinks = await page.locator('[data-testid="merchantOfferDetailsLink"]').all();
  log(`Found ${detailLinks.length} offer cards to capture.`);

  const results = [];
  const seen = new Set();
  for (const el of detailLinks) {
    try {
      const container = el.locator('xpath=../..');
      const raw = await container.textContent();
      const parsed = parseOfferText(raw);
      const key = parsed.merchant + '|' + parsed.expires;
      if (seen.has(key)) continue; // de-dupe (added-to-card strip + main list can double-list the same offer)
      seen.add(key);
      results.push(parsed);
    } catch (e) {
      // skip unparseable card rather than aborting the whole capture
    }
  }
  return results;
}

function fmtMoney(n) {
  return n == null ? '—' : ('$' + n.toFixed(n % 1 === 0 ? 0 : 2));
}

function buildMarkdown(offers, capturedDate) {
  let md = `# Current Merchant Offers — American Express Gold (auto-captured, replaced monthly)\n\n`;
  md += `**Last captured:** ${capturedDate} · **Card:** American Express Gold (...22000)\n\n`;
  md += `**This file is fully REPLACED each capture run** — it always reflects only what's active right now. Prior state is archived at \`offers/archive/amex-<YYYY-MM>.md\` before each overwrite.\n\n`;
  md += `**How to use this:** when Harry mentions a purchase or asks what to buy, check this table for the merchant first — if there's an active offer, tell him the effective discount and to use the Amex Gold card.\n\n`;
  md += '| Merchant | Reward | Expires |\n';
  md += '|---|---|---|\n';
  for (const o of offers) {
    md += `| ${o.merchant} | ${o.reward || '—'} | ${o.expires || '—'} |\n`;
  }
  return md;
}

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9333');
  const context = browser.contexts()[0];
  const page = context.pages()[context.pages().length - 1];

  log('=== American Express Gold ===');
  await activatePending(page);
  await page.waitForTimeout(1000);

  const offers = await captureAll(page);
  log(`Captured ${offers.length} unique offers.`);

  const capturedDate = new Date().toISOString().slice(0, 10);
  const yearMonth = capturedDate.slice(0, 7);
  const md = buildMarkdown(offers, capturedDate);

  const OFFERS_DIR = __dirname + '/offers';
  fs.mkdirSync(OFFERS_DIR + '/archive', { recursive: true });
  fs.writeFileSync(OFFERS_DIR + '/amex-current.md', md);
  fs.writeFileSync(`${OFFERS_DIR}/archive/amex-${yearMonth}.md`, md);
  fs.writeFileSync(`${OFFERS_DIR}/archive/amex-${yearMonth}.json`, JSON.stringify(offers, null, 2));
  log(`Written to offers/amex-current.md, offers/archive/amex-${yearMonth}.md/.json (commit these to the repo).`);

  // Also deploy to the VPS so financial-advisor can read it directly as a
  // local file -- intentionally duplicated with the repo copy above.
  try {
    log(`\nDeploying to ${VPS_HOST}...`);
    execFileSync('ssh', [VPS_HOST, `mkdir -p ${VPS_OFFERS_DIR}/archive`]);
    execFileSync('scp', [OFFERS_DIR + '/amex-current.md', `${VPS_HOST}:${VPS_OFFERS_DIR}/amex-current.md`]);
    execFileSync('scp', [`${OFFERS_DIR}/archive/amex-${yearMonth}.md`, `${VPS_HOST}:${VPS_OFFERS_DIR}/archive/amex-${yearMonth}.md`]);
    execFileSync('scp', [`${OFFERS_DIR}/archive/amex-${yearMonth}.json`, `${VPS_HOST}:${VPS_OFFERS_DIR}/archive/amex-${yearMonth}.json`]);
    log(`Deployed: offers/amex-current.md + offers/archive/amex-${yearMonth}.md/.json on ${VPS_HOST}.`);
  } catch (e) {
    log(`⚠️  Deploy to VPS failed: ${e.message.split('\n')[0]}`);
    log(`   Files are still saved locally in offers/ -- copy them up manually.`);
  }

  process.exit(0);
})();
