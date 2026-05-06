import { useSupabase } from './useSupabase';

export type GolfRoundType = 'round' | 'driving_range' | 'putting' | 'short_game' | 'simulator';

export interface GolfHoleDetail {
  hole: number;
  par: number;
  score: number;
  putts?: number | null;
  fairway_hit?: boolean | null;
  gir?: boolean | null;
}

export interface GolfRound {
  id: string;
  workout_id: string | null;
  date: string;
  course_name: string;
  course_location: string | null;
  round_type: GolfRoundType;
  holes: number | null;
  total_score: number | null;
  total_par: number | null;
  fairways_hit: number | null;
  fairways_total: number | null;
  greens_in_reg: number | null;
  putts: number | null;
  three_putts: number | null;
  birdies: number | null;
  pars: number | null;
  bogeys: number | null;
  doubles_plus: number | null;
  scorecard_data: GolfHoleDetail[] | null;
  scorecard_url: string | null;
  weather: string | null;
  notes: string | null;
  created_at: string;
}

export const useGolfRounds = () => {
  const rounds = useSupabase<GolfRound>({
    table: 'golf_rounds',
    order: { column: 'date', ascending: false },
  });

  return {
    rounds: rounds.data,
    loading: rounds.loading,
    error: rounds.error,
    refetch: rounds.refetch,
  };
};
