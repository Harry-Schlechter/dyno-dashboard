// Shared incremental-capture helpers, used by every bank's
// <bank>-activate-and-capture.js script so the logic doesn't drift between
// four separate copies.
//
// The problem this solves: a full monthly run used to re-scan and
// re-process EVERY offer every time, even ones already known-active with
// weeks left on them (confirmed on Citi: offers showing "39d left" the
// same month they were captured will obviously still be valid next
// month). That made Citi's run take ~20-30 min even when almost nothing
// had actually changed. Harry's call: trust our own prior record
// completely for anything not yet expired -- don't even re-check it on
// the live page, just carry it forward. Only spend time on genuinely new
// (not-yet-seen, still-pending) offers.
//
// This requires storing an absolute reference point, not just a relative
// "daysLeft" -- daysLeft captured last month has decayed by the time this
// month's run reads it. Every record now carries `capturedOn` (ISO date
// the row was captured/last verified) alongside `daysLeft`, so staleness
// can be computed as capturedOn + daysLeft < today, without needing to
// look at the site again.

const fs = require('fs');

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function isStillValid(record, todayStr) {
  if (record.daysLeft == null || !record.capturedOn) return false; // no expiry info -- treat as needing re-verification
  const capturedDate = new Date(record.capturedOn + 'T00:00:00');
  const today = new Date(todayStr + 'T00:00:00');
  const daysSinceCaptured = Math.floor((today - capturedDate) / (1000 * 60 * 60 * 24));
  const daysRemaining = record.daysLeft - daysSinceCaptured;
  return daysRemaining > 0;
}

// Loads the last-run archive/JSON for a bank (if present) and splits it
// into { valid, expiredMerchants } -- valid records carry forward as-is
// into the new run's output; expiredMerchants is a Set of names so the
// live-page pass knows to treat those as "needs fresh capture" even if it
// finds them still showing as activated (the offer likely refreshed/
// renewed with a new expiry, which we can't know without looking).
function loadPriorState(currentMdJsonPath) {
  if (!fs.existsSync(currentMdJsonPath)) {
    return { valid: [], expiredMerchants: new Set(), priorMerchantSet: new Set() };
  }
  let records;
  try {
    records = JSON.parse(fs.readFileSync(currentMdJsonPath, 'utf8'));
  } catch (e) {
    return { valid: [], expiredMerchants: new Set(), priorMerchantSet: new Set() };
  }
  const today = todayIso();
  const valid = [];
  const expiredMerchants = new Set();
  const priorMerchantSet = new Set();
  for (const r of records) {
    priorMerchantSet.add(r.merchant);
    if (isStillValid(r, today)) {
      valid.push(r);
    } else {
      expiredMerchants.add(r.merchant);
    }
  }
  return { valid, expiredMerchants, priorMerchantSet };
}

// Most recent archive JSON for a bank, by filename pattern (e.g.
// "citi-2026-09.json"). Looks at offers/archive/ and offers/<bank>-current.json
// isn't a thing we write (only .md) -- the ARCHIVE json from the last run
// this file this is called from IS the prior-state source, since
// current.md has no machine-readable per-record capturedOn field embedded
// (it's markdown for humans/the agent) -- archive JSON is the real source
// of truth for "what did we know and when."
function findMostRecentArchive(offersDir, bankPrefix) {
  const archiveDir = offersDir + '/archive';
  if (!fs.existsSync(archiveDir)) return null;
  const pattern = bankPrefix ? new RegExp(`^${bankPrefix}-(\\d{4}-\\d{2})\\.json$`) : /^(\d{4}-\d{2})\.json$/;
  const matches = fs.readdirSync(archiveDir)
    .map(f => ({ file: f, m: f.match(pattern) }))
    .filter(x => x.m)
    .sort((a, b) => b.m[1].localeCompare(a.m[1])); // newest year-month first
  return matches.length > 0 ? `${archiveDir}/${matches[0].file}` : null;
}

module.exports = { todayIso, isStillValid, loadPriorState, findMostRecentArchive };
