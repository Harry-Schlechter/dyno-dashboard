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

export const useForecast = () => {
  const preds = useSupabase<Prediction>({
    table: 'predictions',
    order: { column: 'target_date', ascending: false },
    limit: 200,
  });
  const acc = useSupabase<Accuracy>({ table: 'forecast_accuracy', isView: true });

  const tomorrow = useMemo(() => {
    const t = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');
    return preds.data.filter((p) => p.target_date === t);
  }, [preds.data]);

  const recent = useMemo(
    () => preds.data.filter((p) => p.scored_at).slice(0, 20),
    [preds.data],
  );

  return {
    tomorrow,
    recent,
    accuracy: acc.data,
    loading: preds.loading,
    refetch: preds.refetch,
  };
};
