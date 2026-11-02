// Activates every pending Chase offer AND captures full detail (merchant,
// reward, spend minimum, cash-back cap, expiration) in ONE combined pass,
// for both real card accounts (Sapphire Preferred, Freedom Unlimited).
// Also skips any merchant already known-valid from a prior run without
// re-touching it. Replaces the old chase-activate-all.js +
// chase-capture-offers.js two-script split -- see
// citi-activate-and-capture.js for the fuller design writeup of why
// combined-per-offer beats separate activate-then-capture sweeps.
//
// NOTE 2026-11: Chase renamed the account-picker test ids (select-credit-card-account -> account-selector-trigger,
// user-account-option-N -> account-option-N). Both spellings are accepted below.
// Chase specifics (confirmed by hand before writing this):
//  - The "Not added" checkbox filter on the offerCategoriesPage view is the
//    reliable way to see the TRUE remaining count -- the small featured
//    carousel on the offer-hub page is NOT the full catalog and undercounts
//    badly (confirmed: showed 0 pending when 104 were actually pending).
//  - Clicking a tile ALWAYS navigates to a detail page and activates there
//    -- there's no separate in-place toggle like Amex/Citi have. This
//    actually makes "combined" natural here: the detail page visit that
//    activation requires is the SAME page visit capture needs (spend
//    minimum / cash-back cap text only exists there, not on the grid tile).
//  - page.goBack() from the detail page returns to the exact filtered grid
//    state (account + "Not added" filter both preserved).
//  - Two accounts -- switch via [data-testid="user-account-option-N"] in
//    the account dropdown (0 = TOTAL CHECKING, skip; 1 = Sapphire
//    Preferred; 2 = Freedom Unlimited).
//  - Chase reports days-left directly on already-added tiles too, so
//    (like Citi) uses capturedOn + daysLeft for incremental staleness --
//    not an absolute date like Amex has.
//
// Usage: node chase-activate-and-capture.js [maxPerAccount]

// On the VPS (Steel cloud browser) only playwright-core is installed; locally the full package is.
const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('playwright-core'); } })();
const fs = require('fs');
const { execFileSync } = require('child_process');
const { todayIso, loadPriorState, findMostRecentArchive } = require('./incremental');

const VPS_HOST = 'dyno';
const VPS_OFFERS_DIR = '/root/openclaw/personas/financial-advisor/offers';
// CDP_URL: Steel session connectUrl (wss://...) or local Chrome (default). ON_VPS=1: write straight to the
// VPS offers dir (OFFERS_DIR) and skip the ssh/scp deploy step.
const CDP_URL = process.env.CDP_URL || 'http://localhost:9333';
const MAX_PER_ACCOUNT = parseInt(process.argv[2] || '200', 10);

const ACCOUNTS = [
  { testIdIndex: 1, label: 'Sapphire Preferred (...1039)', last4: '1039' },
  { testIdIndex: 2, label: 'Freedom Unlimited (...2163)', last4: '2163' },
];

function log(...args) {
  console.log(new Date().toISOString().slice(11, 19), ...args);
}

// daysLeft is as of capturedOn; carried-forward rows were captured weeks ago, so show what is left TODAY.
function remainingDays(o) {
  if (o.daysLeft == null || !o.capturedOn) return o.daysLeft;
  const elapsed = Math.round((new Date(todayIso() + 'T00:00:00') - new Date(o.capturedOn + 'T00:00:00')) / 86400000);
  return o.daysLeft - elapsed;
}

function parseDetailText(text) {
  const spendMatch = text.match(/spend \$([\d,]+(?:\.\d+)?) or more/i);
  const capMatch = text.match(/\$([\d,]+(?:\.\d+)?) cash back maximum/i);
  const expiresMatch = text.match(/Expires on ([A-Za-z]+ \d{1,2}, \d{4})/);
  return {
    spendMin: spendMatch ? parseFloat(spendMatch[1].replace(/,/g, '')) : null,
    cashBackMax: capMatch ? parseFloat(capMatch[1].replace(/,/g, '')) : null,
    expires: expiresMatch ? expiresMatch[1] : null,
  };
}

function parseMerchantAndReward(label) {
  // Shape: "<n> of <total> <Merchant> <reward>[ <n> days left] Success Added"
  const merchantReward = label
    .replace(/^\d+ of \d+\s*/, '')
    .replace(/\s*\d+ days? left.*$/, '')
    .replace(/\s*Success Added.*$/, '')
    .trim();
  const daysLeftMatch = label.match(/(\d+) days? left/);
  const parts = merchantReward.match(/^(.*?)\s+(\d+%|\$[\d.]+)\s+cash back$/i) || [];
  return {
    merchant: parts[1] || merchantReward,
    reward: parts[2] ? `${parts[2]} cash back` : merchantReward,
    daysLeft: daysLeftMatch ? parseInt(daysLeftMatch[1], 10) : null,
  };
}

async function getNotAddedCount(page) {
  return page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('*'))
      .find(e => /^\d+ results$/.test((e.textContent || '').trim()) && e.children.length === 0);
    return el ? parseInt(el.textContent, 10) : null;
  });
}

async function navigateToAllOffers(page, accountId, filterNotAdded) {
  await page.goto(`https://secure.chase.com/web/auth/dashboard#/dashboard/merchantOffers/offerCategoriesPage?accountId=${accountId}&offerCategoryName=NEW`);
  await page.waitForTimeout(2000);
  if (filterNotAdded) {
    const chipPresent = await page.evaluate(() =>
      !!Array.from(document.querySelectorAll('button, [role="button"], span'))
        .find(e => e.textContent?.trim() === 'Not added' && e.querySelector('svg')));
    if (!chipPresent) {
      try {
        await page.getByText('Not added', { exact: true }).first().click();
        await page.waitForTimeout(1500);
      } catch (e) {
        log('  (could not click Not added filter)', e.message.split('\n')[0]);
      }
    }
  }
}

async function getAllTiles(page) {
  return page.evaluate(() => {
    const tiles = document.querySelectorAll('[data-testid="commerce-tile"]');
    const seen = new Set();
    const rows = [];
    tiles.forEach((tile) => {
      if (seen.has(tile.id)) return;
      seen.add(tile.id);
      rows.push({ id: tile.id, label: (tile.getAttribute('aria-label') || '').replace(/^\d+ of \d+\s*/, '') });
    });
    return rows;
  });
}

async function processAccount(page, account, skipMerchants) {
  log(`\n=== ${account.label} ===`);
  await page.setViewportSize({ width: 1440, height: 900 }).catch(() => {});
  await page.goto('https://secure.chase.com/web/auth/dashboard#/dashboard/merchantOffers/offer-hub');
  await page.waitForTimeout(4000);
  try {
    await page.locator('[data-testid="account-selector-trigger"], [data-testid="select-credit-card-account"]').first().click({ timeout: 20000 });
    await page.waitForTimeout(800);
    await page.locator(`[data-testid="account-option-${account.testIdIndex}"], [data-testid="user-account-option-${account.testIdIndex}"]`).first().click({ timeout: 10000 });
    await page.waitForTimeout(1500);
  } catch (e) {
    // Say WHY, not just "timeout": expired login, bank verification page, or changed layout.
    const url = page.url();
    const body = await page.evaluate(() => document.body.innerText.slice(0, 400).replace(/\s+/g, ' ')).catch(() => '');
    const shot = (process.env.OFFERS_DIR ? '/tmp' : __dirname) + '/chase-debug.png';
    await page.screenshot({ path: shot }).catch(() => {});
    const loggedOut = /logon|auth\/\?|signin/i.test(url) && !/dashboard/.test(url);
    log(`DIAGNOSTIC: could not reach the Chase offers page for ${account.label}.`);
    log(`  url: ${url}`);
    log(`  page text: ${body}`);
    log(`  screenshot: ${shot}`);
    log(loggedOut ? '  LIKELY CAUSE: login expired -- Harry needs to log in again.' : '  LIKELY CAUSE: bank verification page or a changed page layout.');
    throw new Error(loggedOut ? 'LOGIN_EXPIRED' : 'OFFERS_PAGE_NOT_REACHED');
  }

  const accountIdMatch = page.url().match(/accountId=(\d+)/);
  const accountId = accountIdMatch ? accountIdMatch[1] : null;
  const today = todayIso();
  const results = [];

  // --- Pass 1: activate every genuinely-new pending offer, capturing full
  // detail from the same page visit the activation click already requires.
  await navigateToAllOffers(page, accountId, true);
  let notAddedCount = await getNotAddedCount(page);
  log(`Starting count: ${notAddedCount} not-added offers on the page.`);

  let activated = 0, failed = 0, skippedPending = 0;
  for (let i = 0; i < MAX_PER_ACCOUNT; i++) {
    const tiles = await getAllTiles(page);
    if (tiles.length === 0) { log(`No more tiles found after ${activated + failed} attempts.`); break; }
    const remaining = await getNotAddedCount(page);
    if (remaining === 0) { log('Not-added count reached 0.'); break; }

    const firstTile = tiles[0];
    const { merchant } = parseMerchantAndReward(firstTile.label);
    if (skipMerchants.has(merchant)) {
      // Shouldn't normally appear in "Not added" if we've already
      // activated it before, but defensively skip rather than re-click if
      // it does (e.g. offer renewed/reset by Chase).
      skippedPending++;
      continue;
    }

    try {
      const el = page.locator(`[data-testid="commerce-tile"][id="${firstTile.id}"]`).first();
      await el.click({ timeout: 10000 });
      await page.waitForURL(/offer-activated|offer-detail/, { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(700);
      const text = await page.evaluate(() => document.body.innerText);
      const added = text.includes('Added to card');
      const parsedLabel = parseMerchantAndReward(firstTile.label);
      const parsedDetail = parseDetailText(text);
      if (added) {
        results.push({
          merchant: parsedLabel.merchant, card: account.label, cardLast4: account.last4,
          reward: parsedLabel.reward, spendMin: parsedDetail.spendMin, cashBackMax: parsedDetail.cashBackMax,
          expires: parsedDetail.expires, daysLeft: parsedLabel.daysLeft, capturedOn: today, status: 'activated',
        });
        activated++;
        if (activated % 10 === 0) log(`  ...${activated} activated so far`);
      } else {
        failed++;
        log(`  ❌ ${parsedLabel.merchant} — not confirmed added`);
      }
    } catch (e) {
      failed++;
      log(`  ❌ ${merchant} — ${e.message.split('\n')[0]}`);
    }

    if (/offer-activated|offer-detail/.test(page.url())) {
      await page.goBack();
      await page.waitForTimeout(1200);
      const stillFiltered = await getNotAddedCount(page);
      if (stillFiltered === null) await navigateToAllOffers(page, accountId, true);
    } else {
      await page.waitForTimeout(800);
    }
  }

  log(`${account.label}: ${activated} NEW offers activated (${failed} failed, ${skippedPending} skipped-pending-but-known).`);

  // --- Pass 2: capture every currently-ADDED offer too, not just the ones
  // that were pending this run. Without this, a run where nothing new is
  // pending would report almost no offers at all -- the "Not added" filter
  // in Pass 1 only ever shows what's NOT yet active, so anything already
  // active before this run (the vast majority, most months) would silently
  // vanish from current.md if this file only reflected Pass 1's results.
  // (Real bug hit on the first incremental run: 217 already-active offers
  // dropped to 1 because only the "Not added" view was ever scanned.)
  //
  // Visits each offer's detail page (same click-and-goBack as Pass 1) to
  // get full spend-min/cash-back-cap data -- Harry's explicit call: keep
  // full detail every run rather than trade it away for speed on this pass.
  // Skips anything already known-valid from a prior run (skipMerchants) or
  // already captured in Pass 1 this run.
  await navigateToAllOffers(page, accountId, false);
  // Chase remembers the offer-status filter between navigations, so Pass 1's "Not added" checkbox is still
  // ticked here. Set the filter state explicitly: "Added to card" on, "Not added" off (a ticked "Not added"
  // shows 0 results once everything is added, which made every Pass 2 click fail).
  try {
    // The inputs are visually hidden; read .checked and click the wrapping <label> to toggle.
    const setBox = async (testId, want) => {
      const input = page.locator(`input[data-testid="${testId}"]`).first();
      const now = await input.evaluate(el => el.checked).catch(() => null);
      if (now !== null && now !== want) {
        await page.locator(`label:has(input[data-testid="${testId}"])`).first().click({ timeout: 8000 });
        await page.waitForTimeout(1500);
      }
    };
    await setBox('Not added', false);
    await setBox('Added to card', true);
    await page.waitForTimeout(3000);
  } catch (e) {
    log('  (could not set the Added-to-card filter)', e.message.split('\n')[0]);
  }
  const addedTiles = await getAllTiles(page);
  log(`  Found ${addedTiles.length} currently-added tiles on the page.`);
  const seenThisPass = new Set(results.map(r => r.merchant));
  let addedCaptured = 0, addedFailed = 0;
  for (const tile of addedTiles) {
    const { merchant } = parseMerchantAndReward(tile.label);
    if (seenThisPass.has(merchant) || skipMerchants.has(merchant)) continue; // already have it (Pass 1 or carried forward)
    try {
      // Chase re-renders the grid after the filter, so the ids from the first read can go stale: find the tile
      // by its merchant name in the aria-label (the "N of M" prefix changes, the name does not).
      const el = page.locator(`[data-testid="commerce-tile"][aria-label*=" ${merchant.replace(/["\\]/g, '\\$&')} "]`).first();
      await el.click({ timeout: 10000 });
      await page.waitForURL(/offer-activated|offer-detail/, { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(700);
      const text = await page.evaluate(() => document.body.innerText);
      const parsedLabel = parseMerchantAndReward(tile.label);
      const parsedDetail = parseDetailText(text);
      results.push({
        merchant: parsedLabel.merchant, card: account.label, cardLast4: account.last4,
        reward: parsedLabel.reward, spendMin: parsedDetail.spendMin, cashBackMax: parsedDetail.cashBackMax,
        expires: parsedDetail.expires, daysLeft: parsedLabel.daysLeft, capturedOn: today, status: 'activated',
      });
      seenThisPass.add(merchant);
      addedCaptured++;
      if (addedCaptured % 10 === 0) log(`  ...${addedCaptured} already-active offers captured so far`);
    } catch (e) {
      addedFailed++;
      if (addedFailed === 1) {
        const n = await page.locator('[data-testid="commerce-tile"]').count().catch(() => -1);
        log(`  DEBUG at first failure: url=${page.url()} tiles-now=${n}`);
        await page.screenshot({ path: '/tmp/chase-fail.png' }).catch(() => {});
      }
      log(`  ⚠️  capture failed on "${merchant}": ${addedFailed <= 1 ? e.message.slice(0, 900) : e.message.split('\n')[0]}`);
    }
    if (/offer-activated|offer-detail/.test(page.url())) {
      await page.goBack();
      await page.waitForTimeout(1000);
      const stillFiltered = await page.evaluate(() =>
        !!Array.from(document.querySelectorAll('button, [role="button"], span'))
          .find(e => e.textContent?.trim() === 'Added to card' && e.querySelector('svg')));
      if (!stillFiltered) {
        await navigateToAllOffers(page, accountId, false);
        await page.getByText('Added to card', { exact: true }).first().click().catch(() => {});
        await page.waitForTimeout(1000);
      }
    } else {
      await page.waitForTimeout(600);
    }
  }
  log(`  ${addedCaptured} additional already-active offers captured with full detail (${addedFailed} failed).`);

  return results;
}

function fmtMoney(n) {
  return n == null ? '—' : ('$' + n.toFixed(n % 1 === 0 ? 0 : 2));
}

function buildMarkdown(all, capturedDate) {
  const byCard = {};
  for (const d of all) {
    if (d.status === 'activation_failed') continue;
    (byCard[d.card] = byCard[d.card] || []).push(d);
  }

  let md = `# Current Merchant Offers (auto-captured, replaced monthly)\n\n`;
  md += `**Last captured:** ${capturedDate} · **Cards covered:** ${Object.keys(byCard).join(', ')} (Amex/Citi are separate files).\n\n`;
  md += `**This file is fully REPLACED each capture run** — it always reflects only what's active right now. Don't treat gaps or removed rows as history; the prior state is archived at \`offers/archive/<YYYY-MM>.md\` before each overwrite.\n\n`;
  md += `**How to use this:** when Harry mentions a purchase or asks what to buy, check this table for the merchant first — if there's an active offer, tell him which card and the effective discount. Days-left sorted so the most time-sensitive ones surface first. A blank Spend Min / Max Cash Back means no minimum / uncapped for that field.\n`;

  for (const [card, offers] of Object.entries(byCard)) {
    const sorted = offers.filter(o => o.daysLeft != null).sort((a, b) => remainingDays(a) - remainingDays(b));
    const noExpiry = offers.filter(o => o.daysLeft == null);
    md += `\n### ${card} (${offers.length} offers)\n\n`;
    md += '| Merchant | Reward | Spend Min | Max Cash Back | Expires | Days Left |\n';
    md += '|---|---|---|---|---|---|\n';
    for (const o of [...sorted, ...noExpiry]) {
      md += `| ${o.merchant} | ${o.reward} | ${fmtMoney(o.spendMin)} | ${fmtMoney(o.cashBackMax)} | ${o.expires || '—'} | ${remainingDays(o) ?? '—'} |\n`;
    }
  }
  return md;
}

(async () => {
  const browser = await chromium.connectOverCDP(CDP_URL);
  const context = browser.contexts()[0];
  const pages = context.pages();
  const page = pages.find(p => p.url().includes('chase.com')) || pages[pages.length - 1]; // pick the bank's own tab, not just the newest one

  const OFFERS_DIR = process.env.OFFERS_DIR || __dirname + '/offers';
  const priorArchive = findMostRecentArchive(OFFERS_DIR, null); // Chase's archive files have no bank prefix (legacy: <YYYY-MM>.json)
  const { valid: carriedForward } = loadPriorState(priorArchive);
  const skipMerchants = new Set(carriedForward.map(r => r.merchant));
  if (priorArchive) log(`Loaded prior state from ${priorArchive}: ${carriedForward.length} still-valid merchants carried forward untouched.`);
  else log('No prior archive found -- full first run.');

  const allNew = [];
  for (const account of ACCOUNTS) {
    const rows = await processAccount(page, account, skipMerchants);
    allNew.push(...rows);
  }
  const all = [...carriedForward, ...allNew];

  const capturedDate = new Date().toISOString().slice(0, 10);
  const yearMonth = capturedDate.slice(0, 7);
  const md = buildMarkdown(all, capturedDate);

  fs.mkdirSync(OFFERS_DIR + '/archive', { recursive: true });
  fs.writeFileSync(OFFERS_DIR + '/current.md', md);
  fs.writeFileSync(`${OFFERS_DIR}/archive/${yearMonth}.md`, md);
  fs.writeFileSync(`${OFFERS_DIR}/archive/${yearMonth}.json`, JSON.stringify(all, null, 2));

  log(`\nTotal: ${all.length} offers (${allNew.length} newly activated/captured this run).`);
  log(`Written to offers/current.md, offers/archive/${yearMonth}.md/.json (commit these to the repo).`);

  if (!process.env.ON_VPS) try {
    log(`\nDeploying to ${VPS_HOST}...`);
    execFileSync('ssh', [VPS_HOST, `mkdir -p ${VPS_OFFERS_DIR}/archive`]);
    execFileSync('scp', [OFFERS_DIR + '/current.md', `${VPS_HOST}:${VPS_OFFERS_DIR}/current.md`]);
    execFileSync('scp', [`${OFFERS_DIR}/archive/${yearMonth}.md`, `${VPS_HOST}:${VPS_OFFERS_DIR}/archive/${yearMonth}.md`]);
    execFileSync('scp', [`${OFFERS_DIR}/archive/${yearMonth}.json`, `${VPS_HOST}:${VPS_OFFERS_DIR}/archive/${yearMonth}.json`]);
    log(`Deployed: offers/current.md + offers/archive/${yearMonth}.md/.json on ${VPS_HOST}.`);
  } catch (e) {
    log(`⚠️  Deploy to VPS failed: ${e.message.split('\n')[0]}`);
    log(`   Files are still saved locally in offers/ -- copy them up manually.`);
  }

  process.exit(0);
})();
