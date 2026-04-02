import { useMemo } from 'react';
import { useSupabase } from './useSupabase';
import { getToday, getDateRange } from '../lib/formatters';

export interface Meal {
  id: string;
  date: string;
  meal_type: string;
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

export interface DailyMacros {
  date: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  meal_count: number;
}

export const useNutrition = (range: '7d' | '30d' | '90d' = '30d') => {
  const { start } = getDateRange(range);

  const meals = useSupabase<Meal>({
    table: 'meals',
    order: { column: 'date', ascending: false },
    filters: { date: { gte: start } },
  });

  const dailyMacros = useSupabase<DailyMacros>({
    table: 'daily_macros',
    isView: true,
    order: { column: 'date', ascending: false },
  });

  const todayMeals = useMemo(() => {
    const today = getToday();
    return meals.data.filter(m => m.date === today && m.meal_type !== 'breakfast');
  }, [meals.data]);

  const todayMacros = useMemo(() => {
    const today = getToday();
    const todayData = dailyMacros.data.find(d => d.date === today);
    return todayData || { date: today, total_calories: 0, total_protein: 0, total_carbs: 0, total_fat: 0, meal_count: 0 };
  }, [dailyMacros.data]);

  return {
    meals: meals.data.filter(m => m.meal_type !== 'breakfast'),
    todayMeals,
    todayMacros,
    dailyMacros: dailyMacros.data,
    loading: meals.loading || dailyMacros.loading,
    error: meals.error || dailyMacros.error,
    refetch: () => { meals.refetch(); dailyMacros.refetch(); },
  };
};
