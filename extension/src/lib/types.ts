// Shared types — mirror dashboard's hook types where they overlap.

export type BriefingSectionKind = 'highlight' | 'list' | 'wins' | 'missed' | 'preview' | 'note' | 'asks';

export interface BriefingAsk { agent: string; ask: string; link?: string; }
export interface BriefingSection { kind: BriefingSectionKind; label: string; items: (string | BriefingAsk)[]; }
export interface BriefingBody { sections?: BriefingSection[]; }

export interface Briefing {
  id: string;
  user_id: string;
  agent_id: string;
  kind: string;
  for_date: string;
  generated_at: string;
  headline: string;
  body: BriefingBody | null;
  raw_text: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'completed' | 'blocked';
  priority: 1 | 2 | 3;
  due_date: string | null;
  tags: string[] | null;
  completed_at: string | null;
  created_at: string;
}

export interface Observation {
  id: string;
  agent_id: string;
  kind: string;
  severity: 'info' | 'low' | 'medium' | 'high';
  title: string;
  body: string | null;
  created_at: string;
}

export interface MealRow {
  id: string;
  date: string;            // YYYY-MM-DD
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
}
