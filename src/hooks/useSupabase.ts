import { useState, useEffect, useCallback } from 'react';
import { supabase, USER_ID } from '../lib/supabase';

interface UseSupabaseOptions {
  table: string;
  select?: string;
  filters?: Record<string, any>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
  enabled?: boolean;
  isView?: boolean;
}

interface UseSupabaseResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSupabase<T = any>({
  table,
  select = '*',
  filters = {},
  order,
  limit,
  enabled = true,
  isView = false,
}: UseSupabaseOptions): UseSupabaseResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);

    try {
      let query = supabase.from(table).select(select);

      // Add user_id filter for tables (not views, which may already filter)
      if (!isView) {
        query = query.eq('user_id', USER_ID);
      }

      // Apply additional filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (typeof value === 'object' && 'gte' in value) {
            query = query.gte(key, value.gte);
          } else if (typeof value === 'object' && 'lte' in value) {
            query = query.lte(key, value.lte);
          } else {
            query = query.eq(key, value);
          }
        }
      });

      if (order) {
        query = query.order(order.column, { ascending: order.ascending ?? false });
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data: result, error: err } = await query;

      if (err) throw err;
      setData((result as T[]) || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [table, select, JSON.stringify(filters), order?.column, order?.ascending, limit, enabled, isView]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
