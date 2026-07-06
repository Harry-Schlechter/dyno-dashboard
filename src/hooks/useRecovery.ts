import { useMemo } from 'react';
import { useSupabase } from './useSupabase';
import { getDateRange } from '../lib/formatters';

export interface RecoveryDriver {
  name: string;
  contribution: number; // signed; + supports recovery, - drags it
  note: string;
}

export interface RecoveryScore {
  date: string;
  score: number | null;
  band: 'green' | 'yellow' | 'red' | null;
  confidence: 'high' | 'medium' | 'low';
  hrv_rmssd: number | null;
  hrv_baseline: number | null;
  resting_hr: number | null;
  rhr_baseline: number | null;
  sleep_hours: number | null;
  sleep_eff: number | null;
  deep_min: number | null;
  rem_min: number | null;
  flags: string[];
  drivers: RecoveryDriver[] | null;
  summary: string | null;
}

const BAND_COLOR: Record<string, string> = {
  green: '#4CAF50',
  yellow: '#FFB74D',
  red: '#E57373',
};

export const useRecovery = (range: '7d' | '30d' | '90d' = '30d') => {
  const { start } = getDateRange(range);

  const result = useSupabase<RecoveryScore>({
    table: 'recovery_scores',
    order: { column: 'date', ascending: false },
    filters: { date: { gte: start } },
  });

  const latest = useMemo(
    () => result.data.find((r) => r.score != null) ?? result.data[0] ?? null,
    [result.data],
  );

  const trend = useMemo(
    () =>
      [...result.data]
        .filter((r) => r.score != null)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((r) => ({ date: r.date, score: r.score as number, band: r.band })),
    [result.data],
  );

  const color = latest?.band ? BAND_COLOR[latest.band] : '#9E9E9E';

  return { ...result, latest, trend, color };
};

export { BAND_COLOR };
