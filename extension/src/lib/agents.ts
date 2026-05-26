// Persona list — keep in sync with /root/.openclaw/openclaw.json channels.telegram.groups topics.
// Used in the capture box's agent picker and elsewhere.

export interface AgentMeta {
  id: string;
  label: string;
  emoji: string;
  topicId: number;       // Telegram topic id in Dyno+ supergroup (-1003941804652)
  color: string;
}

export const AGENTS: AgentMeta[] = [
  { id: 'trainer',           label: 'Trainer',        emoji: '💪', topicId: 8,  color: '#EF5350' },
  { id: 'nutritionist',      label: 'Nutritionist',   emoji: '🥗', topicId: 9,  color: '#66BB6A' },
  { id: 'financial-advisor', label: 'Financial',      emoji: '💰', topicId: 3,  color: '#FFB74D' },
  { id: 'career-coach',      label: 'Career',         emoji: '🎯', topicId: 4,  color: '#7E57C2' },
  { id: 'travel-agent',      label: 'Travel',         emoji: '✈️', topicId: 5,  color: '#26C6DA' },
  { id: 'wedding-planner',   label: 'Wedding',        emoji: '💍', topicId: 6,  color: '#EC407A' },
  { id: 'health-wellness',   label: 'Health',         emoji: '🩺', topicId: 7,  color: '#42A5F5' },
  { id: 'personal-assistant',label: 'Assistant',      emoji: '📋', topicId: 87, color: '#5B8DEF' },
  { id: 'maintenance',       label: 'Maintenance',    emoji: '🔧', topicId: 81, color: '#9E9E9E' },
  { id: 'builder',           label: 'Builder',        emoji: '🛠️', topicId: 82, color: '#26A69A' },
];

export const AGENT_BY_ID: Record<string, AgentMeta> = Object.fromEntries(
  AGENTS.map((a) => [a.id, a])
);
