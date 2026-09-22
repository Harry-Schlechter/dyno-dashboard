// Full end-to-end run: for each real credit card account (Sapphire
// Preferred, Freedom Unlimited -- TOTAL CHECKING has no offers, skipped),
// go to Chase Offers "All offers", filter to "Not added", and activate
// every offer -- then switch to the next account and repeat.
//
// Mechanics (confirmed by hand before writing this):
//  - The "Not added" checkbox filter on the offerCategoriesPage view is the
//    reliable way to see the TRUE remaining count -- the small featured
//    carousel on the offer-hub page is NOT the full catalog and undercounts
//    badly (confirmed: showed 0 pending when 104 were actually pending).
//  - Clicking ANY part of an offer tile (the whole <a>, or the inner + icon
//    -- same element, not two separate controls) navigates to that offer's
//    detail page and activates it there; the click IS the activation, not
//    an in-place toggle. Confirmed via the detail page's "Added to card"
//    text after the click.
//  - page.goBack() from the detail page returns to the exact filtered grid
//    state (account + "Not added" filter both preserved).
//  - All ~100+ "not added" tiles load into the DOM at once on this account
//    (confirmed via scroll test) -- no pagination/infinite-scroll to drive.
//
// Usage: node chase-activate-all.js [maxPerAccount]
//   maxPerAccount safety cap per account, default 200 (covers the ~104 seen
//   so far with headroom; stops early once "Not added" hits 0 regardless).

const { chromium } = require('playwright');

const MAX_PER_ACCOUNT = parseInt(process.argv[2] || '200', 10);

// data-testid="user-account-option-N" order confirmed by inspecting the
// dropdown: 0 = TOTAL CHECKING (skip, not a card), 1 = Sapphire Preferred,
// 2 = Freedom Unlimited.
const ACCOUNTS = [
  { testIdIndex: 1, label: 'Sapphire Preferred (...1039)' },
  { testIdIndex: 2, label: 'Freedom Unlimited (...2163)' },
];

function log(...args) {
  console.log(new Date().toISOString().slice(11, 19), ...args);
}

async function getNotAddedCount(page) {
  return page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('*'))
      .find(e => /^\d+ results$/.test((e.textContent || '').trim()) && e.children.length === 0);
    return el ? parseInt(el.textContent, 10) : null;
  });
}

async function getFirstPendingTile(page) {
  return page.evaluate(() => {
    const tiles = document.querySelectorAll('[data-testid="commerce-tile"]');
    for (const tile of tiles) {
      return { id: tile.id, label: (tile.getAttribute('aria-label') || '').replace(/^\d+ of \d+\s*/, '') };
    }
    return null;
  });
}

async function navigateToAllOffersNotAdded(page) {
  // "All offers" / See all offers from the hub lands on offerCategoriesPage;
  // the category param doesn't matter once we're there since the "All" tab
  // and "Not added" filter override it -- reusing the known URL shape is
  // more reliable than clicking through the hub UI each time.
  const url = page.url();
  const accountIdMatch = url.match(/accountId=(\d+)/);
  const accountId = accountIdMatch ? accountIdMatch[1] : null;
  await page.goto(`https://secure.chase.com/web/auth/dashboard#/dashboard/merchantOffers/offerCategoriesPage?accountId=${accountId}&offerCategoryName=NEW`);
  await page.waitForTimeout(2000);

  // Chase's own "results" count already reflects the filter, so we can just
  // check it: if it doesn't yet match what "Not added" alone would show,
  // click the filter. Simpler and more robust than guessing at checkbox
  // DOM state -- just click it and verify via the count changing or a
  // "Not added" chip appearing, rather than trying to detect prior state.
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

async function clearAccount(page, accountLabel) {
  log(`\n=== ${accountLabel} ===`);
  await navigateToAllOffersNotAdded(page);

  let count = await getNotAddedCount(page);
  log(`Starting count: ${count} not-added offers`);

  let activated = 0, failed = 0;
  for (let i = 0; i < MAX_PER_ACCOUNT; i++) {
    const pending = await getFirstPendingTile(page);
    if (!pending) {
      log(`No more tiles found after ${activated + failed} attempts.`);
      break;
    }
    const remaining = await getNotAddedCount(page);
    if (remaining === 0) {
      log('Not-added count reached 0.');
      break;
    }

    try {
      const el = page.locator(`[data-testid="commerce-tile"][id="${pending.id}"]`).first();
      await el.click({ timeout: 10000 });
      await page.waitForURL(/offer-activated|offer-detail/, { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(700);
      const added = await page.evaluate(() => document.body.innerText.includes('Added to card'));
      if (added) {
        activated++;
        if (activated % 10 === 0) log(`  ...${activated} activated so far`);
      } else {
        failed++;
        log(`  ❌ ${pending.label} — not confirmed added`);
      }
    } catch (e) {
      failed++;
      log(`  ❌ ${pending.label} — ${e.message.split('\n')[0]}`);
    }

    // Return to the same filtered grid for the next iteration.
    if (/offer-activated|offer-detail/.test(page.url())) {
      await page.goBack();
      await page.waitForTimeout(1200);
      // Re-apply the filter defensively in case goBack() lost it.
      const stillFiltered = await getNotAddedCount(page);
      if (stillFiltered === null) {
        await navigateToAllOffersNotAdded(page);
      }
    } else {
      await page.waitForTimeout(800);
    }
  }

  const finalCount = await getNotAddedCount(page);
  log(`${accountLabel}: ${activated} activated, ${failed} failed, ${finalCount ?? '?'} still remaining.`);
  return { activated, failed, finalCount };
}

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9333');
  const context = browser.contexts()[0];
  const pages = context.pages();
  const page = pages[pages.length - 1];

  const summary = [];

  for (const account of ACCOUNTS) {
    // Switch account via the dropdown (stable data-testid regardless of
    // current URL/page).
    await page.goto('https://secure.chase.com/web/auth/dashboard#/dashboard/merchantOffers/offer-hub');
    await page.waitForTimeout(2000);
    await page.locator('[data-testid="select-credit-card-account"]').first().click();
    await page.waitForTimeout(800);
    await page.locator(`[data-testid="user-account-option-${account.testIdIndex}"]`).first().click();
    await page.waitForTimeout(1500);

    const result = await clearAccount(page, account.label);
    summary.push({ account: account.label, ...result });
  }

  log('\n=== SUMMARY ===');
  summary.forEach(s => log(`${s.account}: ${s.activated} activated, ${s.failed} failed, ${s.finalCount ?? '?'} remaining`));

  process.exit(0);
})();
