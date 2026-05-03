// Maps `metric_source` strings (used by the goals table) to actual aggregations
// over user data. Adding a new goal is as simple as adding a metric_source the
// agent knows about and adding a resolver here if it doesn't exist yet.

import { Transaction } from '../hooks/useFinances';
import { isRealSpend, isRealIncome } from './finance';

export interface LifeEvent {
  id: string;
  user_id: string;
  event_type: 'travel' | 'sick' | 'social' | 'work_crunch' | 'office' | 'networking' | 'injury' | 'other';
  start_date: string;  // YYYY-MM-DD
  end_date: string;    // YYYY-MM-DD inclusive
}

export interface SleepRow {
  date: string;
  hours: number | null;
  quality: number | null;
  went_to_bed_at?: string | null;
  woke_up_at?: string | null;
}

export interface MetricBundle {
  sleep: SleepRow[];
  meals: Array<{ date: string; calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null }>;
  workouts: Array<{ date: string; name: string | null; duration_min: number | null }>;
  dailyLogs: Array<{ date: string; mood: number | null; energy: number | null; stress: number | null; weight_lbs: number | null }>;
  transactions: Transaction[];
  lifeEvents: LifeEvent[];
}

export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD inclusive
}

const inRange = (date: string, range: DateRange) => date >= range.start && date <= range.end;

// ─────────────────────────────────────────────────────────────────────────────
// Workout categorization (regex on name)
// ─────────────────────────────────────────────────────────────────────────────

const isBasketball = (name: string | null) => !!name && /basketball/i.test(name);
const isClimbing   = (name: string | null) => !!name && /climb|boulder/i.test(name);
const isLifting    = (name: string | null) => !!name && /push|pull|legs?\b|gym\b|bench|full body|upper|lower|squat|deadlift/i.test(name);

// ─────────────────────────────────────────────────────────────────────────────
// Sleep clock-time helpers — must be circular (1am ↔ 11pm are 2hrs apart, not 22)
// ─────────────────────────────────────────────────────────────────────────────

const DAY_MIN = 24 * 60;

/** Returns minutes-after-midnight (0-1439) for the LOCAL clock time of an ISO timestamp. */
const toLocalClockMin = (iso: string): number => {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
};

/** Bedtime: clock minutes after midnight. Late-night bedtimes (1-6am) stay as-is. */
export const bedtimeMinutes = (iso: string): number => toLocalClockMin(iso);

/** Wake time: same. */
export const waketimeMinutes = (iso: string): number => toLocalClockMin(iso);

/** Midpoint of sleep in clock minutes, accounting for sleep crossing midnight. */
export const midpointMinutes = (bedIso: string, wakeIso: string): number => {
  const bed = toLocalClockMin(bedIso);
  let wake = toLocalClockMin(wakeIso);
  if (wake <= bed) wake += DAY_MIN; // wake is next day
  let mid = (bed + wake) / 2;
  if (mid >= DAY_MIN) mid -= DAY_MIN;
  return mid;
};

/** Circular mean for clock minutes (handles midnight wrap). Returns 0..1439. */
export const circularMean = (mins: number[]): number => {
  if (mins.length === 0) return 0;
  let sx = 0, sy = 0;
  for (const m of mins) {
    const a = (m / DAY_MIN) * 2 * Math.PI;
    sx += Math.cos(a);
    sy += Math.sin(a);
  }
  let theta = Math.atan2(sy / mins.length, sx / mins.length);
  if (theta < 0) theta += 2 * Math.PI;
  return (theta / (2 * Math.PI)) * DAY_MIN;
};

/** Circular standard deviation in minutes, using the Mardia formula. */
export const circularStd = (mins: number[]): number => {
  if (mins.length < 2) return 0;
  let sx = 0, sy = 0;
  for (const m of mins) {
    const a = (m / DAY_MIN) * 2 * Math.PI;
    sx += Math.cos(a);
    sy += Math.sin(a);
  }
  const r = Math.sqrt((sx / mins.length) ** 2 + (sy / mins.length) ** 2);
  // Standard formula: sqrt(-2 ln R), in radians; convert to minutes
  if (r <= 0) return DAY_MIN / 4;
  const stdRad = Math.sqrt(-2 * Math.log(Math.min(r, 1)));
  return (stdRad / (2 * Math.PI)) * DAY_MIN;
};

// ─────────────────────────────────────────────────────────────────────────────
// Date helpers
// ─────────────────────────────────────────────────────────────────────────────

const enumerateDates = (range: DateRange): string[] => {
  const out: string[] = [];
  const start = new Date(range.start + 'T00:00:00');
  const end = new Date(range.end + 'T00:00:00');
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
};

const dateInEvent = (date: string, ev: LifeEvent) =>
  date >= ev.start_date && date <= ev.end_date;

const countEventDaysInRange = (events: LifeEvent[], type: LifeEvent['event_type'], range: DateRange): number => {
  const dates = enumerateDates(range);
  let count = 0;
  for (const d of dates) {
    if (events.some(ev => ev.event_type === type && dateInEvent(d, ev))) count++;
  }
  return count;
};

const countEventOccurrencesInRange = (events: LifeEvent[], type: LifeEvent['event_type'], range: DateRange): number =>
  events.filter(ev =>
    ev.event_type === type
    && ev.start_date <= range.end
    && ev.end_date >= range.start,
  ).length;

// ─────────────────────────────────────────────────────────────────────────────
// Resolver
// ─────────────────────────────────────────────────────────────────────────────

export const resolveMetric = (source: string, bundle: MetricBundle, range: DateRange): number | null => {
  const days = (() => {
    const s = new Date(range.start).getTime();
    const e = new Date(range.end).getTime();
    return Math.max(1, Math.round((e - s) / 86400000) + 1);
  })();

  switch (source) {
    // ── Sleep ──────────────────────────────────────────────────────────────
    case 'sleep.hours': {
      const rows = bundle.sleep.filter(s => inRange(s.date, range) && s.hours != null);
      if (rows.length === 0) return null;
      return rows.reduce((sum, r) => sum + (r.hours as number), 0) / rows.length;
    }
    case 'sleep.quality': {
      const rows = bundle.sleep.filter(s => inRange(s.date, range) && s.quality != null);
      if (rows.length === 0) return null;
      return rows.reduce((sum, r) => sum + (r.quality as number), 0) / rows.length;
    }
    case 'sleep.consistency_score': {
      // Average of bedtime + wake-time std dev (in minutes), then convert to 0-100 score
      // via the sleep_consistency goal's step function in goals table.
      // Here we just return the raw avg-std-min — scoring lives in the goal.
      const rows = bundle.sleep.filter(s => inRange(s.date, range) && s.went_to_bed_at && s.woke_up_at);
      if (rows.length < 3) return null;
      const bedMinutes = rows.map(r => bedtimeMinutes(r.went_to_bed_at!));
      const wakeMinutes = rows.map(r => waketimeMinutes(r.woke_up_at!));
      // We want std dev of clock times — circular mean to handle midnight wrap
      const bedStd = circularStd(bedMinutes);
      const wakeStd = circularStd(wakeMinutes);
      return (bedStd + wakeStd) / 2;
    }
    case 'sleep.bedtime_std_min': {
      const rows = bundle.sleep.filter(s => inRange(s.date, range) && s.went_to_bed_at);
      if (rows.length < 3) return null;
      return circularStd(rows.map(r => bedtimeMinutes(r.went_to_bed_at!)));
    }
    case 'sleep.waketime_std_min': {
      const rows = bundle.sleep.filter(s => inRange(s.date, range) && s.woke_up_at);
      if (rows.length < 3) return null;
      return circularStd(rows.map(r => waketimeMinutes(r.woke_up_at!)));
    }
    case 'sleep.midpoint_std_min': {
      const rows = bundle.sleep.filter(s => inRange(s.date, range) && s.went_to_bed_at && s.woke_up_at);
      if (rows.length < 3) return null;
      const mids = rows.map(r => midpointMinutes(r.went_to_bed_at!, r.woke_up_at!));
      return circularStd(mids);
    }
    case 'sleep.avg_bedtime_min': {
      const rows = bundle.sleep.filter(s => inRange(s.date, range) && s.went_to_bed_at);
      if (rows.length === 0) return null;
      return circularMean(rows.map(r => bedtimeMinutes(r.went_to_bed_at!)));
    }
    case 'sleep.avg_waketime_min': {
      const rows = bundle.sleep.filter(s => inRange(s.date, range) && s.woke_up_at);
      if (rows.length === 0) return null;
      return circularMean(rows.map(r => waketimeMinutes(r.woke_up_at!)));
    }

    // ── Meals / Nutrition ─────────────────────────────────────────────────
    // For multi-day windows, divide by DISTINCT LOGGED DAYS, not by total days in range.
    // This prevents unlogged days from diluting your average — e.g. if you logged 200g
    // protein on 3 of 7 days, the weekly avg should be 200g/day (you hit target every
    // day you tracked), not 86g/day (which would punish you for not logging).
    case 'meals.calories_sum': {
      const rows = bundle.meals.filter(m => inRange(m.date, range) && m.calories != null);
      if (rows.length === 0) return null;
      const sum = rows.reduce((s, r) => s + (r.calories as number), 0);
      if (days === 1) return sum;
      const loggedDays = new Set(rows.map(r => r.date)).size;
      return sum / loggedDays;
    }
    case 'meals.protein_g_sum': {
      const rows = bundle.meals.filter(m => inRange(m.date, range) && m.protein_g != null);
      if (rows.length === 0) return null;
      const sum = rows.reduce((s, r) => s + (r.protein_g as number), 0);
      if (days === 1) return sum;
      const loggedDays = new Set(rows.map(r => r.date)).size;
      return sum / loggedDays;
    }
    case 'meals.carbs_g_sum': {
      const rows = bundle.meals.filter(m => inRange(m.date, range) && m.carbs_g != null);
      if (rows.length === 0) return null;
      const sum = rows.reduce((s, r) => s + (r.carbs_g as number), 0);
      if (days === 1) return sum;
      const loggedDays = new Set(rows.map(r => r.date)).size;
      return sum / loggedDays;
    }
    case 'meals.fat_g_sum': {
      const rows = bundle.meals.filter(m => inRange(m.date, range) && m.fat_g != null);
      if (rows.length === 0) return null;
      const sum = rows.reduce((s, r) => s + (r.fat_g as number), 0);
      if (days === 1) return sum;
      const loggedDays = new Set(rows.map(r => r.date)).size;
      return sum / loggedDays;
    }

    // ── Workouts ──────────────────────────────────────────────────────────
    case 'workouts.count':
      return bundle.workouts.filter(w => inRange(w.date, range)).length;
    case 'workouts.basketball_count':
      return bundle.workouts.filter(w => inRange(w.date, range) && isBasketball(w.name)).length;
    case 'workouts.climbing_count':
      return bundle.workouts.filter(w => inRange(w.date, range) && isClimbing(w.name)).length;
    case 'workouts.lifting_count':
      return bundle.workouts.filter(w => inRange(w.date, range) && isLifting(w.name)).length;
    case 'workouts.duration_min': {
      const rows = bundle.workouts.filter(w => inRange(w.date, range) && w.duration_min != null);
      if (rows.length === 0 && bundle.workouts.length === 0) return null;
      return rows.reduce((s, r) => s + (r.duration_min as number), 0);
    }

    // ── Daily logs ────────────────────────────────────────────────────────
    case 'mood.avg': {
      const rows = bundle.dailyLogs.filter(d => inRange(d.date, range) && d.mood != null);
      if (rows.length === 0) return null;
      return rows.reduce((s, r) => s + (r.mood as number), 0) / rows.length;
    }
    case 'energy.avg': {
      const rows = bundle.dailyLogs.filter(d => inRange(d.date, range) && d.energy != null);
      if (rows.length === 0) return null;
      return rows.reduce((s, r) => s + (r.energy as number), 0) / rows.length;
    }
    case 'stress.avg': {
      const rows = bundle.dailyLogs.filter(d => inRange(d.date, range) && d.stress != null);
      if (rows.length === 0) return null;
      return rows.reduce((s, r) => s + (r.stress as number), 0) / rows.length;
    }
    case 'weight_lbs': {
      const rows = bundle.dailyLogs.filter(d => inRange(d.date, range) && d.weight_lbs != null);
      if (rows.length === 0) return null;
      const latest = rows.sort((a, b) => b.date.localeCompare(a.date))[0];
      return latest.weight_lbs as number;
    }
    case 'weight_lbs.weekly_change': {
      // Δ = latest weight in range minus weight ~7 days before that.
      const latestRow = [...bundle.dailyLogs]
        .filter(d => d.weight_lbs != null && d.date <= range.end)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      if (!latestRow) return null;
      const target = new Date(latestRow.date + 'T00:00:00');
      target.setDate(target.getDate() - 7);
      const targetStr = target.toISOString().slice(0, 10);
      const past = [...bundle.dailyLogs]
        .filter(d => d.weight_lbs != null && d.date <= targetStr)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      if (!past) return null;
      return (latestRow.weight_lbs as number) - (past.weight_lbs as number);
    }

    // ── Finance ───────────────────────────────────────────────────────────
    case 'transactions.real_spend': {
      const txs = bundle.transactions.filter(t => inRange(t.date, range));
      if (txs.length === 0 && bundle.transactions.length === 0) return null;
      return txs.filter(isRealSpend).reduce((s, t) => s + Math.abs(t.amount), 0);
    }
    case 'transactions.real_income': {
      const txs = bundle.transactions.filter(t => inRange(t.date, range));
      if (txs.length === 0 && bundle.transactions.length === 0) return null;
      return txs.filter(isRealIncome).reduce((s, t) => s + t.amount, 0);
    }
    case 'transactions.savings': {
      const txs = bundle.transactions.filter(t => inRange(t.date, range));
      if (txs.length === 0 && bundle.transactions.length === 0) return null;
      const income = txs.filter(isRealIncome).reduce((s, t) => s + t.amount, 0);
      const spend = txs.filter(isRealSpend).reduce((s, t) => s + Math.abs(t.amount), 0);
      return income - spend;
    }
    case 'transactions.savings_rate': {
      const txs = bundle.transactions.filter(t => inRange(t.date, range));
      if (txs.length === 0 && bundle.transactions.length === 0) return null;
      const income = txs.filter(isRealIncome).reduce((s, t) => s + t.amount, 0);
      const spend = txs.filter(isRealSpend).reduce((s, t) => s + Math.abs(t.amount), 0);
      if (income <= 0) return null;
      return ((income - spend) / income) * 100;
    }
    case 'transactions.dining_spend': {
      const txs = bundle.transactions.filter(t => inRange(t.date, range));
      return txs
        .filter(t => t.amount < 0 && (t.custom_category === 'dining' || t.custom_category === 'dining_out' || t.custom_category === 'food_delivery'))
        .reduce((s, t) => s + Math.abs(t.amount), 0);
    }
    case 'transactions.subscriptions_spend': {
      const txs = bundle.transactions.filter(t => inRange(t.date, range));
      return txs
        .filter(t => t.amount < 0 && (t.custom_category === 'subscriptions' || t.custom_category === 'subscriptions_ai'))
        .reduce((s, t) => s + Math.abs(t.amount), 0);
    }
    case 'transactions.travel_spend': {
      const txs = bundle.transactions.filter(t => inRange(t.date, range));
      return txs
        .filter(t => t.amount < 0 && (
          t.custom_category === 'travel'
          || t.custom_category === 'travel_lodging'
          || t.custom_category === 'travel_parking'
        ))
        .reduce((s, t) => s + Math.abs(t.amount), 0);
    }

    // ── Life events ───────────────────────────────────────────────────────
    case 'life.travel_days':
      return countEventDaysInRange(bundle.lifeEvents, 'travel', range);
    case 'life.sick_days':
      return countEventDaysInRange(bundle.lifeEvents, 'sick', range);
    case 'life.social_days':
      return countEventDaysInRange(bundle.lifeEvents, 'social', range);
    case 'life.office_days':
      return countEventDaysInRange(bundle.lifeEvents, 'office', range);
    case 'life.work_crunch_days':
      return countEventDaysInRange(bundle.lifeEvents, 'work_crunch', range);
    case 'life.injury_days':
      return countEventDaysInRange(bundle.lifeEvents, 'injury', range);
    case 'life.networking_count':
      return countEventOccurrencesInRange(bundle.lifeEvents, 'networking', range);

    default:
      return null;
  }
};

export const KNOWN_METRIC_SOURCES = [
  // Sleep
  'sleep.hours', 'sleep.quality', 'sleep.consistency_score',
  'sleep.bedtime_std_min', 'sleep.waketime_std_min', 'sleep.midpoint_std_min',
  'sleep.avg_bedtime_min', 'sleep.avg_waketime_min',
  // Nutrition
  'meals.calories_sum', 'meals.protein_g_sum', 'meals.carbs_g_sum', 'meals.fat_g_sum',
  // Workouts
  'workouts.count', 'workouts.basketball_count', 'workouts.climbing_count', 'workouts.lifting_count', 'workouts.duration_min',
  // Body
  'mood.avg', 'energy.avg', 'stress.avg', 'weight_lbs', 'weight_lbs.weekly_change',
  // Finance
  'transactions.real_spend', 'transactions.real_income', 'transactions.savings', 'transactions.savings_rate',
  'transactions.dining_spend', 'transactions.subscriptions_spend', 'transactions.travel_spend',
  // Life context
  'life.travel_days', 'life.sick_days', 'life.social_days', 'life.office_days',
  'life.work_crunch_days', 'life.injury_days', 'life.networking_count',
] as const;
