import { useSupabase } from './useSupabase';

export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  merchant_pattern: string;
  expected_amount: number;
  cadence: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  status: 'active' | 'trial' | 'paused' | 'canceled';
  tier: 'essential' | 'nice_to_have' | 'cancel_candidate' | null;
  first_charged_at: string | null;
  last_charged_at: string | null;
  next_expected_at: string | null;
  trial_ends_at: string | null;
  canceled_at: string | null;
  source: 'manual' | 'detected';
  notes: string | null;
  cancel_url: string | null;
}

export const useSubscriptions = () => {
  const subs = useSupabase<Subscription>({
    table: 'financial_subscriptions',
    order: { column: 'expected_amount', ascending: false },
  });
  return {
    subscriptions: subs.data,
    loading: subs.loading,
    error: subs.error,
    refetch: subs.refetch,
  };
};
