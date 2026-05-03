import { useCallback, useEffect, useState } from 'react';
import { supabase, USER_ID } from '../lib/supabase';

export type ObservationKind =
  | 'insight'
  | 'pattern'
  | 'anomaly'
  | 'recommendation'
  | 'milestone'
  | 'warning'
  | 'forecast';

export type ObservationSeverity = 'info' | 'low' | 'medium' | 'high';

export type ObservationSource = 'agent' | 'stats' | 'cron';

export interface Observation {
  id: string;
  user_id: string;
  agent_id: string;
  source: ObservationSource;
  kind: ObservationKind;
  severity: ObservationSeverity;
  title: string;
  body: string | null;
  data: Record<string, any> | null;
  related_agents: string[];
  related_table: string | null;
  related_ids: string[];
  observed_for_date: string | null;
  expires_at: string | null;
  status: 'active' | 'dismissed' | 'archived';
  dismissed_at: string | null;
  dismissed_reason: string | null;
  created_at: string;
  updated_at: string;
}

export type FeedbackReaction =
  | 'useful'
  | 'not_useful'
  | 'wrong'
  | 'acted_on'
  | 'snooze'
  | 'starred';

interface UseObservationsOptions {
  agentId?: string;
  kinds?: ObservationKind[];
  limit?: number;
  includeDismissed?: boolean;
}

export function useObservations(opts: UseObservationsOptions = {}) {
  const { agentId, kinds, limit = 50, includeDismissed = false } = opts;
  const [data, setData] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const kindsKey = kinds?.join(',') ?? '';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let q = supabase
        .from('agent_observations')
        .select('*')
        .eq('user_id', USER_ID)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!includeDismissed) q = q.eq('status', 'active');
      if (agentId) q = q.eq('agent_id', agentId);
      if (kinds && kinds.length) q = q.in('kind', kinds);

      const { data: rows, error: err } = await q;
      if (err) throw err;
      setData((rows as Observation[]) || []);
    } catch (e: any) {
      setError(e.message ?? 'Failed to fetch observations');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [agentId, kindsKey, limit, includeDismissed]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const react = useCallback(
    async (observationId: string, reaction: FeedbackReaction, note?: string) => {
      const obs = data.find(o => o.id === observationId);
      const { error: err } = await supabase.from('observation_feedback').insert({
        user_id: USER_ID,
        observation_id: observationId,
        reaction,
        note: note ?? null,
      });
      if (err) throw err;

      // Mirror non-trivial reactions into dashboard_feedback so the relevant
      // persona sees a structured signal in their next session. Skip noise
      // reactions (plain 'useful') unless there's a note attached.
      const meaningful: FeedbackReaction[] = ['not_useful', 'wrong', 'acted_on', 'starred'];
      if (obs && (meaningful.includes(reaction) || note)) {
        await supabase.from('dashboard_feedback').insert({
          user_id: USER_ID,
          agent_id: obs.agent_id,
          source: 'reaction',
          kind: 'reaction',
          body: note ?? `${reaction} on "${obs.title}"`,
          context: { observation_id: observationId, reaction, observation_title: obs.title },
        });
      }
    },
    [data]
  );

  const dismiss = useCallback(
    async (observationId: string, reason?: string) => {
      const { error: err } = await supabase
        .from('agent_observations')
        .update({
          status: 'dismissed',
          dismissed_at: new Date().toISOString(),
          dismissed_reason: reason ?? null,
        })
        .eq('id', observationId)
        .eq('user_id', USER_ID);
      if (err) throw err;
      setData(prev => prev.filter(o => o.id !== observationId));
    },
    []
  );

  return { data, loading, error, refetch: fetchData, react, dismiss };
}
