import { useSupabase } from './useSupabase';
import { getDateRange } from '../lib/formatters';

export interface Workout {
  id: string;
  date: string;
  name: string;
  duration_min: number;
  notes: string;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_name: string;
  exercise_order: number;
  set_number: number;
  reps: number;
  weight_lbs: number;
  rpe: number;
  is_pr: boolean;
  notes: string;
}

export interface ExercisePR {
  exercise_name: string;
  max_weight: number;
  max_reps: number;
  date: string;
}

export const useWorkouts = (range: '7d' | '30d' | '90d' = '30d') => {
  const { start } = getDateRange(range);

  const workouts = useSupabase<Workout>({
    table: 'workouts',
    order: { column: 'date', ascending: false },
    filters: { date: { gte: start } },
  });

  const exercises = useSupabase<WorkoutExercise>({
    table: 'workout_exercises',
    order: { column: 'exercise_order', ascending: true },
  });

  const prs = useSupabase<ExercisePR>({
    table: 'exercise_prs',
    isView: true,
  });

  return {
    workouts: workouts.data,
    exercises: exercises.data,
    prs: prs.data,
    loading: workouts.loading,
    error: workouts.error,
    refetch: () => { workouts.refetch(); exercises.refetch(); prs.refetch(); },
  };
};
