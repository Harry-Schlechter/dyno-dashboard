import { useMemo } from 'react';
import { useSupabase } from './useSupabase';

// One row per month: the real end-of-month balances + what actually went into
// each bucket that month. Written by bin/projection-snapshot.py (daily cron,
// upserts the current month, so each month freezes at its month-end value).
export interface ProjectionSnapshotRow {
  id: string;
  month: string;      // 'YYYY-MM'
  k401: number;
  roth: number;
  hsa: number;
  wros: number;
  cash: number;
  net_worth: number;
  contrib_401k: number;
  contrib_roth: number;
  contrib_hsa: number;
  contrib_wros: number;
  captured_at: string;
  source: string | null;
}

export const useProjectionSnapshots = () => {
  const rows = useSupabase<ProjectionSnapshotRow>({
    table: 'projection_snapshots',
    order: { column: 'month', ascending: true },
    limit: 240,
  });

  // Keyed by 'YYYY-MM' for quick lookup while rendering the table.
  const byMonth = useMemo(() => {
    const m = new Map<string, ProjectionSnapshotRow>();
    for (const r of rows.data) m.set((r.month || '').slice(0, 7), r);
    return m;
  }, [rows.data]);

  const latest = useMemo(() => {
    if (!rows.data.length) return null;
    return rows.data[rows.data.length - 1];
  }, [rows.data]);

  return { byMonth, latest, rows: rows.data, loading: rows.loading, refetch: rows.refetch };
};
