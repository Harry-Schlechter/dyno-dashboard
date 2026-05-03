import { Transaction } from '../hooks/useFinances';

// ─────────────────────────────────────────────────────────────────────────────
// Filter rules — single source of truth for "real" income / spend
// ─────────────────────────────────────────────────────────────────────────────

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
export const TAXABLE_OVERRIDE_NAMES = new Set(['Joint WROS Brokerage']);

export type FinanceBucket = 'retirement' | 'taxable' | 'cash' | 'credit' | 'other';

export interface AccountLike {
  account_name: string;
  account_type: string;
  account_subtype: string;
}

export const bucketForAccount = (acct: AccountLike): FinanceBucket => {
  if (TAXABLE_OVERRIDE_NAMES.has(acct.account_name)) return 'taxable';
  if (acct.account_type === 'retirement') return 'retirement';
  if (acct.account_type === 'brokerage') return 'taxable';
  if (acct.account_type === 'credit') return 'credit';
  if (acct.account_type === 'depository') return 'cash';
  return 'other';
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
  dailyBurnRate: number;
  projectedMonthSpend: number;
  expectedIncome: number;
  projectedSavings: number;
  annualizedSavings: number;
}

export const daysInMonth = (year: number, month0: number): number =>
  new Date(year, month0 + 1, 0).getDate();

export const projectCurrentMonth = (
  transactions: Transaction[],
  today: Date,
  semiMonthlyPaycheck = DEFAULT_SEMI_MONTHLY_PAYCHECK,
): MonthProjection => {
  const year = today.getFullYear();
  const month0 = today.getMonth();
  const monthKey = `${year}-${String(month0 + 1).padStart(2, '0')}`;

  const inMonth = transactions.filter(t => t.date.startsWith(monthKey));
  const spentSoFar = inMonth
    .filter(isRealSpend)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalDays = daysInMonth(year, month0);
  const daysElapsed = today.getDate();
  const dailyBurnRate = daysElapsed > 0 ? spentSoFar / daysElapsed : 0;
  const projectedMonthSpend = dailyBurnRate * totalDays;

  const income = expectedMonthlyIncome(semiMonthlyPaycheck);
  const projectedSavings = income - projectedMonthSpend;

  return {
    monthKey,
    daysElapsed,
    daysInMonth: totalDays,
    spentSoFar,
    dailyBurnRate,
    projectedMonthSpend,
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
