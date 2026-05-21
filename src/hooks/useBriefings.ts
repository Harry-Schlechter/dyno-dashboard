import { useSupabase } from './useSupabase';

export type BriefingSectionKind = 'highlight' | 'list' | 'wins' | 'missed' | 'preview' | 'note' | 'asks';

export interface BriefingAsk {
  agent: string;
  ask: string;
  link?: string;
}

export interface BriefingSection {
  kind: BriefingSectionKind;
  label: string;
  items: (string | BriefingAsk)[];
}

export interface BriefingBody {
  sections?: BriefingSection[];
}

export interface Briefing {
  id: string;
  user_id: string;
  agent_id: string;
  kind: string;            // 'morning' | 'evening' | 'weekly' | other
  for_date: string;        // YYYY-MM-DD
  generated_at: string;
  headline: string;
  body: BriefingBody | null;
  raw_text: string | null;
  created_at: string;
}

export const useBriefings = () => {
  const result = useSupabase<Briefing>({
    table: 'agent_briefings',
    order: { column: 'generated_at', ascending: false },
    limit: 20,
  });
  return {
    briefings: result.data,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
};
