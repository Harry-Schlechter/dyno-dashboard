import { useMemo } from 'react';
import { useSupabase } from './useSupabase';
import { getToday, getDateRange } from '../lib/formatters';

export interface SleepEntry {
  id: string;
  date: string;
  hours: number;
  quality: number;
  went_to_bed_at: string;
  woke_up_at: string;
  deep_sleep_min: number;
  rem_sleep_min: number;
  core_sleep_min: number;
  efficiency_pct: number;
  sleep_latency_min: number;
  time_in_bed_min: number;
  awakenings: number;
  notes: string;
}

export const useSleep = (range: '7d' | '30d' | '90d' = '30d') => {
  const { start, end } = getDateRange(range);

  const result = useSupabase<SleepEntry>({
    table: 'sleep',
    order: { column: 'date', ascending: false },
    filters: { date: { gte: start } },
  });

  const lastNight = useMemo(() => {
    if (!result.data.length) return null;
    return result.data[0];
  }, [result.data]);

  const averages = useMemo(() => {
    if (!result.data.length) return null;
    const sum = result.data.reduce(
      (acc, s) => ({
        hours: acc.hours + (s.hours || 0),
        quality: acc.quality + (s.quality || 0),
        deep: acc.deep + (s.deep_sleep_min || 0),
        rem: acc.rem + (s.rem_sleep_min || 0),
      }),
      { hours: 0, quality: 0, deep: 0, rem: 0 }
    );
    const n = result.data.length;
    return {
      hours: sum.hours / n,
      quality: sum.quality / n,
      deep: sum.deep / n,
      rem: sum.rem / n,
    };
  }, [result.data]);

  return { ...result, lastNight, averages };
};
