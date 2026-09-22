# Credit card offer auto-activation

Automates "click every card-linked offer" across Harry's credit cards, so financial-advisor always has an up-to-date table of active merchant offers instead of them going unused because logging into 4 bank sites monthly is tedious.

## How to run this (monthly, or whenever)

1. **Launch a browser and log in.** Which browser depends on the bank (see Per-bank notes below) — usually:
   ```
   node open-browser.js "https://secure.chase.com"
   ```
   This opens a real, visible Chrome window with a persistent profile saved to `browser-profile/` — log in there like normal. Your credentials never touch any script; they go straight to the bank.

2. **Run the bank's script**, e.g.:
   ```
   node chase-activate-and-capture.js  # both Chase cards
   node amex-activate-and-capture.js   # Amex Gold
   node citi-activate-and-capture.js   # Citi Custom Cash
   ```
   Each script prints progress and writes results to `offers/current.md` (Chase) or `offers/<bank>-current.md` (Amex/Citi) + a dated file under `offers/archive/`, then auto-deploys those same files to the VPS via `scp` so financial-advisor can read them.

3. **Commit the `offers/` folder** so the repo has a browsable history too (duplicated with the VPS copy on purpose — VPS copy is what the agent actually reads day-to-day, repo copy is for browsing/version history).

**First run per bank is slow (7-30 min depending on catalog size); every run after that is fast (seconds to ~1 min) if not much changed.** See "Incremental capture" below.

**Design principle for any new bank script (learned the hard way on Citi): always ACTIVATE and CAPTURE in the SAME pass, offer by offer — never activate everything first and come back to scrape it in a second pass.** A separate later capture pass reads a different DOM/page state than existed during activation and can silently miss offers (Citi went from capturing 278/330 with two passes to a clean single flat read once combined). Read + record each offer's data at the exact moment you're already looking at it to activate it.

## Incremental capture (added 2026-09, all three banks)

Re-running a script every month used to mean fully re-scanning and re-processing EVERY offer, even ones with weeks left that obviously hadn't changed (confirmed: a full Citi run took ~20-30 min even when almost nothing was actually new). Harry's call: **trust the prior capture completely for anything not yet expired — don't even re-check it on the live page, just carry the row forward unchanged.** Only spend time on genuinely new offers.

How it works (`incremental.js`, shared by all three scripts):
- Every captured record carries either an absolute `expires` date (Amex) or a `capturedOn` date + relative `daysLeft` (Chase, Citi) — enough to compute "is this still valid" without looking at the site again.
- At the start of a run, the script loads the most recent `offers/archive/<bank->YYYY-MM.json`, splits records into still-valid (carried forward untouched) vs. expired/unknown (needs a fresh look).
- The live-page pass only activates/captures merchants NOT already in the valid set.
- Final `current.md`/archive = carried-forward records + this run's newly-captured ones, merged.

**Real bug hit building this, worth remembering:** Chase's activation loop only ever scans the "Not added" filtered view (to find things to activate) — once everything valid gets skipped there (correctly), a run can find 0 things to do and, if the script ONLY wrote what that pass found, would report almost nothing, silently wiping out hundreds of already-known-good offers from `current.md`. Real data loss happened this way on the first incremental run (217 offers → 1) before being caught and fixed. **The fix: every bank's script needs a second pass over the "Added to card" / already-active view too, not just "what's new" — otherwise "nothing new happened" gets mistaken for "there's nothing here."** Chase's second pass still visits each offer's detail page for full spend-min/cap data (Harry's call: keep full detail, don't trade it for speed) but skips anything already in the valid set, so it's still fast once the baseline is established.

## Where the data ends up

- `offers/current.md` (Chase, both cards) / `offers/amex-current.md` / `offers/citi-current.md` — always-current snapshot per bank, fully REPLACED each run. This is what financial-advisor reads.
- `offers/archive/<YYYY-MM>.md` + `.json` (Chase) / `archive/amex-<YYYY-MM>.md` + `.json` / `archive/citi-<YYYY-MM>.md` + `.json` — one snapshot per month per bank, permanent, never overwritten by a later month (re-running within the same month DOES overwrite that month's archive — it's "latest capture this month," not "every run ever").
- Same files also live at `personas/financial-advisor/offers/` on the VPS (`dyno` host) — that's the copy the agent actually reads locally, fast, no repo fetch needed.

## Per-bank notes (read before adding a new bank)

### Chase — done (2026-09)
- Browser: Playwright's bundled Chromium is fine (`open-browser.js`, default).
- Gotcha: the featured carousel on the offers HOME page is NOT the full offer list — it showed 0 pending when 104 were actually pending. Use "See all offers" → filter "Not added" to get the real list.
- Activation = click the tile → navigates to a detail page → shows "Added to card" → `page.goBack()` returns to the same filtered grid. Spend minimum / cash-back cap only exist on this detail page, not the grid tile.
- Two accounts (Sapphire Preferred, Freedom Unlimited) — switch via `[data-testid="user-account-option-N"]` in the account dropdown. Each account is processed fully (both passes) before switching to the next.
- `chase-activate-and-capture.js` runs TWO passes per account: Pass 1 filters "Not added" and activates anything genuinely new (full detail captured from the same detail-page visit the click requires); Pass 2 filters "Added to card" and visits each NOT-already-known offer's detail page too, to fully capture things that were already active before this run (this pass is what a two-pass-vs-one-pass bug was found and fixed in -- see "Incremental capture" above). Both passes skip anything already valid from a prior capture.

### American Express Gold — done (2026-09)
- Browser: **Playwright's bundled Chromium is BLOCKED at login** (403 + CORS failure before credentials are even checked — bot fingerprinting on the browser binary itself, not behavior). Also, modern Chrome (136+) blocks CDP attachment to your real DEFAULT profile as a security measure, so you can't use your everyday Chrome either.
  **Fix that worked:** launch a fresh SECONDARY Chrome profile with real Chrome + debugging:
  ```
  mkdir -p ~/chrome-debug-profile
  /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
    --remote-debugging-port=9333 \
    --user-data-dir=~/chrome-debug-profile \
    "https://www.americanexpress.com/en-us/account/login"
  ```
  Log in there. This profile persists (same idea as `browser-profile/`), so you likely won't need to re-login every month.
- Amex's page runs with `eval` DISABLED — `page.evaluate()` throws "eval is disabled". Every script for this bank must use Playwright locators (`.textContent()`, `.getAttribute()`, `.click()`) only, never `page.evaluate()`.
- Activation is IN-PLACE (+ button flips to a checkmark, no navigation) — much simpler than Chase.
- All offers load in the DOM at once, no pagination/scroll-loading, no "see all" view needed to find in the whole list.
- Per-card anchor for scraping: `[data-testid="merchantOfferDetailsLink"]`, its 2nd ancestor (`xpath=../..`) is exactly one offer's clean text block — the add-button testid (`merchantOfferListAddButton`) only exists on still-pending offers so it can't anchor the post-activation capture pass.
- Only one card (Amex Gold) — no account switcher.
- Occasional `locator.click` timeouts (~1 in 10) — not fatal, the retry loop in `amex-activate-and-capture.js` recovers automatically (stops only after 3 consecutive failures).

### Citi Custom Cash — done (2026-09)
- Browser: real Chrome secondary profile worked fine (same one used for Amex — `~/chrome-debug-profile`), no login block encountered. `page.evaluate()` works (not blocked like Amex).
- Enroll buttons: `[aria-label^="Enroll in Offer for <Merchant>"]`. Once activated, Citi SWAPS the button's aria-label entirely to `"<reward> for <Merchant>"` (e.g. `"$30 Back for Avis"`) — capture logic must match BOTH label shapes, not just the pending one, or a capture pass will find almost nothing once most offers are already activated.
- Activation click opens a rich confirmation modal in-place (no navigation) showing spend min/cap/expiry/terms — even more detail than Amex's grid gave for free. Must wait for the modal to actually render before clicking `[aria-label="Close"]`, and use Escape as a fallback — closing too early (e.g. on offers with a "You might also like..." recommendation section inside the modal, which renders slower) left a stuck modal blocking the next click.
- **Initially misdiagnosed as a virtualized/lazy-loading list** (DOM nodes appearing/disappearing on scroll) — actually the page lazy-renders ONCE on initial page load (0 offer buttons right after a fresh reload, growing as you scroll the first time), but once that settles, ALL ~400 offer buttons stay in the DOM simultaneously with no further virtualization. One scroll-to-bottom-and-back pass up front (`forceFullLoad`) is enough; no repeated scroll-and-rescan loop needed after that.
- Big catalog: ~750 pending offers on first run (includes lots of small local/regional merchants, especially Dining — Harry's call: activate everything anyway since it's free, no per-offer cost to having an unused small local deal active).
- One card only (Custom Cash) — no account switcher.

### Capital One — done (2026-09), CAPTURE ONLY, no activation
- Browser: real Chrome secondary profile (same as Amex/Citi), no login block. `page.evaluate()` works.
- The real offers UI lives on a SEPARATE domain, `capitaloneoffers.com` (reached via "View all offers" from the main `myaccounts.capitalone.com` dashboard) — not on the bank's own domain like the other 3.
- **Fundamentally different offer model from every other bank:** the vast majority (~4,600 of ~4,700+) are "Online" offers that need NO activation at all — they're auto-tracked whenever Harry shops with the card, there's nothing to click. Only a small subset (~35) are "In-Store" (or "In-Store & Online"/"In-Store & In-App" hybrid) and DO need a real activation click.
- **In-store activation is capped at 3 CONCURRENT slots, 7-day expiry each** (confirmed live: activating a 3rd blocked further activation with "3 of 3 activated" until one expired) — with ~35 in-store offers available and only 3 usable at a time, scripted "activate everything" doesn't make sense the way it did for the other 3 banks. Harry's call: **capture-only, no activation attempted** — `capone-capture.js` just records everything (flagging in-store ones as "needs manual activation, max 3 at a time") and leaves actual activation to Harry.
- Merchant names are NOT in `document.body.innerText` at all — they're rendered as `<img alt="Merchant">` logos, not text. Every merchant extraction reads `img[alt]` inside each `.standard-tile`, never `.textContent` for the name itself.
- Catalog does NOT infinite-scroll on its own — it's paginated behind a "View More Offers" button that must be clicked repeatedly (confirmed: 47 clicks to exhaust it, 149 → 4,719 tiles). Scroll alone never loads past the first page — a real gotcha, easy to assume it's scroll-based like Citi and undercount badly.
- The SAME catalog shows regardless of which card is selected in the "Apply my offer to" dropdown (Venture X vs. the former Discover it, now Capital One-branded) — confirmed identical merchant order on both. Only capture once, not once per card.
- No expiration date shown anywhere (grid or detail modal) for Online offers — only In-Store ones show a real date. With ~4,700 offers this size, per-offer expiry isn't practical to capture anyway; incremental re-runs use a flat 30-day trust window from capture date instead of per-offer dates like the other 3 banks.
- Watch for `Bonus`/`In-App` badge text leaking into parsed reward strings if a tile has a "BONUS" ribbon or is type "In-Store & In-App" (a third type variant beyond "Online"/"In-Store"/"In-Store & Online") — caught and fixed during the first real run.

## Files

- `open-browser.js` — launches a persistent-profile Chromium window (Playwright's bundled browser). Works for Chase; blocked by Amex/likely other banks with bot detection.
- `inspect.js` — dumps clickable elements or a selector's HTML from whatever page is open, for exploring a new bank's DOM structure.
- `incremental.js` — shared helpers (`loadPriorState`, `findMostRecentArchive`, `isStillValid`) used by all three bank scripts for the skip-already-known logic. Read this before touching any bank script's incremental behavior.
- `chase-activate-and-capture.js` — activates + captures full detail for both Chase cards in one run (Playwright's bundled browser).
- `amex-activate-and-capture.js` — activates + captures for Amex Gold in one run (real Chrome required, see notes above).
- `citi-activate-and-capture.js` — activates + captures for Citi Custom Cash in one run (real Chrome, same profile as Amex).
- `capone-capture.js` — captures (no activation) for Capital One (Venture X + the former Discover it card, same catalog for both). Real Chrome, same profile as Amex/Citi.
- `offers/` — output data, committed to the repo (also deployed to the VPS).
