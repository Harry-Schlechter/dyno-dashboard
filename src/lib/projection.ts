// Financial-future projection engine — a life-stage budget allocator.
//
// Income is FIXED in code (Harry's raise schedule + Sydney's med-career arc).
// What the user tunes, per LIFE STAGE, is the allocation of net income:
// 401k (each), backdoor Roth (×2), HSA, spending — and WROS absorbs whatever is
// left. Everything compounds month-by-month from current balances, so changing
// any stage's allocations genuinely changes the projected balances at the
// milestones (2032 residency end / 2034 fellowship end / 2036 attending).

// ── Life stages (Harry's mapped-out timeline) ────────────────────────────────
export type StageKey = 'now' | 'residency' | 'fellowship' | 'attending';

export const STAGES: { key: StageKey; label: string; startYM: [number, number]; endYM: [number, number] }[] = [
  { key: 'now',        label: 'Now → residency',   startYM: [2026, 9], endYM: [2028, 6] },
  { key: 'residency',  label: 'Residency',         startYM: [2028, 7], endYM: [2032, 6] },
  { key: 'fellowship', label: 'Fellowship',        startYM: [2032, 7], endYM: [2034, 6] },
  { key: 'attending',  label: 'Attending',         startYM: [2034, 7], endYM: [2037, 12] },
];

// Per-stage allocation choices. Each contribution is either "max" (IRS/plan
// limit for that year) or a fixed monthly dollar amount (0 = off).
export type Alloc = { mode: 'max' | 'amount'; amount: number };

export interface StageLevers {
  harry401k: Alloc;    // max = employee IRS limit; amount = $/mo
  sydney401k: Alloc;   // only applies once Sydney earns
  hsa: Alloc;          // max = family/self limit for the year
  roth1: Alloc;        // backdoor Roth #1 ($7k/yr max)
  roth2: Alloc;        // backdoor Roth #2 ($7k/yr max)
  spendMonthly: number; // baseline spend/mo for the stage (rent added automatically)
}

export interface ProjectionInputs {
  start401k: number;
  startRoth: number;
  startHSA: number;
  startWROS: number;
  returnPct: number;                 // annual investment growth (default 7)
  spendInflationPct: number;         // annual spend growth from 2028 (default 5)
  stages: Record<StageKey, StageLevers>;
  // Optional anchor: start the projection FROM this month with the balances above,
  // instead of the current calendar month. Used to re-anchor the forward line off
  // the latest real snapshot. [year, month]; month is 1-12.
  anchorYM?: [number, number];
}

export interface Milestone {
  year: number; label: string;
  k401: number; roth: number; hsa: number; wros: number; netWorth: number;
}
export interface MonthPoint {
  ym: string;           // 'YYYY-MM'
  year: number; month: number;
  k401: number; roth: number; hsa: number; wros: number; net: number;
  // What went INTO each bucket this month (contribution, not balance).
  // 401k includes employee + Sydney + employer match.
  in401k: number; inRoth: number; inHsa: number; inWros: number;
}
export interface ProjectionResult {
  milestones: Milestone[];
  series: Array<{ year: string; k401: number; roth: number; hsa: number; wros: number; net: number }>;
  monthly: MonthPoint[];  // every month from the anchor through end of 2036
  // per-year audit so the UI can warn if a stage's allocations exceed income
  warnings: string[];
}

// ── Fixed income assumptions ─────────────────────────────────────────────────
const HARRY_BASE_NOW = 165_000;
const HARRY_BASE_APR2027 = 183_750;
const HARRY_RAISE_PCT = 0.05;
const SYDNEY_ATTENDING_RAISE = 0.03;

const RENT_START_YM: [number, number] = [2028, 7];
const RENT_MONTHLY_2028 = 2_500;
const RENT_RAISE_PCT = 0.05;
const MOVE_TO_PA_YEAR = 2028;
const MARRIAGE_YEAR = 2028;

// ── IRS limits (2026 base), auto-grown ~2%/yr for future years ───────────────
const IRS_2026 = { k401: 23_500, hsaSelf: 4_300, hsaFamily: 8_550, roth: 7_000 };
const IRS_INFLATION = 0.02;
function irs(year: number) {
  const g = Math.pow(1 + IRS_INFLATION, Math.max(0, year - 2026));
  return {
    k401: Math.round(IRS_2026.k401 * g / 100) * 100,
    hsaSelf: Math.round(IRS_2026.hsaSelf * g / 50) * 50,
    hsaFamily: Math.round(IRS_2026.hsaFamily * g / 50) * 50,
    roth: Math.round(IRS_2026.roth * g / 500) * 500,
  };
}

function harryBase(year: number): number {
  if (year < 2027) return HARRY_BASE_NOW;
  if (year === 2027) return HARRY_BASE_APR2027;
  return HARRY_BASE_APR2027 * Math.pow(1 + HARRY_RAISE_PCT, year - 2027);
}
function sydneyBase(year: number): number {
  if (year < 2028) return 0;
  if (year < 2032) return 75_000;
  if (year < 2034) return 100_000;
  return 275_000 * Math.pow(1 + SYDNEY_ATTENDING_RAISE, year - 2034);
}
function effectiveTaxRate(householdGross: number, year: number): number {
  let r = householdGross < 120_000 ? 0.24 : householdGross < 250_000 ? 0.28 : householdGross < 450_000 ? 0.33 : 0.37;
  if (year >= MOVE_TO_PA_YEAR) r -= 0.02; // PA flat ~3% vs NY graduated
  return r;
}
function monthlyRent(year: number, month: number): number {
  if (year < RENT_START_YM[0] || (year === RENT_START_YM[0] && month < RENT_START_YM[1])) return 0;
  return RENT_MONTHLY_2028 * Math.pow(1 + RENT_RAISE_PCT, year - RENT_START_YM[0]);
}

function stageForYM(year: number, month: number): StageKey {
  for (const s of STAGES) {
    const [sy, sm] = s.startYM, [ey, em] = s.endYM;
    const afterStart = year > sy || (year === sy && month >= sm);
    const beforeEnd = year < ey || (year === ey && month <= em);
    if (afterStart && beforeEnd) return s.key;
  }
  return 'attending';
}

// Resolve a "max"/"amount" allocation to a MONTHLY dollar figure.
function monthlyAlloc(a: Alloc, maxAnnual: number): number {
  if (a.mode === 'max') return maxAnnual / 12;
  return Math.max(0, a.amount);
}

export function runProjection(inp: ProjectionInputs): ProjectionResult {
  const now = new Date();
  const startYear = inp.anchorYM ? inp.anchorYM[0] : now.getFullYear();
  const startMonth = inp.anchorYM ? inp.anchorYM[1] : now.getMonth() + 1;
  const endYear = 2036;

  let k401 = inp.start401k, roth = inp.startRoth, hsa = inp.startHSA, wros = inp.startWROS;
  const mReturn = Math.pow(1 + inp.returnPct / 100, 1 / 12) - 1;
  const series: ProjectionResult['series'] = [];
  const monthly: MonthPoint[] = [];
  const milestones: Milestone[] = [];
  const warnings: string[] = [];
  const mYears: Record<number, string> = { 2032: 'End of residency', 2034: 'End of fellowship', 2036: '2 yrs attending' };
  const seenWarn = new Set<string>();

  for (let y = startYear; y <= endYear; y++) {
    const lim = irs(y);
    for (let m = (y === startYear ? startMonth : 1); m <= 12; m++) {
      const stage = inp.stages[stageForYM(y, m)];
      const hGross = harryBase(y), sGross = sydneyBase(y);
      const household = hGross + sGross;

      // Contributions (monthly). 401k employee portion is capped at the IRS max.
      const h401 = Math.min(monthlyAlloc(stage.harry401k, lim.k401), lim.k401 / 12);
      const s401 = sGross > 0 ? Math.min(monthlyAlloc(stage.sydney401k, lim.k401), lim.k401 / 12) : 0;
      // Employer match: half of employee contribution (standard framework).
      const match = (h401 + s401) * 0.5;
      const hsaMax = y >= MARRIAGE_YEAR ? lim.hsaFamily : lim.hsaSelf;
      const hsaM = Math.min(monthlyAlloc(stage.hsa, hsaMax), hsaMax / 12);
      const roth1M = Math.min(monthlyAlloc(stage.roth1, lim.roth), lim.roth / 12);
      const roth2M = Math.min(monthlyAlloc(stage.roth2, lim.roth), lim.roth / 12);

      // Spending: stage baseline inflated from 2028 + rent.
      const inflYrs = Math.max(0, y - 2028);
      const spend = stage.spendMonthly * Math.pow(1 + inp.spendInflationPct / 100, inflYrs) + monthlyRent(y, m);

      // Cash math: 401k employee + HSA are pre-tax; Roth + spending come from
      // post-tax net; WROS gets whatever's left of net.
      const preTax = h401 + s401 + hsaM;
      const taxable = Math.max(0, household / 12 - preTax);
      const net = taxable * (1 - effectiveTaxRate(household, y));
      const wrosContrib = net - spend - roth1M - roth2M;
      if (wrosContrib < 0 && !seenWarn.has(inp.stages[stageForYM(y, m)] === stage ? stageForYM(y, m) : '')) {
        const sk = stageForYM(y, m);
        if (!seenWarn.has(sk)) { seenWarn.add(sk); warnings.push(`${sk}: allocations + spending exceed net income (over by ~$${Math.abs(Math.round(wrosContrib))}/mo) — WROS can't go negative, so this stage draws down / is infeasible.`); }
      }

      k401 = k401 * (1 + mReturn) + h401 + s401 + match;
      hsa = hsa * (1 + mReturn) + hsaM;
      roth = roth * (1 + mReturn) + roth1M + roth2M;
      wros = wros * (1 + mReturn) + Math.max(0, wrosContrib);

      monthly.push({
        ym: `${y}-${String(m).padStart(2, '0')}`, year: y, month: m,
        k401, roth, hsa, wros, net: k401 + roth + hsa + wros,
        in401k: h401 + s401 + match, inRoth: roth1M + roth2M, inHsa: hsaM, inWros: Math.max(0, wrosContrib),
      });

      if (m === 12) {
        series.push({ year: `${y}`, k401, roth, hsa, wros, net: k401 + roth + hsa + wros });
        if (mYears[y]) milestones.push({ year: y, label: mYears[y], k401, roth, hsa, wros, netWorth: k401 + roth + hsa + wros });
      }
    }
  }
  return { milestones, series, monthly, warnings };
}

// Sensible starting levers per stage.
export function defaultStages(): Record<StageKey, StageLevers> {
  const maxA = (): Alloc => ({ mode: 'max', amount: 0 });
  const off = (): Alloc => ({ mode: 'amount', amount: 0 });
  return {
    now:        { harry401k: maxA(), sydney401k: off(), hsa: maxA(), roth1: off(), roth2: off(), spendMonthly: 5100 },
    residency:  { harry401k: maxA(), sydney401k: maxA(), hsa: maxA(), roth1: off(), roth2: off(), spendMonthly: 5600 },
    fellowship: { harry401k: maxA(), sydney401k: maxA(), hsa: maxA(), roth1: off(), roth2: off(), spendMonthly: 6000 },
    attending:  { harry401k: maxA(), sydney401k: maxA(), hsa: maxA(), roth1: maxA(), roth2: maxA(), spendMonthly: 8000 },
  };
}

export const DEFAULT_GLOBALS = { returnPct: 7, spendInflationPct: 5 };
