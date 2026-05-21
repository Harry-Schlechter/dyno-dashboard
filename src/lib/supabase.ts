import { createClient } from '@supabase/supabase-js';
import { mockSupabase } from './demo/mockSupabase';

const IS_DEMO = process.env.REACT_APP_DEMO === '1';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

// In demo mode, swap the real client for an in-memory fixture-backed mock.
// Cast to `any` because mockSupabase only implements the subset we use.
export const supabase: any = IS_DEMO
  ? (mockSupabase as any)
  : createClient(supabaseUrl, supabaseKey);

export const USER_ID = IS_DEMO
  ? 'demo'
  : (process.env.REACT_APP_USER_ID || process.env.VITE_USER_ID || '');

export const IS_DEMO_MODE = IS_DEMO;
