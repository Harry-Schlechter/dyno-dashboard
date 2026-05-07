import { Transaction } from '../hooks/useFinances';

// ─────────────────────────────────────────────────────────────────────────────
// Filter rules — single source of truth for "real" income / spend
// ─────────────────────────────────────────────────────────────────────────────

// The canonical category list. The agent uses only these. After agent review,
// no row should remain `uncategorized` — that bucket only exists for rows the
// system genuinely can't classify pre-review.
export const SPEND_CATEGORIES = [
  'dining',
  'groceries',
  'transport',     // rideshare, transit, parking, tolls (NOT car ownership)
  'car',           // gas, insurance, repairs, registration, EV charging
  'shopping',
  'fitness',       // climbing, golf, gym, sports, fitness apps, equipment
  'health',        // vitamins, supplements, beauty, glasses
  'medical',       // doctor visits, Rx, dentist, copays, IASP
  'entertainment', // movies, concerts, games, bars/nightlife, NYT
  'utilities',     // internet, phone, electric, water, cable
  'technology',    // iCloud, AI tools, hosting, dev tools
  'travel',        // flights, hotels, Airbnb (work + leisure — vacation merged)
  'sydney',        // anything specific to Sydney's medical school / her
  'misc',          // catch-all for one-offs that don't fit
  'uncategorized', // pre-review only — should never persist post-review
] as const;

export type SpendCategory = typeof SPEND_CATEGORIES[number];

// These should never appear in financial_transactions. cc_payment + transfer
// are hard-deleted. 401k + investment activity live in financial_investment_activity.
// reimbursement variants stay in transactions but excluded from spend totals.
export const EXCLUDE_FROM_REAL_SPEND_CATEGORIES = new Set([
  'cc_payment',
  'transfer',
  '401k',
  'medical_reimbursed',
  'reimbursement',
  'travel_reimbursed',
]);

const INVESTMENT_DESCRIPTION_RE = /\b(buy|sell)\b.*\bshares?\b|cash dividend/i;

const CC_PAYMENT_DESCRIPTION_RE =
  /AMEX EPAYMENT|CHASE CREDIT CRD EPAY|AUTOPAY PAYMENT|MOBILE PAYMENT|ONLINE PAYMENT|Payment Thank You|Payment to Chase card/i;

export const isInvestmentActivity = (tx: Pick<Transaction, 'description'>): boolean =>
  INVESTMENT_DESCRIPTION_RE.test(tx.description || '');

export const isCCPayment = (tx: Pick<Transaction, 'description' | 'custom_category'>): boolean =>
  tx.custom_category === 'cc_payment' || CC_PAYMENT_DESCRIPTION_RE.test(tx.description || '');

export const isRealSpend = (tx: Transaction): boolean => {
  if (tx.amount >= 0) return false;
  if (EXCLUDE_FROM_REAL_SPEND_CATEGORIES.has(tx.custom_category || '')) return false;
  if (isCCPayment(tx)) return false;
  if (isInvestmentActivity(tx)) return false;
  return true;
};

export const isRealIncome = (tx: Transaction): boolean => {
  if (tx.amount <= 0) return false;
  if (isCCPayment(tx)) return false;
  if (isInvestmentActivity(tx)) return false;
  if (tx.custom_category === 'transfer') return false;
  if (tx.custom_category === '401k') return false;
  if (tx.custom_category === 'cc_payment') return false;
  return true;
};

// ─────────────────────────────────────────────────────────────────────────────
// Account classification — overrides the raw account_type column
// ─────────────────────────────────────────────────────────────────────────────

// Joint WROS holds an emergency-fund SPAXX position but is a taxable brokerage,
// not retirement. Override account_type-based grouping for this account.
export const BROKERAGE_OVERRIDE_NAMES = new Set(['Joint WROS Brokerage']);

export type FinanceBucket = 'retirement' | 'brokerage' | 'cash' | 'credit' | 'other';

export interface AccountLike {
  account_name: string;
  account_type: string;
  account_subtype: string;
}

export const bucketForAccount = (acct: AccountLike): FinanceBucket => {
  if (BROKERAGE_OVERRIDE_NAMES.has(acct.account_name)) return 'brokerage';
  if (acct.account_type === 'retirement') return 'retirement';
  if (acct.account_type === 'brokerage') return 'brokerage';
  if (acct.account_type === 'credit') return 'credit';
  if (acct.account_type === 'depository') return 'cash';
  return 'other';
};

// ─────────────────────────────────────────────────────────────────────────────
// Net worth breakdown (4 buckets for the home/overview hero)
// ─────────────────────────────────────────────────────────────────────────────

export interface AccountWithBalance extends AccountLike {
  id: string;
  current_balance: number;
  is_active: boolean;
  account_subtype: string;
}

export interface HoldingLike {
  account_id: string;
  ticker: string;
  current_value: number;
  asset_class?: string;
  snapshot_date?: string;
}

export interface NetWorthBreakdown {
  fourOhOneK: number;     // 401(k)
  roth: number;           // Roth IRA + Crypto Roth
  brokerage: number;      // taxable brokerage MINUS cash-equivalent positions (SPAXX etc.)
  cash: number;           // depository + cash-equivalent positions held inside brokerage
}

// Tickers / asset classes treated as cash even when held in a brokerage account.
const CASH_EQUIVALENT_TICKERS = new Set(['SPAXX', 'FCASH', 'FDRXX', 'FZFXX']);
const isCashEquivalent = (h: HoldingLike): boolean =>
  CASH_EQUIVALENT_TICKERS.has((h.ticker || '').toUpperCase())
  || (h.asset_class || '').toLowerCase() === 'cash';

export const computeNetWorthBreakdown = (
  accounts: AccountWithBalance[],
  holdings: HoldingLike[],
): NetWorthBreakdown => {
  const result: NetWorthBreakdown = { fourOhOneK: 0, roth: 0, brokerage: 0, cash: 0 };

  // Pick latest snapshot per account, then identify cash-equivalent positions
  // within that snapshot only. This keeps stale ghost positions from inflating
  // the cash bucket while still respecting that different accounts may have
  // last synced on different days.
  const latestPerAccount = new Map<string, string>();
  for (const h of holdings) {
    if (!h.snapshot_date) continue;
    const cur = latestPerAccount.get(h.account_id);
    if (!cur || h.snapshot_date > cur) latestPerAccount.set(h.account_id, h.snapshot_date);
  }
  const cashByAccount = new Map<string, number>();
  for (const h of holdings) {
    if (h.snapshot_date && h.snapshot_date !== latestPerAccount.get(h.account_id)) continue;
    if (!isCashEquivalent(h)) continue;
    cashByAccount.set(h.account_id, (cashByAccount.get(h.account_id) || 0) + h.current_value);
  }

  for (const a of accounts) {
    if (!a.is_active) continue;
    const balance = a.current_balance;
    if (balance <= 0) continue;
    const bucket = bucketForAccount(a);
    const cashInside = cashByAccount.get(a.id) || 0;

    if (bucket === 'retirement') {
      const subtype = (a.account_subtype || '').toLowerCase();
      if (subtype.includes('roth')) result.roth += balance;
      else result.fourOhOneK += balance;
    } else if (bucket === 'brokerage') {
      // Peel cash-equivalent positions out of the brokerage figure.
      const equityPortion = Math.max(0, balance - cashInside);
      result.brokerage += equityPortion;
      result.cash += cashInside;
    } else if (bucket === 'cash') {
      result.cash += balance;
    }
    // 'other' (HSA, transit, parking) is intentionally excluded from the
    // 4-bucket breakdown — they're niche and rounding noise.
  }
  return result;
};

// ─────────────────────────────────────────────────────────────────────────────
// Projection math
// ─────────────────────────────────────────────────────────────────────────────

// Current net semi-monthly paycheck (post-raise, 2026-04). User is paid twice monthly
// (24 checks/year), not biweekly. Editable later via settings.
export const DEFAULT_SEMI_MONTHLY_PAYCHECK = 4055.10;

export const expectedMonthlyIncome = (semiMonthlyPaycheck = DEFAULT_SEMI_MONTHLY_PAYCHECK): number =>
  semiMonthlyPaycheck * 2;

export interface MonthProjection {
  monthKey: string;            // 'YYYY-MM'
  daysElapsed: number;
  daysInMonth: number;
  spentSoFar: number;
  dailyBurnRate: number;       // typical-spend daily rate (excludes one-offs)
  projectedMonthSpend: number; // typical extrapolation + one-offs already booked
  oneOffsSoFar: number;        // sum of large lumpy charges this month so far
  oneOffs: { description: string; merchant: string; amount: number; date: string; category: string }[];
  expectedIncome: number;
  projectedSavings: number;
  annualizedSavings: number;
}

export const daysInMonth = (year: number, month0: number): number =>
  new Date(year, month0 + 1, 0).getDate();

// Categories where a single large charge is almost always a discrete event
// (booking, big purchase) rather than recurring daily spend. Charges ≥ the
// threshold in these categories are treated as "one-offs" — added to the
// projection at face value instead of being extrapolated across the month.
export const LUMPY_CATEGORIES = new Set([
  'travel',
  'medical',
  'health',    // pro memberships (IASP), dentist, glasses
  'shopping',  // big-ticket items like a TV, mattress
  'sydney',    // tuition / one-time school fees
  'misc',
  'car',       // repairs / registration
]);
export const LUMPY_THRESHOLD = 200;

export const isLumpyOneOff = (tx: Transaction): boolean => {
  const cat = tx.custom_category || '';
  if (!LUMPY_CATEGORIES.has(cat)) return false;
  return Math.abs(tx.amount) >= LUMPY_THRESHOLD;
};

export const projectCurrentMonth = (
  transactions: Transaction[],
  today: Date,
  semiMonthlyPaycheck = DEFAULT_SEMI_MONTHLY_PAYCHECK,
): MonthProjection => {
  const year = today.getFullYear();
  const month0 = today.getMonth();
  const monthKey = `${year}-${String(month0 + 1).padStart(2, '0')}`;

  const inMonth = transactions.filter(t => t.date.startsWith(monthKey)).filter(isRealSpend);

  const lumpyTxns = inMonth.filter(isLumpyOneOff);
  const typicalTxns = inMonth.filter(t => !isLumpyOneOff(t));

  const typicalSpentSoFar = typicalTxns.reduce((s, t) => s + Math.abs(t.amount), 0);
  const oneOffsSoFar = lumpyTxns.reduce((s, t) => s + Math.abs(t.amount), 0);
  const spentSoFar = typicalSpentSoFar + oneOffsSoFar;

  const totalDays = daysInMonth(year, month0);
  const daysElapsed = today.getDate();
  const dailyBurnRate = daysElapsed > 0 ? typicalSpentSoFar / daysElapsed : 0;
  const projectedTypical = dailyBurnRate * totalDays;
  const projectedMonthSpend = projectedTypical + oneOffsSoFar;

  const income = expectedMonthlyIncome(semiMonthlyPaycheck);
  const projectedSavings = income - projectedMonthSpend;

  return {
    monthKey,
    daysElapsed,
    daysInMonth: totalDays,
    spentSoFar,
    dailyBurnRate,
    projectedMonthSpend,
    oneOffsSoFar,
    oneOffs: lumpyTxns
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
      .map(t => ({
        description: t.description,
        merchant: t.merchant_name,
        amount: Math.abs(t.amount),
        date: t.date,
        category: t.custom_category || 'uncategorized',
      })),
    expectedIncome: income,
    projectedSavings,
    annualizedSavings: projectedSavings * 12,
  };
};

// Average real spend over the trailing N completed months (excludes current partial month).
export const trailingMonthlyAvgSpend = (
  transactions: Transaction[],
  today: Date,
  monthsBack = 3,
): number => {
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const byMonth: Record<string, number> = {};

  for (const t of transactions) {
    if (!isRealSpend(t)) continue;
    const monthKey = t.date.slice(0, 7);
    if (monthKey >= currentMonthKey) continue; // skip current + future
    byMonth[monthKey] = (byMonth[monthKey] || 0) + Math.abs(t.amount);
  }

  const sortedMonths = Object.keys(byMonth).sort().reverse().slice(0, monthsBack);
  if (sortedMonths.length === 0) return 0;
  const sum = sortedMonths.reduce((s, k) => s + byMonth[k], 0);
  return sum / sortedMonths.length;
};

export interface CategorySpend {
  category: string;
  total: number;
  count: number;
}

export const spendByCategory = (transactions: Transaction[]): CategorySpend[] => {
  const map = new Map<string, { total: number; count: number }>();
  for (const t of transactions) {
    if (!isRealSpend(t)) continue;
    // Normalize 'Uncategorized' vs 'uncategorized' casing collision in the data
    const rawCat = t.custom_category || 'uncategorized';
    const cat = rawCat.toLowerCase() === 'uncategorized' ? 'uncategorized' : rawCat;
    const cur = map.get(cat) || { total: 0, count: 0 };
    cur.total += Math.abs(t.amount);
    cur.count += 1;
    map.set(cat, cur);
  }
  return [...map.entries()]
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.total - a.total);
};

export const filterTransactionsByRange = (
  transactions: Transaction[],
  startDate: string,
  endDate: string,
): Transaction[] => transactions.filter(t => t.date >= startDate && t.date <= endDate);

/**
 * Sum real spend in a date range. Use this anywhere you need "actual money out the door"
 * for a fixed period — last month, last week, etc.
 */
export const sumRealSpendInRange = (
  transactions: Transaction[],
  startDate: string,
  endDate: string,
): number =>
  filterTransactionsByRange(transactions, startDate, endDate)
    .filter(isRealSpend)
    .reduce((s, t) => s + Math.abs(t.amount), 0);

/**
 * Saved-in-period = expected income for the period − real spend in the period.
 * Income is the configured semi-monthly paycheck × 2 (monthly), since paycheck
 * deposits are sometimes mis-tagged in the transaction stream.
 */
export const savedLastMonth = (
  transactions: Transaction[],
  startDate: string,
  endDate: string,
  semiMonthlyPaycheck = DEFAULT_SEMI_MONTHLY_PAYCHECK,
): number => expectedMonthlyIncome(semiMonthlyPaycheck) - sumRealSpendInRange(transactions, startDate, endDate);
