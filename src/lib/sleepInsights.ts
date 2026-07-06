// Sleep intelligence — derived from the now-detailed Fitbit stage data.
// Pure functions so the Sleep page, hooks, and any agent-facing export stay consistent.

import { SleepEntry } from '../hooks/useSleep';

// Healthy adult targets (fraction of total sleep). Used for the stage-quality read.
export const STAGE_TARGETS = {
  deep: { min: 0.13, ideal: 0.18, max: 0.23 },   // ~13-23% deep
  rem: { min: 0.20, ideal: 0.23, max: 0.27 },    // ~20-27% REM
  light: { min: 0.45, ideal: 0.55, max: 0.65 },  // remainder
};

export const SLEEP_NEED_HOURS = 8;

export interface SleepStagePcts {
  deepPct: number | null;
  remPct: number | null;
  lightPct: number | null;
  stagedMinutes: number | null; // deep+rem+light
}

/** Stage percentages of total staged sleep. Null when stages absent. */
export function stagePercents(s: SleepEntry): SleepStagePcts {
  const deep = s.deep_sleep_min;
  const rem = s.rem_sleep_min;
  const light = s.core_sleep_min;
  if (deep == null && rem == null && light == null) {
    return { deepPct: null, remPct: null, lightPct: null, stagedMinutes: null };
  }
  const total = (deep || 0) + (rem || 0) + (light || 0);
  if (total === 0) return { deepPct: null, remPct: null, lightPct: null, stagedMinutes: 0 };
  return {
    deepPct: deep != null ? deep / total : null,
    remPct: rem != null ? rem / total : null,
    lightPct: light != null ? light / total : null,
    stagedMinutes: total,
  };
}

export interface SleepScore {
  score: number | null;         // 0-100 composite
  band: 'great' | 'good' | 'fair' | 'poor' | null;
  parts: { label: string; value: number; weight: number }[]; // sub-scores for transparency
  confidence: 'high' | 'low';   // low when stages missing
}

/**
 * 0-100 sleep-quality score from the components that actually matter:
 *   duration vs need (30%), efficiency (25%), deep adequacy (20%),
 *   REM adequacy (15%), low fragmentation (10%).
 * Weights renormalize over whatever components are present, so a stage-less
 * night still scores (marked low confidence).
 */
export function sleepScore(s: SleepEntry): SleepScore {
  const parts: { label: string; value: number; weight: number }[] = [];

  if (s.hours != null) {
    parts.push({ label: 'Duration', value: clamp01(s.hours / SLEEP_NEED_HOURS) * 100, weight: 0.30 });
  }
  if (s.efficiency_pct != null) {
    parts.push({ label: 'Efficiency', value: Math.min(100, s.efficiency_pct), weight: 0.25 });
  }
  const pct = stagePercents(s);
  const hasStages = pct.stagedMinutes != null && pct.stagedMinutes > 0;
  if (pct.deepPct != null) {
    parts.push({ label: 'Deep', value: targetScore(pct.deepPct, STAGE_TARGETS.deep), weight: 0.20 });
  }
  if (pct.remPct != null) {
    parts.push({ label: 'REM', value: targetScore(pct.remPct, STAGE_TARGETS.rem), weight: 0.15 });
  }
  if (s.awakenings != null) {
    // 0 awakenings = 100; each one costs ~8pts, floor 0.
    parts.push({ label: 'Restfulness', value: Math.max(0, 100 - s.awakenings * 8), weight: 0.10 });
  }

  if (parts.length === 0) return { score: null, band: null, parts, confidence: 'low' };
  const wsum = parts.reduce((a, p) => a + p.weight, 0);
  const score = Math.round(parts.reduce((a, p) => a + p.value * p.weight, 0) / wsum);
  return {
    score,
    band: score >= 85 ? 'great' : score >= 70 ? 'good' : score >= 50 ? 'fair' : 'poor',
    parts,
    confidence: hasStages && s.efficiency_pct != null ? 'high' : 'low',
  };
}

/** Rolling sleep debt: cumulative deficit vs need over the last `days`, in hours. */
export function sleepDebt(entries: SleepEntry[], days = 7): number {
  const recent = [...entries]
    .filter((e) => e.hours != null)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, days);
  return recent.reduce((debt, e) => debt + Math.max(0, SLEEP_NEED_HOURS - (e.hours || 0)), 0);
}

/** Bedtime/wake consistency: std-dev of bed & wake clock-times (minutes). Lower = more regular. */
export function consistency(entries: SleepEntry[]): { bedSd: number | null; wakeSd: number | null } {
  const bedMins = entries.map((e) => clockMinutes(e.went_to_bed_at)).filter((v): v is number => v != null);
  const wakeMins = entries.map((e) => clockMinutes(e.woke_up_at)).filter((v): v is number => v != null);
  return { bedSd: stdev(bedMins), wakeSd: stdev(wakeMins) };
}

// ── helpers ──────────────────────────────────────────────────────────────────
function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }

/** 100 at ideal, tapering to ~60 at the min/max edges, lower outside the band. */
function targetScore(value: number, t: { min: number; ideal: number; max: number }): number {
  if (value >= t.min && value <= t.max) {
    const span = value <= t.ideal ? t.ideal - t.min : t.max - t.ideal;
    const dist = Math.abs(value - t.ideal);
    return Math.round(100 - (dist / (span || 1)) * 20); // 100 → 80 across the healthy band
  }
  // Outside band: fall off faster.
  const edge = value < t.min ? t.min : t.max;
  const overshoot = Math.abs(value - edge);
  return Math.max(0, Math.round(75 - overshoot * 300));
}

/** Minutes-since-midnight for a timestamp, wrapping late-night bedtimes toward a continuous scale. */
function clockMinutes(ts: string | null | undefined): number | null {
  if (!ts) return null;
  const d = new Date(ts);
  if (isNaN(d.getTime())) return null;
  let m = d.getHours() * 60 + d.getMinutes();
  // Treat pre-noon bedtimes as "next day" so 11pm & 1am cluster instead of splitting.
  if (m < 12 * 60) m += 24 * 60;
  return m;
}

function stdev(xs: number[]): number | null {
  if (xs.length < 2) return null;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
  return Math.sqrt(variance);
}
