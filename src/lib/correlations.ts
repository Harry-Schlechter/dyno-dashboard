// Pearson correlation + helpers for aligning daily series across domains.
// All functions operate on Map<dateString, number> so callers can mix tables.

export type DailySeries = Map<string, number>;

/** Align two daily series by date. Returns paired arrays of values. */
export const alignSeries = (a: DailySeries, b: DailySeries): { x: number[]; y: number[] } => {
  const x: number[] = [];
  const y: number[] = [];
  for (const [date, va] of a) {
    const vb = b.get(date);
    if (vb !== undefined && Number.isFinite(va) && Number.isFinite(vb)) {
      x.push(va);
      y.push(vb);
    }
  }
  return { x, y };
};

/** Pearson correlation. Returns null if < 5 paired points or zero variance. */
export const pearson = (x: number[], y: number[]): number | null => {
  const n = x.length;
  if (n < 5 || y.length !== n) return null;
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const my = y.reduce((s, v) => s + v, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const ax = x[i] - mx;
    const ay = y[i] - my;
    num += ax * ay;
    dx += ax * ax;
    dy += ay * ay;
  }
  if (dx === 0 || dy === 0) return null;
  return num / Math.sqrt(dx * dy);
};

/** Lagged correlation: y[i] vs x[i - lag]. Positive lag = x leads y. */
export const laggedPearson = (a: DailySeries, b: DailySeries, lagDays: number): number | null => {
  const aShifted: DailySeries = new Map();
  for (const [d, v] of a) {
    const shifted = new Date(d + 'T00:00:00');
    shifted.setDate(shifted.getDate() + lagDays);
    aShifted.set(shifted.toISOString().slice(0, 10), v);
  }
  const { x, y } = alignSeries(aShifted, b);
  return pearson(x, y);
};

/** Color-code a correlation coefficient. */
export const correlationColor = (r: number | null): string => {
  if (r === null) return '#3a3a3a';
  const abs = Math.abs(r);
  const positive = r >= 0;
  const intensity = Math.min(1, abs / 0.7); // r >= 0.7 = full saturation
  const alpha = Math.round(intensity * 255).toString(16).padStart(2, '0');
  return positive ? `#4CAF50${alpha}` : `#F44336${alpha}`;
};

/** Human-readable strength label. */
export const correlationLabel = (r: number | null): string => {
  if (r === null) return 'no data';
  const abs = Math.abs(r);
  const dir = r >= 0 ? '+' : '-';
  if (abs < 0.1) return 'no link';
  if (abs < 0.3) return `${dir} weak`;
  if (abs < 0.5) return `${dir} moderate`;
  if (abs < 0.7) return `${dir} strong`;
  return `${dir} very strong`;
};

/**
 * Sum a multi-row-per-day table into a daily total.
 * E.g., meals → calories per day.
 */
export const sumByDay = <T extends { date: string }>(
  rows: T[],
  pick: (r: T) => number | null | undefined,
): DailySeries => {
  const m: DailySeries = new Map();
  for (const r of rows) {
    const v = pick(r);
    if (v == null || !Number.isFinite(v)) continue;
    m.set(r.date, (m.get(r.date) ?? 0) + v);
  }
  return m;
};

/** Pick a single value per day from a one-row-per-day table. */
export const valueByDay = <T extends { date: string }>(
  rows: T[],
  pick: (r: T) => number | null | undefined,
): DailySeries => {
  const m: DailySeries = new Map();
  for (const r of rows) {
    const v = pick(r);
    if (v != null && Number.isFinite(v)) m.set(r.date, v);
  }
  return m;
};
