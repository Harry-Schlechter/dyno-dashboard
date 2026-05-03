import { useCallback, useState } from 'react';
import { supabase, USER_ID } from '../lib/supabase';

export type FeedbackKind = 'note' | 'correction' | 'praise' | 'redirect';

interface SendOpts {
  agentId: string;
  body: string;
  kind?: FeedbackKind;
  context?: Record<string, unknown>;
}

/**
 * Send a free-text signal to a persona. The VPS poller appends it to that
 * persona's daily memory file within minutes, so the agent sees it on their
 * next session.
 */
export const useDashboardFeedback = () => {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(async ({ agentId, body, kind = 'note', context }: SendOpts) => {
    setSending(true);
    setError(null);
    try {
      const { error: err } = await supabase.from('dashboard_feedback').insert({
        user_id: USER_ID,
        agent_id: agentId,
        source: 'ui',
        kind,
        body,
        context: context ?? null,
      });
      if (err) throw err;
      return true;
    } catch (e: any) {
      setError(e.message ?? 'Failed to send');
      return false;
    } finally {
      setSending(false);
    }
  }, []);

  return { send, sending, error };
};
