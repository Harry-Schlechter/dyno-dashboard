import React, { createContext, useContext, useState, useCallback } from 'react';

// Which specialist a chat is aimed at (or null = general Dyno).
export type ChatAgent =
  | 'general' | 'financial-advisor' | 'nutritionist' | 'trainer'
  | 'health-wellness' | 'career-coach' | 'wedding-planner'
  | 'travel-agent' | 'personal-assistant';

export interface ChatOpen {
  agent: ChatAgent;
  /** Human label for the header, e.g. "Nutritionist". */
  label: string;
  /** Page context string passed to the agent so it can see what you're viewing. */
  context?: string;
}

interface ChatState {
  open: ChatOpen | null;
  openChat: (o: ChatOpen) => void;
  closeChat: () => void;
}

const Ctx = createContext<ChatState | null>(null);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState<ChatOpen | null>(null);
  const openChat = useCallback((o: ChatOpen) => setOpen(o), []);
  const closeChat = useCallback(() => setOpen(null), []);
  return <Ctx.Provider value={{ open, openChat, closeChat }}>{children}</Ctx.Provider>;
};

export const useChat = (): ChatState => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useChat must be used inside ChatProvider');
  return ctx;
};

// Map a dashboard route to its specialist agent + label, for the per-page
// "Ask <specialist>" button.
export function agentForPath(pathname: string): { agent: ChatAgent; label: string } {
  const p = pathname.replace(/\/+$/, '');
  if (p.startsWith('/finances')) return { agent: 'financial-advisor', label: 'Financial Advisor' };
  if (p.startsWith('/nutrition')) return { agent: 'nutritionist', label: 'Nutritionist' };
  if (p.startsWith('/sleep')) return { agent: 'trainer', label: 'Trainer' };
  if (p.startsWith('/fitness') || p.startsWith('/workouts')) return { agent: 'trainer', label: 'Trainer' };
  if (p.startsWith('/tasks') || p.startsWith('/calendar')) return { agent: 'personal-assistant', label: 'Assistant' };
  if (p.startsWith('/journal')) return { agent: 'health-wellness', label: 'Wellness' };
  return { agent: 'general', label: 'Dyno' };
}
