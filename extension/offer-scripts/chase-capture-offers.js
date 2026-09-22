// Captures every "Added to card" offer across both real Chase credit card
// accounts (Sapphire Preferred, Freedom Unlimited) into a structured JSON
// file -- merchant, reward %, spend minimum, cash-back cap, expiration,
// and which card it's on. Meant for financial-advisor to read and tell
// Harry which card to use for a given purchase.
//
// Two-pass per account:
//   1. Scan the grid (fast) to get merchant/reward/expiration/id for every
//      added offer.
//   2. Visit each offer's detail page (slower -- this is why it's a
//      separate opt-in step from chase-activate-all.js) to pull the exact
//      "spend $X or more" / "$Y cash back maximum" text, which only exists
//      there, not on the grid tile.
//
// Usage: node chase-capture-offers.js

const { chromium } = require('playwright');
const fs = require('fs');
const { execFileSync } = require('child_process');

const VPS_HOST = 'dyno';
const VPS_OFFERS_DIR = '/root/openclaw/personas/financial-advisor/offers';

const ACCOUNTS = [
  { testIdIndex: 1, label: 'Sapphire Preferred (...1039)', last4: '1039' },
  { testIdIndex: 2, label: 'Freedom Unlimited (...2163)', last4: '2163' },
];

function log(...args) {
  console.log(new Date().toISOString().slice(11, 19), ...args);
}

function parseDetailText(text) {
  // "Earn 15% cash back on your X purchase when you spend $75 or more, ...
  //  with a $15 cash back maximum."
  const spendMatch = text.match(/spend \$([\d,]+(?:\.\d+)?) or more/i);
  const capMatch = text.match(/\$([\d,]+(?:\.\d+)?) cash back maximum/i);
  const expiresMatch = text.match(/Expires on ([A-Za-z]+ \d{1,2}, \d{4})/);
  return {
    spendMin: spendMatch ? parseFloat(spendMatch[1].replace(/,/g, '')) : null,
    cashBackMax: capMatch ? parseFloat(capMatch[1].replace(/,/g, '')) : null,
    expires: expiresMatch ? expiresMatch[1] : null,
  };
}

async function scanGrid(page) {
  await page.getByText('Reset all', { exact: true }).first().click().catch(() => {});
  await page.waitForTimeout(800);
  await page.getByText('Added to card', { exact: true }).first().click();
  await page.waitForTimeout(1500);

  return page.evaluate(() => {
    const tiles = document.querySelectorAll('[data-testid="commerce-tile"]');
    const seen = new Set();
    const rows = [];
    tiles.forEach((tile) => {
      if (seen.has(tile.id)) return;
      seen.add(tile.id);
      const label = tile.getAttribute('aria-label') || '';
      // Shape: "<n> of <total> <Merchant> <reward>[ <n> days left] Success Added"
      const merchantReward = label
        .replace(/^\d+ of \d+\s*/, '')
        .replace(/\s*\d+ days? left.*$/, '')
        .replace(/\s*Success Added.*$/, '')
        .trim();
      const daysLeftMatch = label.match(/(\d+) days? left/);
      rows.push({
        id: tile.id,
        merchantReward,
        daysLeft: daysLeftMatch ? parseInt(daysLeftMatch[1], 10) : null,
      });
    });
    return rows;
  });
}

async function captureAccount(page, account) {
  log(`\n=== ${account.label} ===`);
  await page.goto('https://secure.chase.com/web/auth/dashboard#/dashboard/merchantOffers/offer-hub');
  await page.waitForTimeout(2000);
  await page.locator('[data-testid="select-credit-card-account"]').first().click();
  await page.waitForTimeout(800);
  await page.locator(`[data-testid="user-account-option-${account.testIdIndex}"]`).first().click();
  await page.waitForTimeout(1500);

  const url = page.url();
  const accountIdMatch = url.match(/accountId=(\d+)/);
  const accountId = accountIdMatch ? accountIdMatch[1] : null;
  await page.goto(`https://secure.chase.com/web/auth/dashboard#/dashboard/merchantOffers/offerCategoriesPage?accountId=${accountId}&offerCategoryName=NEW`);
  await page.waitForTimeout(2000);

  const gridRows = await scanGrid(page);
  log(`${gridRows.length} added offers found on grid. Visiting detail pages...`);

  const results = [];
  for (let i = 0; i < gridRows.length; i++) {
    const row = gridRows[i];
    try {
      const el = page.locator(`[data-testid="commerce-tile"][id="${row.id}"]`).first();
      await el.click({ timeout: 10000 });
      await page.waitForTimeout(900);
      const text = await page.evaluate(() => document.body.innerText);
      const parsed = parseDetailText(text);
      // "Offer details" header line is followed by the reward headline as a
      // separate paragraph earlier in the tile scan (merchantReward) --
      // combine both sources rather than re-deriving merchant name here.
      results.push({
        id: row.id,
        card: account.label,
        cardLast4: account.last4,
        merchantAndReward: row.merchantReward,
        spendMin: parsed.spendMin,
        cashBackMax: parsed.cashBackMax,
        expires: parsed.expires,
        daysLeft: row.daysLeft,
      });
      if ((i + 1) % 10 === 0) log(`  ...${i + 1}/${gridRows.length} captured`);
    } catch (e) {
      log(`  ⚠️  ${row.merchantReward} — ${e.message.split('\n')[0]}`);
      results.push({ id: row.id, card: account.label, cardLast4: account.last4,
                     merchantAndReward: row.merchantReward, error: e.message.split('\n')[0] });
    }
    // Back to grid for the next one.
    if (/offer-activated|offer-detail/.test(page.url())) {
      await page.goBack();
      await page.waitForTimeout(1000);
    }
  }

  log(`${account.label}: ${results.length} offers captured.`);
  return results;
}

function fmtMoney(n) {
  return n == null ? '—' : ('$' + n.toFixed(n % 1 === 0 ? 0 : 2));
}

function buildMarkdown(all, capturedDate) {
  const byCard = {};
  for (const d of all) {
    if (d.error) continue;
    (byCard[d.card] = byCard[d.card] || []).push(d);
  }

  let md = `# Current Merchant Offers (auto-captured, replaced monthly)\n\n`;
  md += `**Last captured:** ${capturedDate} · **Cards covered:** ${Object.keys(byCard).join(', ')} (Amex/Citi/Capital One not yet automated).\n\n`;
  md += `**This file is fully REPLACED each capture run** — it always reflects only what's active right now. Don't treat gaps or removed rows as history; the prior state is archived at \`offers/archive/<YYYY-MM>.md\` before each overwrite.\n\n`;
  md += `**How to use this:** when Harry mentions a purchase or asks what to buy, check this table for the merchant first — if there's an active offer, tell him which card and the effective discount. Days-left sorted so the most time-sensitive ones surface first. A blank Spend Min / Max Cash Back means no minimum / uncapped for that field.\n`;

  for (const [card, offers] of Object.entries(byCard)) {
    const sorted = offers.filter(o => o.daysLeft != null).sort((a, b) => a.daysLeft - b.daysLeft);
    const noExpiry = offers.filter(o => o.daysLeft == null);
    md += `\n### ${card} (${offers.length} offers)\n\n`;
    md += '| Merchant | Reward | Spend Min | Max Cash Back | Expires | Days Left |\n';
    md += '|---|---|---|---|---|---|\n';
    for (const o of [...sorted, ...noExpiry]) {
      const parts = o.merchantAndReward.match(/^(.*?)\s+(\d+%|\$[\d.]+)\s+cash back$/i) || [];
      const merchant = parts[1] || o.merchantAndReward;
      const reward = parts[2] || '';
      md += `| ${merchant} | ${reward} cash back | ${fmtMoney(o.spendMin)} | ${fmtMoney(o.cashBackMax)} | ${o.expires || '—'} | ${o.daysLeft ?? '—'} |\n`;
    }
  }
  return md;
}

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9333');
  const context = browser.contexts()[0];
  const pages = context.pages();
  const page = pages[pages.length - 1];

  const all = [];
  for (const account of ACCOUNTS) {
    const rows = await captureAccount(page, account);
    all.push(...rows);
  }

  const capturedDate = new Date().toISOString().slice(0, 10);
  const yearMonth = capturedDate.slice(0, 7);

  const md = buildMarkdown(all, capturedDate);
  const OFFERS_DIR = __dirname + '/offers';
  fs.mkdirSync(OFFERS_DIR + '/archive', { recursive: true });
  fs.writeFileSync(OFFERS_DIR + '/current.md', md);
  fs.writeFileSync(`${OFFERS_DIR}/archive/${yearMonth}.md`, md);
  fs.writeFileSync(`${OFFERS_DIR}/archive/${yearMonth}.json`, JSON.stringify(all, null, 2));

  log(`\nTotal: ${all.length} offers captured.`);
  log(`Written to offers/current.md, offers/archive/${yearMonth}.md/.json (commit these to the repo).`);

  // Also deploy to the VPS so financial-advisor can read it directly as a
  // local file (fast, no repo fetch) -- intentionally duplicated with the
  // repo copy above per Harry's call: repo copy is for browsing/history,
  // VPS copy is what the agent actually reads.
  try {
    log(`\nDeploying to ${VPS_HOST}...`);
    execFileSync('ssh', [VPS_HOST, `mkdir -p ${VPS_OFFERS_DIR}/archive`]);
    const existsCheck = execFileSync('ssh', [VPS_HOST, `test -f ${VPS_OFFERS_DIR}/archive/${yearMonth}.md && echo yes || echo no`]).toString().trim();
    if (existsCheck === 'yes') {
      log(`  (re-running within ${yearMonth} — overwriting this month's existing archive with the latest capture, not creating a duplicate)`);
    }
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
