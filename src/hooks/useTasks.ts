import { useCallback } from 'react';
import { useSupabase } from './useSupabase';
import { supabase, USER_ID } from '../lib/supabase';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'completed' | 'blocked';
  priority: 1 | 2 | 3;
  due_date: string | null;
  tags: string[];
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useTasks = () => {
  const result = useSupabase<Task>({
    table: 'tasks',
    order: { column: 'created_at', ascending: false },
  });

  const completeTask = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', USER_ID);
    if (!error) result.refetch();
    return error;
  }, [result.refetch]);

  return { ...result, completeTask };
};
