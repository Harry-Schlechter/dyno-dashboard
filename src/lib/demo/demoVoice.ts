// Scripted reply brain for voice in demo mode.
//
// The real voice page POSTs the transcript to /api/voice-text, which routes it
// to a fast chat model or the full agent. That backend is private, so in demo
// mode we answer locally instead. Everything else on the voice page — browser
// STT, barge-in, continuous mode, TTS — is the real implementation; only the
// network call is swapped out.
//
// Answers are keyword-matched and pull real numbers out of the fixture, so what
// the demo says out loud agrees with what the dashboard shows on screen.

import FIXTURE from './fixture';

export interface DemoReply {
  reply: string;
  route: 'chat' | 'agent';
  /** ms to wait before answering — mimics the real routing latency split. */
  latency: number;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const round = (n: number, p = 1) => Math.round(n * 10 ** p) / 10 ** p;

type Rule = { test: RegExp; build: () => string; route: 'chat' | 'agent' };

const RULES: Rule[] = [
  {
    test: /\b(sleep|slept|sleeping|rest)\b/i,
    route: 'agent',
    build: () => {
      const rows = (FIXTURE.sleep || []).slice(0, 7);
      const h = avg(rows.map((r: any) => r.hours));
      const s = avg(rows.map((r: any) => r.score));
      const last = rows[0];
      return `Over the last seven nights you've averaged ${round(h)} hours with a sleep score of ${Math.round(s)}. Last night was ${round(last.hours)} hours, ${last.deep_minutes} minutes of deep and ${last.rem_minutes} of REM. Your best nights still follow lifting days rather than running days.`;
    },
  },
  {
    test: /\b(recovery|hrv|heart rate|resting|readiness|run down|tired)\b/i,
    route: 'agent',
    build: () => {
      const rows = (FIXTURE.recovery_scores || []);
      const latest = rows[0];
      return `Your recovery score today is ${latest.score}, which is in the ${latest.band} band. HRV is ${latest.hrv_rmssd} against a baseline of ${latest.hrv_baseline}, and resting heart rate is ${latest.resting_hr} against a baseline of ${latest.rhr_baseline}. Worth noting: about ten days ago your resting heart rate ran six beats above baseline for five straight days while HRV dropped and skin temperature rose. All three moved together, then came back.`;
    },
  },
  {
    test: /\b(spend|spent|money|budget|finance|financial|cost|expensive)\b/i,
    route: 'agent',
    build: () => {
      // Compare the last 30 days against the 3 months before that, so the
      // number quoted out loud is derived from the same rows the Finances page
      // charts rather than being a hard-coded claim that can drift.
      const dining = (FIXTURE.financial_transactions || [])
        .filter((t: any) => t.custom_category === 'dining');
      const dayOf = (t: any) =>
        Math.round((Date.now() - new Date(String(t.date)).getTime()) / 86400000);
      const sum = (rows: any[]) =>
        Math.abs(rows.reduce((s: number, t: any) => s + t.amount, 0));

      const recent = sum(dining.filter((t: any) => dayOf(t) <= 30));
      const priorRows = dining.filter((t: any) => dayOf(t) > 30 && dayOf(t) <= 120);
      const baseline = priorRows.length ? sum(priorRows) / 3 : 0;
      const pct = baseline ? Math.round(((recent - baseline) / baseline) * 100) : 0;

      const lead = pct > 0
        ? `You're at about ${Math.round(recent)} dollars over the last 30 days against a ${Math.round(baseline)} dollar monthly average, so roughly ${pct} percent above normal.`
        : `You're at about ${Math.round(recent)} dollars over the last 30 days, which is in line with your ${Math.round(baseline)} dollar monthly average.`;

      return `Dining is the one that stands out. ${lead} The gap is entirely weekday charges — your weekend dining hasn't changed. Everything else is on plan.`;
    },
  },
  {
    test: /\b(net worth|worth|savings|invest|portfolio|retirement)\b/i,
    route: 'agent',
    build: () => {
      const nw = (FIXTURE.net_worth_snapshots || []);
      const latest = nw[0], oldest = nw[nw.length - 1];
      return `Net worth is about ${Math.round(latest.net_worth / 1000)} thousand dollars, up roughly ${Math.round((latest.net_worth - oldest.net_worth) / 1000)} thousand over the last two years. The mix has shifted though — retirement did most of the growing while cash stayed close to flat, so cash as a share of the total actually fell.`;
    },
  },
  {
    test: /\b(workout|lift|lifting|gym|train|training|deadlift|squat|bench|exercise)\b/i,
    route: 'agent',
    build: () => {
      const prs = (FIXTURE.exercise_prs || []);
      const names = prs.map((p: any) => `${p.exercise_name} at ${p.weight_lbs}`).join(', ');
      return `Your current personal records are ${names} pounds. Working deadlift sets have moved from 295 to 315 over about eight weeks while body weight stayed flat around 175, so that's real strength rather than just more mass.`;
    },
  },
  {
    test: /\b(task|todo|to do|due|deadline)\b/i,
    route: 'agent',
    build: () => {
      const open = (FIXTURE.tasks || []).filter((t: any) => t.status === 'pending');
      const titles = open.slice(0, 3).map((t: any) => t.title).join(', ');
      const high = open.filter((t: any) => t.priority === 1).length;
      return `You have ${open.length} open tasks. The nearest ones are ${titles}. ${high} of them are marked high priority.`;
    },
  },
  {
    test: /\b(eat|ate|food|meal|calorie|protein|macro|nutrition|diet)\b/i,
    route: 'agent',
    build: () => {
      const logs = (FIXTURE.daily_logs || []).slice(0, 14);
      const p = avg(logs.map((l: any) => l.protein_g));
      const c = avg(logs.map((l: any) => l.calories));
      return `Over the last two weeks you've averaged ${Math.round(c)} calories and ${Math.round(p)} grams of protein a day. Protein has come in under your 150 gram target on eight of those days, and the misses cluster on days with no lunch logged.`;
    },
  },
  {
    test: /\b(notice|noticed|pattern|insight|anything|what's up|whats up|interesting)\b/i,
    route: 'agent',
    build: () => {
      const obs = (FIXTURE.agent_observations || []);
      return `A few things. ${obs[0].title}. Also, ${obs[2].title.toLowerCase()}. And on the money side, ${obs[1].title.toLowerCase()}.`;
    },
  },
  {
    test: /\b(journal|mood|feeling|felt|stress|stressed)\b/i,
    route: 'agent',
    build: () =>
      'Your journal shows a fairly consistent Sunday pattern — five of your nine work-stress entries in the last two months landed on a Sunday, and Sunday mood averages about 5.4 against 7.1 on other days. It has come up in three separate weekly reviews now.',
  },
  {
    test: /\b(predict|forecast|tomorrow|expect|accurate|accuracy)\b/i,
    route: 'agent',
    build: () => {
      const acc = (FIXTURE.forecast_accuracy || []);
      const overall = avg(acc.map((a: any) => a.hit_rate_pct || 0));
      return `For tomorrow I'm predicting about 7.4 hours of sleep, resting heart rate around 55, and roughly 9,400 steps. For context, across all scored predictions the hit rate is about ${Math.round(overall)} percent — I score myself the next morning and the misses stay on the record.`;
    },
  },
  {
    test: /\b(hello|hey|hi|good morning|good evening|what can you|who are you|help)\b/i,
    route: 'chat',
    build: () =>
      "Hey. I'm Dyno. I keep track of your sleep, training, vitals, spending and notes, and I tell you what I notice across them. Ask me about how you slept, what your recovery looks like, or where your money went.",
  },
  {
    test: /\b(thanks|thank you|cool|nice|great|awesome)\b/i,
    route: 'chat',
    build: () => 'Anytime.',
  },
];

const FALLBACK =
  "This is a scripted demo, so I only answer a fixed set of topics. Try asking about your sleep, recovery, spending, workouts, tasks, or what patterns I've noticed.";

export function demoReply(text: string): DemoReply {
  for (const r of RULES) {
    if (r.test.test(text)) {
      return {
        reply: r.build(),
        route: r.route,
        // Chat replies are near-instant in the real system; agent replies take
        // longer because they hit the database.
        latency: r.route === 'chat' ? 260 : 900 + Math.random() * 700,
      };
    }
  }
  return { reply: FALLBACK, route: 'chat', latency: 300 };
}

/** Suggested prompts shown on the demo voice page. */
export const DEMO_VOICE_SUGGESTIONS = [
  'How did I sleep this week?',
  'What does my recovery look like?',
  'Where did my money go this month?',
  "What have you noticed lately?",
  'What are you predicting for tomorrow?',
];
