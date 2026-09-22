// Activates every pending Amex offer AND captures merchant/reward/expiry
// data in ONE combined pass (per offer, not two separate sweeps), and
// skips any merchant already known-valid from a prior run without
// re-checking it live -- matching the pattern used for Citi. See
// incremental.js for the shared skip-logic, citi-activate-and-capture.js
// for the fuller design writeup of why combined > separate passes.
//
// Amex specifics, discovered by hand before writing this:
//  - Amex's page runs with `eval` DISABLED (a CSP/runtime protection) --
//    page.evaluate() throws "eval is disabled". Everything here uses
//    Playwright locators (textContent(), getAttribute(), click()) instead,
//    never page.evaluate().
//  - Activation is IN-PLACE: clicking the "+" button flips it to a
//    checkmark on the same page, no navigation -- much simpler than Chase's
//    click-navigates-to-detail-page-and-back dance.
//  - All offers load in the DOM at once (confirmed: scrolling didn't
//    increase the count), no pagination or "see all" view needed -- this
//    genuinely is the full list already, no virtualization concerns like
//    Citi had.
//  - Amex's real Chrome browser (not Playwright's bundled Chromium) was
//    REQUIRED to get past login at all -- Amex blocks Playwright's browser
//    binary outright before credentials are even checked. Run this against
//    a real Chrome instance launched with --remote-debugging-port, not
//    open-browser.js's Playwright-launched one.
//  - Only one card (Amex Gold) -- no account switcher needed.
//  - Amex already captures an ABSOLUTE expiry date ("Expires 10/16/26"),
//    unlike Citi's relative "Nd left" -- so staleness here is just
//    "is expires < today", no need for a separate capturedOn field.
//
// Usage: node amex-activate-and-capture.js [maxToActivate]

const { chromium } = require('playwright');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { loadPriorState, findMostRecentArchive } = require('./incremental');

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

function expiryStillValid(expiresStr, today) {
  if (!expiresStr) return false; // no date to trust -- re-verify
  const m = expiresStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return false;
  let [, mo, da, yr] = m;
  if (yr.length === 2) yr = '20' + yr;
  const expiryDate = new Date(`${yr}-${mo.padStart(2, '0')}-${da.padStart(2, '0')}T00:00:00`);
  return expiryDate > today;
}

async function readAllOfferCards(page) {
  // Anchor on data-testid="merchantOfferDetailsLink" -- present on every
  // card regardless of activation state (unlike the add-button testid,
  // which only exists on still-pending offers). Its 2nd ancestor
  // (xpath ../..) is exactly one offer's clean text block.
  const detailLinks = await page.locator('[data-testid="merchantOfferDetailsLink"]').all();
  const cards = [];
  const seen = new Set();
  for (const el of detailLinks) {
    try {
      const container = el.locator('xpath=../..');
      const raw = await container.textContent();
      const parsed = parseOfferText(raw);
      const key = parsed.merchant + '|' + parsed.expires;
      if (seen.has(key)) continue; // de-dupe (added-to-card strip + main list can double-list the same offer)
      seen.add(key);
      cards.push({ ...parsed, container });
    } catch (e) {
      // skip unparseable card rather than aborting the whole capture
    }
  }
  return cards;
}

async function runCombinedPass(page, skipMerchants) {
  const byMerchant = new Map();
  let activatedCount = 0;
  let skippedCount = 0;
  let consecutiveFailures = 0;

  const cards = await readAllOfferCards(page);
  // Note: ${skipMerchants.size} is how many we're TRUSTING from last run
  // (carried forward without touching them), not necessarily how many will
  // show up in this page's "Recommended Offers" scan -- previously-activated
  // offers can rotate out of that list entirely once added, so seeing few
  // or zero matches here is normal, not a bug (confirmed: a run finding
  // 93 fresh cards with 0 overlap against 93 known-valid ones is Amex's
  // catalog genuinely rotating in a new batch, not a skip-logic failure).
  log(`Found ${cards.length} offer cards on the page (this page's current "Recommended Offers" list -- already-activated older offers may not appear here at all). ${skipMerchants.size} merchants trusted from last capture and carried forward without re-touching.`);

  for (const card of cards) {
    if (skipMerchants.has(card.merchant)) { skippedCount++; continue; }
    if (byMerchant.has(card.merchant)) continue; // de-dupe safety net

    // Is this card still pending? Its container has the add button iff so.
    const addBtn = card.container.locator('[data-testid="merchantOfferListAddButton"]');
    const isPending = await addBtn.count() > 0;

    if (!isPending) {
      byMerchant.set(card.merchant, { merchant: card.merchant, reward: card.reward, expires: card.expires });
      continue;
    }

    if (activatedCount >= MAX) continue;
    try {
      await addBtn.first().scrollIntoViewIfNeeded({ timeout: 5000 });
      await addBtn.first().click({ timeout: 8000 });
      await page.waitForTimeout(500);
      byMerchant.set(card.merchant, { merchant: card.merchant, reward: card.reward, expires: card.expires });
      activatedCount++;
      consecutiveFailures = 0;
      if (activatedCount % 10 === 0) log(`  ...${activatedCount} activated so far`);
    } catch (e) {
      consecutiveFailures++;
      log(`  ⚠️  activation failed (${consecutiveFailures} in a row) on "${card.merchant}": ${e.message.split('\n')[0]}`);
      byMerchant.set(card.merchant, { merchant: card.merchant, reward: card.reward, expires: card.expires, status: 'activation_failed' });
      if (consecutiveFailures >= 5) {
        log('  5 consecutive failures -- stopping activation, will still finish capturing what was read.');
        break;
      }
      await page.waitForTimeout(1000);
    }
  }

  log(`Activated ${activatedCount} NEW offers this run (${skippedCount} skipped as already-known-valid). ${byMerchant.size} newly-captured merchants.`);
  return Array.from(byMerchant.values());
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

  const OFFERS_DIR = __dirname + '/offers';
  const priorArchive = findMostRecentArchive(OFFERS_DIR, 'amex');
  // Amex records have an absolute `expires` date already, no capturedOn
  // needed -- pass a tiny shim so incremental.js's generic isStillValid
  // (which expects capturedOn + daysLeft) doesn't apply here; do the
  // expiry check directly against the loaded records instead.
  let carriedForward = [];
  if (priorArchive) {
    try {
      const records = JSON.parse(fs.readFileSync(priorArchive, 'utf8'));
      const today = new Date();
      carriedForward = records.filter(r => expiryStillValid(r.expires, today));
    } catch (e) { /* no valid prior state -- full run */ }
  }
  const skipMerchants = new Set(carriedForward.map(r => r.merchant));
  log('=== American Express Gold ===');
  if (priorArchive) log(`Loaded prior state from ${priorArchive}: ${carriedForward.length} still-valid merchants carried forward untouched.`);
  else log('No prior archive found -- full first run.');

  const newOffers = await runCombinedPass(page, skipMerchants);
  const offers = [...carriedForward, ...newOffers];

  const capturedDate = new Date().toISOString().slice(0, 10);
  const yearMonth = capturedDate.slice(0, 7);
  const md = buildMarkdown(offers, capturedDate);

  fs.mkdirSync(OFFERS_DIR + '/archive', { recursive: true });
  fs.writeFileSync(OFFERS_DIR + '/amex-current.md', md);
  fs.writeFileSync(`${OFFERS_DIR}/archive/amex-${yearMonth}.md`, md);
  fs.writeFileSync(`${OFFERS_DIR}/archive/amex-${yearMonth}.json`, JSON.stringify(offers, null, 2));
  log(`Written to offers/amex-current.md, offers/archive/amex-${yearMonth}.md/.json (commit these to the repo).`);

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
