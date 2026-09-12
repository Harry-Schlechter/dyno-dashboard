import { useMemo } from 'react';
import { useSupabase } from './useSupabase';
import { format } from 'date-fns';

export interface Prediction {
  id: string;
  made_on: string;
  target_date: string;
  metric: string;
  predicted: string;
  predicted_num: number | null;
  band: string | null;
  confidence: number | null;
  rationale: string;
  basis: Record<string, any> | null;
  actual: string | null;
  correct: boolean | null;
  error: number | null;
  scored_at: string | null;
}

export interface Accuracy {
  metric: string;
  scored: number;
  hits: number;
  hit_rate_pct: number | null;
  avg_error: number | null;
}

const DAILY_METRICS = new Set(['recovery_band', 'sleep_hours', 'train_day', 'spend_month']);
const WEEKLY_METRICS = new Set(['spend_pacing', 'sleep_pacing', 'training_pacing']);

export const useForecast = () => {
  const preds = useSupabase<Prediction>({
    table: 'predictions',
    order: { column: 'target_date', ascending: false },
    limit: 200,
  });
  const acc = useSupabase<Accuracy>({ table: 'forecast_accuracy', isView: true });

  const tomorrow = useMemo(() => {
    const t = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');
    return preds.data.filter((p) => p.target_date === t && DAILY_METRICS.has(p.metric));
  }, [preds.data]);

  // Latest weekly pacing check-in (spend/sleep/training_pacing rows share a target_date).
  const latestWeekly = useMemo(() => {
    const rows = preds.data.filter((p) => WEEKLY_METRICS.has(p.metric));
    if (rows.length === 0) return [];
    const latestDate = rows.reduce((max, r) => (r.target_date > max ? r.target_date : max), rows[0].target_date);
    return rows.filter((r) => r.target_date === latestDate);
  }, [preds.data]);

  // Latest 1-6 month outlook.
  const latestMonthly = useMemo(
    () => preds.data.find((p) => p.metric === 'monthly_outlook') ?? null,
    [preds.data],
  );

  const recent = useMemo(
    () => preds.data.filter((p) => p.scored_at).slice(0, 20),
    [preds.data],
  );

  return {
    tomorrow,
    latestWeekly,
    latestMonthly,
    recent,
    accuracy: acc.data,
    loading: preds.loading,
    refetch: preds.refetch,
  };
};
