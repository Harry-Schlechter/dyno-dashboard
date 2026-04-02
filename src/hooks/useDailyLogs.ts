import { useMemo } from 'react';
import { useSupabase } from './useSupabase';
import { getToday, getDateRange } from '../lib/formatters';

export interface DailyLog {
  id: string;
  date: string;
  mood: number;
  energy: number;
  stress: number;
  journal: string;
  weight_lbs: number;
  body_fat_pct: number;
}

export const useDailyLogs = (range: '7d' | '30d' | '90d' = '30d') => {
  const { start } = getDateRange(range);

  const result = useSupabase<DailyLog>({
    table: 'daily_logs',
    order: { column: 'date', ascending: false },
    filters: { date: { gte: start } },
  });

  const today = useMemo(() => {
    return result.data.find(d => d.date === getToday()) || null;
  }, [result.data]);

  return { ...result, today };
};
