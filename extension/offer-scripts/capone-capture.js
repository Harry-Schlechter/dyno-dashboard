// Captures Capital One's full merchant offers catalog (merchant, reward,
// type) into offers/capone-current.md + dated archive. NO ACTIVATION --
// per Harry's explicit call, this bank is capture-only:
//   - ~4,700+ offers are "Online" -- these need NO activation at all,
//     they're auto-tracked whenever you shop with the card. Nothing to
//     click; just useful data for financial-advisor to know exists.
//   - ~30ish offers are "In-Store" (or "In-Store & Online" hybrid) --
//     these DO need a real activation click, but Capital One caps
//     in-store activation at 3 CONCURRENT slots (7-day expiry each,
//     confirmed live: activating a 3rd blocked further activation until
//     one expired). With only 3 usable at a time out of ~30 available,
//     scripted "activate everything" doesn't make sense here -- flagged
//     in the output as "needs manual activation (max 3 at a time)"
//     instead of attempted.
//
// Discovery notes:
//  - Real Chrome (same debug profile as Amex/Citi) worked fine, no login
//    block. page.evaluate() works (not blocked like Amex).
//  - Merchant names are NOT in document.body.innerText at all -- they're
//    rendered as <img alt="Merchant"> logos, not text. Every extraction
//    here reads img[alt] within each .standard-tile, not textContent.
//  - Catalog does NOT infinite-scroll -- it's paginated via a
//    "View More Offers" button that must be clicked repeatedly (confirmed:
//    47 clicks to exhaust it, tiles went 149 -> 4,719). Scroll-only never
//    loads past the first page.
//  - The SAME catalog shows regardless of which card (Venture X vs
//    Discover it, now branded Capital One) is selected in the "Apply my
//    offer to" dropdown -- confirmed identical merchant order across both.
//    Only need to capture ONCE, not once per card.
//  - No expiration date is shown for ONLINE offers anywhere (grid or
//    modal) -- only IN-STORE offers show a real date ("Use in-store by
//    <date>"). Incremental logic below uses a flat 30-day trust window
//    from capturedOn for online offers (no per-offer expiry to check
//    against), same idea as the other banks but coarser since the data
//    just isn't there at this scale.
//
// Usage: node capone-capture.js

const { chromium } = require('playwright');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { todayIso, findMostRecentArchive } = require('./incremental');

const VPS_HOST = 'dyno';
const VPS_OFFERS_DIR = '/root/openclaw/personas/financial-advisor/offers';
const TRUST_WINDOW_DAYS = 30;

function log(...args) {
  console.log(new Date().toISOString().slice(11, 19), ...args);
}

async function exhaustViewMoreOffers(page) {
  let lastCount = -1;
  for (let i = 0; i < 60; i++) {
    const btn = page.locator('button:has-text("View More Offers")');
    if (await btn.count() === 0) {
      log(`No more "View More Offers" button after ${i} clicks.`);
      break;
    }
    await btn.first().scrollIntoViewIfNeeded();
    await btn.first().click();
    await page.waitForTimeout(1100);
    const count = await page.evaluate(() => document.querySelectorAll('.standard-tile').length);
    if (i % 10 === 0) log(`  ...after ${i + 1} clicks, ${count} tiles loaded`);
    if (count === lastCount) { log(`Tile count stopped growing at ${count}.`); break; }
    lastCount = count;
  }
  return page.evaluate(() => document.querySelectorAll('.standard-tile').length);
}

async function captureAllTiles(page) {
  return page.evaluate(() => {
    const tiles = document.querySelectorAll('.standard-tile');
    const seen = new Set();
    const rows = [];
    tiles.forEach((tile) => {
      const img = tile.querySelector('img');
      const merchant = img ? img.getAttribute('alt') : null;
      if (!merchant) return;
      // Match "In-Store & In-App" too, not just "In-Store & Online" -- both
      // are real type variants seen in the catalog and the narrower
      // original regex left "In-App" un-stripped, leaking "& In-App" into
      // the reward text. The "BONUS" badge's text renders at the END of
      // the tile's text (after the reward, e.g. "...earn $10Bonus"), not
      // the start -- confirmed by direct inspection.
      const text = (tile.textContent || '').replace(/\s+/g, ' ').trim();
      const isInStore = text.includes('In-Store');
      const isOnline = text.includes('Online') || text.includes('In-App');
      let type = 'Online';
      if (isInStore && text.includes('In-App')) type = 'In-Store & In-App';
      else if (isInStore && isOnline) type = 'In-Store & Online';
      else if (isInStore) type = 'In-Store';
      else if (text.includes('In-App')) type = 'In-App';
      const reward = text
        .replace(/^(In-Store & Online|In-Store & In-App|In-Store|Online|In-App)\s*/, '')
        .replace(/Bonus\s*$/, '')
        .trim();
      const key = merchant + '|' + reward;
      if (seen.has(key)) return; // de-dupe (same offer can render more than once, e.g. featured + main grid)
      seen.add(key);
      rows.push({ merchant, reward, type });
    });
    return rows;
  });
}

function buildMarkdown(offers, capturedDate) {
  const online = offers.filter(o => o.type === 'Online');
  const inStore = offers.filter(o => o.type !== 'Online');

  let md = `# Current Merchant Offers — Capital One (auto-captured, replaced monthly)\n\n`;
  md += `**Last captured:** ${capturedDate} · **Cards:** Venture X (...6196) and Capital One (formerly Discover it, ...8013) — SAME catalog applies to both, confirmed identical.\n\n`;
  md += `**This file is fully REPLACED each capture run** — it always reflects only what's active right now.\n\n`;
  md += `**IMPORTANT — no activation was performed on this bank.** These two offer types work completely differently and need different instructions — get this wrong and Harry loses the cash back with no way to fix it after the fact:\n\n`;
  md += `- **Online offers (the vast majority, ~${online.length}):** NOT automatic just because he pays with the card. Capital One tracks these via its own shopping portal — **he must click "Shop Online" / go through capitaloneoffers.com (or the Capital One Shopping browser extension, if installed) to start that merchant's visit, THEN complete the purchase.** Buying directly on the merchant's own site/app without going through the portal link will NOT earn the cash back, even on the exact same card. When Harry says he's about to buy something from a merchant on this list, tell him: "Go through the Capital One Offers portal first, don't just buy direct."\n`;
  md += `- **In-Store offers (~${inStore.length}):** need the offer **pre-activated on capitaloneoffers.com BEFORE he walks in and pays** — there's no portal step at checkout, it's activate-ahead-of-time instead. Capital One caps this at only 3 concurrent activations (7-day expiry each), so before telling him to activate one, a live check of capitaloneoffers.com is needed to confirm a slot is actually free — this file doesn't track his currently-used slots.\n\n`;
  md += `**How to use this:** when Harry mentions a purchase or asks what to buy, check this table for the merchant first.\n`;
  md += `- Found in **Online offers** → tell him the cash-back rate AND that he needs to start the purchase via the Capital One Offers portal, not buy direct.\n`;
  md += `- Found in **In-Store offers** → tell him the cash-back rate AND that he needs to activate it on capitaloneoffers.com before he goes, and to check he has a free slot (max 3 at once).\n\n`;

  md += `\n### In-Store offers — need manual activation, max 3 concurrent (${inStore.length})\n\n`;
  md += '| Merchant | Reward |\n|---|---|\n';
  for (const o of inStore) md += `| ${o.merchant} | ${o.reward} |\n`;

  md += `\n### Online offers — auto-tracked, no activation needed (${online.length})\n\n`;
  md += '| Merchant | Reward |\n|---|---|\n';
  for (const o of online) md += `| ${o.merchant} | ${o.reward} |\n`;

  return md;
}

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9333');
  const context = browser.contexts()[0];
  const page = context.pages()[0];

  const OFFERS_DIR = __dirname + '/offers';
  const priorArchive = findMostRecentArchive(OFFERS_DIR, 'capone');
  let skipFullCapture = false;
  if (priorArchive) {
    const stat = fs.statSync(priorArchive);
    const ageDays = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60 * 24);
    if (ageDays < TRUST_WINDOW_DAYS) {
      log(`Prior capture (${priorArchive}) is ${Math.round(ageDays)} days old -- within the ${TRUST_WINDOW_DAYS}-day trust window. No per-offer expiry data exists for Capital One's ~4,700+ online offers to check individually, so per Harry's call this whole capture is trusted as-is; re-run manually if you suspect something's changed sooner.`);
      skipFullCapture = true;
    } else {
      log(`Prior capture is ${Math.round(ageDays)} days old -- past the ${TRUST_WINDOW_DAYS}-day trust window, doing a fresh full capture.`);
    }
  } else {
    log('No prior archive found -- full first run.');
  }

  if (skipFullCapture) {
    log('Skipping live capture entirely this run (trust window). Re-deploying existing current.md/archive unchanged.');
    process.exit(0);
  }

  log('Clicking "View More Offers" until the full catalog is loaded (this is slow -- ~4,700 offers, ~50 clicks)...');
  const total = await exhaustViewMoreOffers(page);
  log(`Loaded ${total} total tiles.`);

  const offers = await captureAllTiles(page);
  log(`Captured ${offers.length} unique offers (${offers.filter(o => o.type === 'Online').length} online, ${offers.filter(o => o.type !== 'Online').length} in-store).`);

  const capturedDate = todayIso();
  const yearMonth = capturedDate.slice(0, 7);
  const md = buildMarkdown(offers, capturedDate);

  fs.mkdirSync(OFFERS_DIR + '/archive', { recursive: true });
  fs.writeFileSync(OFFERS_DIR + '/capone-current.md', md);
  fs.writeFileSync(`${OFFERS_DIR}/archive/capone-${yearMonth}.md`, md);
  fs.writeFileSync(`${OFFERS_DIR}/archive/capone-${yearMonth}.json`, JSON.stringify(offers, null, 2));
  log(`Written to offers/capone-current.md, offers/archive/capone-${yearMonth}.md/.json`);

  try {
    log(`\nDeploying to ${VPS_HOST}...`);
    execFileSync('ssh', [VPS_HOST, `mkdir -p ${VPS_OFFERS_DIR}/archive`]);
    execFileSync('scp', [OFFERS_DIR + '/capone-current.md', `${VPS_HOST}:${VPS_OFFERS_DIR}/capone-current.md`]);
    execFileSync('scp', [`${OFFERS_DIR}/archive/capone-${yearMonth}.md`, `${VPS_HOST}:${VPS_OFFERS_DIR}/archive/capone-${yearMonth}.md`]);
    execFileSync('scp', [`${OFFERS_DIR}/archive/capone-${yearMonth}.json`, `${VPS_HOST}:${VPS_OFFERS_DIR}/archive/capone-${yearMonth}.json`]);
    log(`Deployed: offers/capone-current.md + offers/archive/capone-${yearMonth}.md/.json on ${VPS_HOST}.`);
  } catch (e) {
    log(`⚠️  Deploy to VPS failed: ${e.message.split('\n')[0]}`);
    log(`   Files are still saved locally in offers/ -- copy them up manually.`);
  }

  process.exit(0);
})();
