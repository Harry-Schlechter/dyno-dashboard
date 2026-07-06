import { useMemo } from 'react';
import { useSupabase } from './useSupabase';
import { getDateRange } from '../lib/formatters';

/** Recovery / wellness vitals synced from Fitbit/Pixel via google-health-sync. */
export interface VitalsEntry {
  date: string;
  resting_hr: number | null;
  hrv_rmssd: number | null;
  spo2_avg: number | null;
  spo2_min: number | null;
  breathing_rate_avg: number | null;
  skin_temp_deviation: number | null;
  steps: number | null;
  active_minutes_total: number | null;
  very_active_min: number | null;
  hr_zone_cardio_min: number | null;
  hr_zone_peak_min: number | null;
  calories_active: number | null;
  calories_total: number | null;
  resting_hr_7d_avg: number | null;
  hrv_rmssd_7d_avg: number | null;
}

/**
 * Reads the `recent_vitals` view (last 30 days, recovery-focused, with 7-day
 * rolling averages for resting HR + HRV baked in).
 */
export const useVitals = (range: '7d' | '30d' | '90d' = '30d') => {
  const { start } = getDateRange(range);

  const result = useSupabase<VitalsEntry>({
    table: 'recent_vitals',
    isView: true,
    order: { column: 'date', ascending: false },
    filters: { date: { gte: start } },
  });

  const latest = useMemo(
    () => result.data.find((v) => v.resting_hr != null || v.hrv_rmssd != null) ?? result.data[0] ?? null,
    [result.data],
  );

  // Recovery read: HRV above its 7-day baseline + resting HR at/below baseline = "recovered".
  const recovery = useMemo(() => {
    if (!latest) return null;
    const hrv = latest.hrv_rmssd;
    const hrvBase = latest.hrv_rmssd_7d_avg;
    const rhr = latest.resting_hr;
    const rhrBase = latest.resting_hr_7d_avg;

    let status: 'recovered' | 'strained' | 'neutral' = 'neutral';
    if (hrv != null && hrvBase != null && rhr != null && rhrBase != null) {
      const hrvUp = hrv >= hrvBase;
      const rhrOk = rhr <= rhrBase + 1;
      if (hrvUp && rhrOk) status = 'recovered';
      else if (!hrvUp && !rhrOk) status = 'strained';
    }
    return { status, hrv, hrvBase, rhr, rhrBase };
  }, [latest]);

  return { ...result, latest, recovery };
};
