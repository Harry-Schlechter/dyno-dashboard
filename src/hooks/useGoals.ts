import { useSupabase } from './useSupabase';
import { Goal } from '../lib/goalScoring';

export const useGoals = () => {
  return useSupabase<Goal>({
    table: 'goals',
    filters: { is_active: true },
    order: { column: 'weight', ascending: false },
  });
};
