import { useMemo } from 'react';
import { useSupabase } from './useSupabase';

// One row per recommendation, written by the 3-horizon forecasting pipeline
// (bin/forecast.py / forecast_weekly.py / forecast_monthly.py on the VPS).
// Each horizon writes up to 3 ranked recommendations per run, replacing its
// prior batch for the same target_date so this always reflects the latest run.
export type Horizon = 'daily' | 'weekly' | 'monthly';

export interface Recommendation {
  id: string;
  horizon: Horizon;
  made_on: string;
  target_date: string;
  rank: number;
  rec: string;
  why: string | null;
  tags_used: any;
  created_at: string;
}

export const useRecommendations = (horizon?: Horizon, limit = 30) => {
  const rows = useSupabase<Recommendation>({
    table: 'recommendations',
    filters: horizon ? { horizon } : {},
    order: { column: 'target_date', ascending: false },
    limit,
  });

  // The most recent batch (by target_date) for a given horizon, ranked.
  const latestByHorizon = useMemo(() => {
    const out: Record<Horizon, Recommendation[]> = { daily: [], weekly: [], monthly: [] };
    const latestDate: Record<Horizon, string> = { daily: '', weekly: '', monthly: '' };
    for (const r of rows.data) {
      if (!latestDate[r.horizon] || r.target_date > latestDate[r.horizon]) {
        latestDate[r.horizon] = r.target_date;
      }
    }
    for (const r of rows.data) {
      if (r.target_date === latestDate[r.horizon]) out[r.horizon].push(r);
    }
    (Object.keys(out) as Horizon[]).forEach((h) => out[h].sort((a, b) => a.rank - b.rank));
    return out;
  }, [rows.data]);

  return { rows: rows.data, latestByHorizon, loading: rows.loading, refetch: rows.refetch };
};
