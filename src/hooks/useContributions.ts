import { useMemo } from 'react';
import { useSupabase } from './useSupabase';

// One row per (month, account). Written/maintained by the agent (see
// contributions table + AGENTS instructions). account ∈
// 401k | employer_match | hsa | roth | wros.
export interface ContributionRow {
  id: string;
  month: string;      // 'YYYY-MM-DD' (first of month)
  account: string;
  amount: number;
  source: string | null;
}

export interface MonthContributions {
  month: string;      // 'YYYY-MM'
  '401k': number;
  employer_match: number;
  hsa: number;
  roth: number;
  wros: number;
}

export const useContributions = () => {
  const rows = useSupabase<ContributionRow>({
    table: 'contributions',
    order: { column: 'month', ascending: true },
    limit: 300,
  });

  // Pivot to one object per month with a column per account.
  const byMonth = useMemo<MonthContributions[]>(() => {
    const m = new Map<string, MonthContributions>();
    for (const r of rows.data) {
      const key = (r.month || '').slice(0, 7);
      if (!key) continue;
      if (!m.has(key)) m.set(key, { month: key, '401k': 0, employer_match: 0, hsa: 0, roth: 0, wros: 0 });
      const rec = m.get(key)!;
      if (r.account in rec) (rec as any)[r.account] += r.amount;
    }
    return Array.from(m.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [rows.data]);

  return { byMonth, rows: rows.data, loading: rows.loading, refetch: rows.refetch };
};
