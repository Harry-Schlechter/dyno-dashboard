import { Transaction } from '../hooks/useFinances';
import { isRealSpend } from './finance';

// "What am I actually spending" — one definition shared by the Spending tab.
// A charge lands in exactly one bucket:
//   travel   – category is travel (trips come in lumps, roughly quarterly)
//   oneoff   – tagged `one_off` by the agent (or by Harry in the dashboard) — judgment, not an amount
//   everyday – everything else: the baseline you can actually work on
export type Bucket = 'everyday' | 'oneoff' | 'travel';

export const BUCKET_LABEL: Record<Bucket, string> = {
  everyday: 'Everyday',
  oneoff: 'One-offs',
  travel: 'Travel',
};
export const BUCKET_COLOR: Record<Bucket, string> = {
  everyday: '#5B8DEF',
  oneoff: '#FF9800',
  travel: '#9C6ADE',
};

export const ONE_OFF_TAG = 'one_off';
// Untagged charges at/above this are shown as "review" so a big one never slips by unnoticed.
export const REVIEW_THRESHOLD = 300;

export interface SpendTx {
  id: string;
  date: string;
  merchant: string;
  category: string;
  amount: number; // positive dollars spent (post-split share)
  original: number | null;
  note: string | null;
  tags: string[];
  review: boolean; // big, untagged, not travel — agent/Harry hasn't ruled on it
  bucket: Bucket;
}

export const bucketOf = (category: string, tags: string[]): Bucket => {
  if (category === 'travel') return 'travel';
  return tags.includes(ONE_OFF_TAG) ? 'oneoff' : 'everyday';
};

export const toSpendTxs = (txs: Transaction[]): SpendTx[] =>
  txs.filter(isRealSpend).map(t => {
    const category = t.custom_category || 'uncategorized';
    const amount = Math.abs(Number(t.amount));
    const tags = Array.isArray(t.tags) ? t.tags : [];
    const bucket = bucketOf(category, tags);
    return {
      id: t.id,
      date: t.date,
      merchant: (t.merchant_name || t.description || 'Unknown').trim(),
      category,
      amount,
      original: t.original_amount != null ? Math.abs(Number(t.original_amount)) : null,
      note: t.split_note,
      tags,
      review: bucket === 'everyday' && amount >= REVIEW_THRESHOLD,
      bucket,
    };
  });

export interface MonthRow {
  month: string; // YYYY-MM
  everyday: number;
  oneoff: number;
  travel: number;
  total: number;
  partial: boolean;
}

export const monthKey = (d: string) => d.slice(0, 7);

/** The last `n` calendar months ending with the current (partial) one. */
export const lastMonths = (today: Date, n: number): string[] => {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
};

export const buildMonthRows = (spend: SpendTx[], months: string[], currentMonth: string): MonthRow[] =>
  months.map(m => {
    const row: MonthRow = { month: m, everyday: 0, oneoff: 0, travel: 0, total: 0, partial: m === currentMonth };
    spend.forEach(t => {
      if (monthKey(t.date) !== m) return;
      row[t.bucket] += t.amount;
      row.total += t.amount;
    });
    return row;
  });

export const median = (xs: number[]): number => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

export const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export interface CategoryTrend {
  category: string;
  recent: number; // avg/mo over the most recent complete months
  prior: number;  // avg/mo over the months before that
  delta: number;
}

/** Everyday spend by category: recent avg/mo vs the window before it. */
export const categoryTrends = (spend: SpendTx[], completeMonths: string[], window = 3): CategoryTrend[] => {
  const recentM = completeMonths.slice(-window);
  const priorM = completeMonths.slice(-window * 2, -window);
  const sum = (months: string[]) => {
    const m = new Map<string, number>();
    spend.forEach(t => {
      if (t.bucket !== 'everyday' || !months.includes(monthKey(t.date))) return;
      m.set(t.category, (m.get(t.category) || 0) + t.amount);
    });
    return m;
  };
  const r = sum(recentM);
  const p = sum(priorM);
  const cats = new Set([...r.keys(), ...p.keys()]);
  return [...cats]
    .map(category => {
      const recent = (r.get(category) || 0) / Math.max(recentM.length, 1);
      const prior = priorM.length ? (p.get(category) || 0) / priorM.length : 0;
      return { category, recent, prior, delta: priorM.length ? recent - prior : 0 };
    })
    .sort((a, b) => b.recent - a.recent);
};

export interface MerchantRow { merchant: string; total: number; count: number; avg: number }

export const topMerchants = (spend: SpendTx[], months: string[], limit = 12): MerchantRow[] => {
  const m = new Map<string, { total: number; count: number }>();
  spend.forEach(t => {
    if (t.bucket !== 'everyday' || !months.includes(monthKey(t.date))) return;
    const key = t.merchant.toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+\d+.*$/, '').slice(0, 28);
    const cur = m.get(key) || { total: 0, count: 0 };
    cur.total += t.amount; cur.count += 1;
    m.set(key, cur);
  });
  return [...m.entries()]
    .map(([merchant, v]) => ({ merchant, total: v.total, count: v.count, avg: v.total / v.count }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
};
