import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || "";
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types (simplified for MVP)
export interface DailyLog {
  id: string;
  user_id: string;
  date: string;
  sleep_hours?: number;
  sleep_quality?: number;
  weight?: number;
  body_fat_percent?: number;
  journal_entry?: string;
  created_at: string;
  updated_at: string;
}

export interface Meal {
  id: string;
  user_id: string;
  date: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  food_item: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  created_at: string;
}

export interface Workout {
  id: string;
  user_id: string;
  date: string;
  workout_type: string;
  duration_minutes?: number;
  notes?: string;
  created_at: string;
}

export interface PageConfig {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  config: Record<string, any>;
  is_enabled: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

// Helper function to get user ID (placeholder for auth)
export const getCurrentUserId = () => {
  return "ea8f4579-3ac6-4945-b64d-9daedeb63870"; // Harry's user_id
};
