import { differenceInDays, parseISO } from 'date-fns';
import { sumByDay, valueByDay } from './correlations';

// Fitbit overstates total burn (HR-based activity on basketball/climbing). 12% haircut,
// per the trainer profile (90-day avg 2,923 → ~2,570 TDEE, matches the food log).
// Revisit after a few weeks of projected-vs-actual weight.
export const BURN_FACTOR = 0.88;
export const KCAL_PER_LB = 3500;
// Normal day-to-day swing (water, glycogen, sodium) — inside this band we call it "on model".
export const WEIGHT_BAND_LBS = 1.5;

export interface VitalsRow { date: string; calories_total: number | null }
export interface MealRow { date: string; calories: number | null }
export interface WeightPoint { date: string; weight: number }

export interface BalanceDay {
  date: string;
  day: number;      // days since `since`
  intake: number;
  burnRaw: number;  // Fitbit as reported
  burnAdj: number;  // after the haircut
  deficit: number;  // burnAdj - intake (positive = losing)
}

/**
 * One row per complete day that has BOTH a burn reading and logged intake.
 * A missing value is not a zero: unlogged meals or an unsynced day are skipped, and
 * today is excluded because it is still in progress.
 */
export function buildDailyBalance(opts: {
  vitals: VitalsRow[];
  meals: MealRow[];
  since: string;
  today: string;
  factor?: number;
}): BalanceDay[] {
  const { vitals, meals, since, today, factor = BURN_FACTOR } = opts;
  const intakeByDay = sumByDay(meals, m => m.calories);
  const burnByDay = valueByDay(vitals, v => v.calories_total);
  const rows: BalanceDay[] = [];
  burnByDay.forEach((burnRaw, date) => {
    if (date < since || date >= today) return;
    const intake = intakeByDay.get(date);
    if (!intake || intake <= 0 || burnRaw <= 0) return;
    const burnAdj = burnRaw * factor;
    rows.push({
      date,
      day: differenceInDays(parseISO(date), parseISO(since)),
      intake: Math.round(intake),
      burnRaw: Math.round(burnRaw),
      burnAdj: Math.round(burnAdj),
      deficit: Math.round(burnAdj - intake),
    });
  });
  return rows.sort((a, b) => a.day - b.day);
}

/** Mean deficit over the most recent `n` counted days (null if none). */
export function avgDeficit(balance: BalanceDay[], n: number): number | null {
  const recent = balance.slice(-n);
  if (!recent.length) return null;
  return recent.reduce((s, b) => s + b.deficit, 0) / recent.length;
}

export function cumulativeDeficit(balance: BalanceDay[]): number {
  return balance.reduce((s, b) => s + b.deficit, 0);
}

/** Trailing-window mean of weigh-ins so one salty morning doesn't move the trend. */
export function smoothWeights(points: WeightPoint[], windowDays = 7): (WeightPoint & { smooth: number })[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map(p => {
    const inWindow = sorted.filter(q => {
      const gap = differenceInDays(parseISO(p.date), parseISO(q.date));
      return gap >= 0 && gap < windowDays;
    });
    const smooth = inWindow.reduce((s, q) => s + q.weight, 0) / inWindow.length;
    return { ...p, smooth };
  });
}

/**
 * Energy-balance weight on the morning of cut day `day`: start weight minus the deficit
 * accumulated through the previous day. Days past the last counted day are extrapolated at
 * `forwardAvg` per day.
 */
export function modelWeight(
  startWeight: number,
  balance: BalanceDay[],
  day: number,
  forwardAvg: number | null,
): number {
  const through = day - 1;
  let cum = balance.filter(b => b.day <= through).reduce((s, b) => s + b.deficit, 0);
  const lastDay = balance.length ? balance[balance.length - 1].day : null;
  if (lastDay != null && forwardAvg != null && through > lastDay) {
    cum += (through - lastDay) * forwardAvg;
  }
  return startWeight - cum / KCAL_PER_LB;
}

/** Cut day on which the model reaches `target`, or null if the deficit isn't positive. */
export function modelEtaDay(
  startWeight: number,
  target: number,
  balance: BalanceDay[],
  forwardAvg: number | null,
): number | null {
  if (!balance.length || forwardAvg == null || forwardAvg <= 0) return null;
  const lastDay = balance[balance.length - 1].day;
  const wNext = modelWeight(startWeight, balance, lastDay + 1, forwardAvg);
  if (wNext <= target) return lastDay + 1;
  return lastDay + 1 + Math.ceil(((wNext - target) * KCAL_PER_LB) / forwardAvg);
}

/**
 * Burn factor that would make the model match the scale. Only returned with enough data
 * (14+ counted days, 4+ weigh-ins spanning 10+ days) — a hint for recalibrating BURN_FACTOR.
 */
export function impliedBurnFactor(
  balance: BalanceDay[],
  smoothed: { date: string; smooth: number }[],
  startWeight: number,
): number | null {
  if (balance.length < 14 || smoothed.length < 4) return null;
  const span = differenceInDays(parseISO(smoothed[smoothed.length - 1].date), parseISO(smoothed[0].date));
  if (span < 10) return null;
  const actualLoss = startWeight - smoothed[smoothed.length - 1].smooth;
  const lastDate = smoothed[smoothed.length - 1].date;
  const used = balance.filter(b => b.date < lastDate);
  const sumBurn = used.reduce((s, b) => s + b.burnRaw, 0);
  const sumIntake = used.reduce((s, b) => s + b.intake, 0);
  if (!sumBurn) return null;
  return (actualLoss * KCAL_PER_LB + sumIntake) / sumBurn;
}
