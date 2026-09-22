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
   node chase-activate-all.js       # activates every pending offer, both Chase cards
   node chase-capture-offers.js     # captures ALL offers (merchant/reward/spend-min/expiry) into offers/
   node amex-activate-and-capture.js  # does both steps in one for Amex
   node citi-activate-and-capture.js  # does both steps in one for Citi
   ```
   Each script prints progress and writes results to `offers/current.md` (or `offers/<bank>-current.md`) + a dated file under `offers/archive/`, then auto-deploys those same files to the VPS via `scp` so financial-advisor can read them.

3. **Commit the `offers/` folder** so the repo has a browsable history too (duplicated with the VPS copy on purpose — VPS copy is what the agent actually reads day-to-day, repo copy is for browsing/version history).

Total time once logged in: Chase ~7 min (100-200+ offers, one page load per offer), Amex ~2 min (in-place activation, no navigation), Citi ~15-20 min first run if there's a large pending backlog (700+ offers seen on first run; a monthly incremental run should be much faster since most stay activated). Budget ~20-30 min per bank including login on a first run.

**Design principle for any new bank script (learned the hard way on Citi): always ACTIVATE and CAPTURE in the SAME pass, offer by offer — never activate everything first and come back to scrape it in a second pass.** A separate later capture pass reads a different DOM/page state than existed during activation and can silently miss offers (Citi went from capturing 278/330 with two passes to a clean single flat read once combined). Read + record each offer's data at the exact moment you're already looking at it to activate it.

## Where the data ends up

- `offers/current.md` (Chase, both cards) / `offers/amex-current.md` / `offers/citi-current.md` — always-current snapshot per bank, fully REPLACED each run. This is what financial-advisor reads.
- `offers/archive/<YYYY-MM>.md` + `.json` (Chase) / `archive/amex-<YYYY-MM>.md` + `.json` / `archive/citi-<YYYY-MM>.md` + `.json` — one snapshot per month per bank, permanent, never overwritten by a later month (re-running within the same month DOES overwrite that month's archive — it's "latest capture this month," not "every run ever").
- Same files also live at `personas/financial-advisor/offers/` on the VPS (`dyno` host) — that's the copy the agent actually reads locally, fast, no repo fetch needed.

## Per-bank notes (read before adding a new bank)

### Chase — done (2026-09)
- Browser: Playwright's bundled Chromium is fine (`open-browser.js`, default).
- Gotcha: the featured carousel on the offers HOME page is NOT the full offer list — it showed 0 pending when 104 were actually pending. Use "See all offers" → filter "Not added" to get the real list.
- Activation = click the tile → navigates to a detail page → shows "Added to card" → `page.goBack()` returns to the same filtered grid.
- Two accounts (Sapphire Preferred, Freedom Unlimited) — switch via `[data-testid="user-account-option-N"]` in the account dropdown.
- Spend minimum / cash-back cap only exist on the detail page, not the grid — `chase-capture-offers.js` visits every offer's detail page a second time to get these (slower, ~7 min for ~200 offers).

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

### Capital One — not yet built
Investigate the same way: `open-browser.js` first, see if Chase's approach (Playwright bundled Chromium) works or if it needs the real-Chrome-secondary-profile workaround like Amex/Citi. Find the real "all offers" view before assuming a homepage widget shows everything (Chase's carousel undercounted badly). Check whether `page.evaluate()` works or is blocked before writing selectors. Check whether the offers list actually virtualizes on scroll or just lazy-loads once (see Citi notes) before writing scroll-handling logic — get this wrong and a later capture pass can silently miss most of the list.

## Files

- `open-browser.js` — launches a persistent-profile Chromium window (Playwright's bundled browser). Works for Chase; blocked by Amex/likely other banks with bot detection.
- `inspect.js` — dumps clickable elements or a selector's HTML from whatever page is open, for exploring a new bank's DOM structure.
- `chase-activate-all.js` — activates every pending offer across both Chase cards.
- `chase-capture-offers.js` — captures full offer detail (spend min, cap, expiry) for both Chase cards, builds `offers/current.md`, deploys to VPS.
- `amex-activate-and-capture.js` — does both activation and capture for Amex in one run (real Chrome required, see notes above).
- `citi-activate-and-capture.js` — does both activation and capture for Citi in one run (real Chrome, same profile as Amex).
- `offers/` — output data, committed to the repo (also deployed to the VPS).
