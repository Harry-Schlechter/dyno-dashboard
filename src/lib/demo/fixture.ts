// Fake data for demo/portfolio mode. Hand-crafted to look realistic but
// contain zero real personal data. Keys match Supabase table column names.

const today = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date(today); d.setDate(d.getDate() - n); return iso(d);
};

const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const hoursAgo = (n: number) => new Date(Date.now() - n * 3600 * 1000).toISOString();

// Every daily series covers this window so no page has a short tail and the
// 90-day range filters in the UI are fully populated. Transactions run longer
// because the spending comparisons need a trailing baseline to measure against.
const DAYS = 90;

// ── Daily logs (last 60 days) ───────────────────────────────────────────────

// mood/energy/stress are 1-10 numeric in the real schema, not labels.
const daily_logs = range(DAYS).map(i => {
  const inDip = i >= 8 && i <= 13;   // matches the recovery dip below
  return {
    id: `dl-${i}`,
    user_id: 'demo',
    date: daysAgo(i),
    mood: Math.max(1, Math.min(10, (inDip ? 5 : 7) + Math.round((Math.random() - 0.5) * 2))),
    energy: Math.max(1, Math.min(10, (inDip ? 4 : 7) + Math.round((Math.random() - 0.5) * 2))),
    stress: Math.max(1, Math.min(10, (inDip ? 6 : 4) + Math.round((Math.random() - 0.5) * 2))),
    journal: '',
    weight_lbs: Math.round((175 + Math.sin(i / 8) * 1.5 + (Math.random() - 0.5)) * 10) / 10,
    body_fat_pct: Math.round((14.5 + Math.sin(i / 10) * 0.6) * 10) / 10,
    steps: Math.round(8000 + Math.random() * 4000),
    calories: Math.round(2100 + (Math.random() - 0.5) * 400),
    protein_g: Math.round(150 + (Math.random() - 0.5) * 30),
    carbs_g: Math.round(220 + (Math.random() - 0.5) * 40),
    fat_g: Math.round(75 + (Math.random() - 0.5) * 15),
    notes: '',
  };
});

// ── Sleep (60 days) ─────────────────────────────────────────────────────────

const sleep = range(DAYS).map(i => {
  const inDip = i >= 8 && i <= 13;
  const hours = Math.round((7.2 + (Math.random() - 0.5) * 1.4 - (inDip ? 0.5 : 0)) * 100) / 100;
  const timeInBed = Math.round(hours * 60 / 0.9);
  const deep = Math.round(75 + (Math.random() - 0.5) * 25 - (inDip ? 12 : 0));
  const rem = Math.round(90 + (Math.random() - 0.5) * 30 - (inDip ? 10 : 0));
  return {
    id: `s-${i}`,
    user_id: 'demo',
    date: daysAgo(i),
    hours,
    quality: Math.max(1, Math.min(10, Math.round((inDip ? 6 : 8) + (Math.random() - 0.5) * 2))),
    went_to_bed_at: `${daysAgo(i + 1)}T22:${String(30 + Math.floor(Math.random() * 25)).padStart(2, '0')}:00Z`,
    woke_up_at: `${daysAgo(i)}T06:${String(10 + Math.floor(Math.random() * 30)).padStart(2, '0')}:00Z`,
    deep_sleep_min: deep,
    rem_sleep_min: rem,
    core_sleep_min: Math.max(0, Math.round(hours * 60) - deep - rem),
    efficiency_pct: Math.round(88 + (Math.random() - 0.5) * 7),
    sleep_latency_min: Math.round(8 + Math.random() * 12),
    time_in_bed_min: timeInBed,
    awakenings: Math.round(1 + Math.random() * 3),
    notes: '',
    // Kept for the demo voice/observation copy, which reads these names.
    score: Math.round((inDip ? 72 : 84) + (Math.random() - 0.5) * 10),
    deep_minutes: deep,
    rem_minutes: rem,
  };
});

// ── Meals (recent) ──────────────────────────────────────────────────────────

const MEAL_ROTATION = [
  ['breakfast', 'Greek yogurt, granola and berries', 380, 25, 45, 10, 6],
  ['lunch',     'Chicken salad bowl with quinoa',    620, 40, 55, 25, 9],
  ['dinner',    'Salmon, rice and broccoli',         740, 50, 60, 30, 8],
  ['snack',     'Protein shake',                     280, 30, 25, 5,  2],
] as const;

// Four meals a day, every day in the window — the Nutrition page breaks meals
// out per day, so a partial tail would show empty days.
const meals = range(DAYS * 4).map(i => {
  const [meal_type, description, calories, protein_g, carbs_g, fat_g, fiber_g] =
    MEAL_ROTATION[i % 4];
  // Vary portions slightly so the daily totals aren't identical bars.
  const jitter = (v: number) => Math.round(v * (1 + (Math.random() - 0.5) * 0.18));
  return {
    id: `m-${i}`,
    user_id: 'demo',
    date: daysAgo(Math.floor(i / 4)),
    meal_type,
    description,
    calories: jitter(calories),
    protein_g: jitter(protein_g),
    carbs_g: jitter(carbs_g),
    fat_g: jitter(fat_g),
    fiber_g,
  };
});

// ── Workouts ────────────────────────────────────────────────────────────────

const WORKOUT_ROTATION = [
  ['Push day',      'strength', 'lift'],
  ['Easy run',      'cardio',   'run'],
  ['Pull day',      'strength', 'lift'],
  ['Mobility',      'mobility', 'mobility'],
  ['Leg day',       'strength', 'lift'],
  ['Tempo run',     'cardio',   'run'],
] as const;

// Every other day across the whole window.
const workouts = range(Math.floor(DAYS / 2)).map(i => {
  const [name, activity_type, kind] = WORKOUT_ROTATION[i % 6];
  const isLift = kind === 'lift';
  return {
    id: `w-${i}`,
    user_id: 'demo',
    date: daysAgo(i * 2),
    name,
    activity_type,
    duration_min: 45 + Math.round(Math.random() * 30),
    notes: '',
    source: 'manual' as const,
    tags: [kind],
    review_status: 'confirmed' as const,
    avg_hr: isLift ? 118 + Math.round(Math.random() * 12) : 148 + Math.round(Math.random() * 14),
    max_hr: isLift ? 152 + Math.round(Math.random() * 12) : 176 + Math.round(Math.random() * 10),
    active_calories: isLift ? 320 + Math.round(Math.random() * 90) : 480 + Math.round(Math.random() * 140),
    session_start: `${daysAgo(i * 2)}T17:30:00Z`,
    // Retained so older copy/observations that key off type still resolve.
    workout_type: kind,
  };
});

// One row PER SET, matching the real schema (exercise_name / set_number / rpe).
const LIFT_PLAN: Array<[string, number, number, number]> = [
  ['Bench Press', 4, 8, 175],
  ['Back Squat',  4, 6, 245],
  ['Deadlift',    3, 5, 315],
];

const workout_exercises = workouts.flatMap((w, wi) =>
  w.workout_type !== 'lift' ? [] :
    LIFT_PLAN.flatMap(([exercise_name, sets, reps, topWeight], ei) => {
      // wi counts backwards from today, so older sessions get lighter weight.
      // Roughly 10% of working weight gained across the window, stepped in 5lb
      // increments — that's what makes the strength trend visible on Fitness.
      const stepsBack = Math.floor(wi / 6);
      const weight = Math.max(
        Math.round((topWeight * 0.9) / 5) * 5,
        topWeight - stepsBack * 5,
      );
      return range(sets).map(s => ({
        id: `we-${wi}-${ei}-${s}`,
        workout_id: w.id,
        user_id: 'demo',
        exercise_name,
        exercise_order: ei + 1,
        set_number: s + 1,
        reps,
        weight_lbs: weight,
        rpe: Math.min(10, 7 + Math.round(s / 2)),
        is_pr: false,
      }));
    }),
);

const exercise_prs = [
  { id: 'pr-1', user_id: 'demo', exercise_name: 'Bench Press', weight_lbs: 205, reps: 1, achieved_on: daysAgo(45), date: daysAgo(45) },
  { id: 'pr-2', user_id: 'demo', exercise_name: 'Back Squat',  weight_lbs: 295, reps: 1, achieved_on: daysAgo(60), date: daysAgo(60) },
  { id: 'pr-3', user_id: 'demo', exercise_name: 'Deadlift',    weight_lbs: 365, reps: 1, achieved_on: daysAgo(30), date: daysAgo(30) },
];

// ── Tasks ───────────────────────────────────────────────────────────────────

// status/priority match the real schema: 'pending' | 'completed' | 'blocked',
// priority 1 (high) → 3 (low). Negative daysAgo() is a future date.
const TASK_SEEDS: Array<[string, string, string, number, string | null, string[], number]> = [
  ['t-1', 'Review Q2 roadmap',            'pending',   1, daysAgo(-2), ['work'],     3],
  ['t-2', 'Book flights for October trip', 'pending',   1, daysAgo(-5), ['travel'],   2],
  ['t-3', 'Renew gym membership',          'pending',   2, daysAgo(-1), ['personal'], 1],
  ['t-4', 'Schedule dentist',              'pending',   3, null,         ['health'],   5],
  ['t-5', 'Categorize two flagged charges', 'pending',  2, daysAgo(0),  ['money'],    1],
  ['t-6', 'Confirm venue shortlist',       'blocked',   2, daysAgo(-9), ['wedding'],  6],
  ['t-7', 'File expense report',           'completed', 2, daysAgo(2),  ['work'],     4],
  ['t-8', 'Order new lifting shoes',       'completed', 3, daysAgo(6),  ['training'], 8],
];

const tasks = TASK_SEEDS.map(([id, title, status, priority, due_date, tags, created]) => ({
  id,
  user_id: 'demo',
  title,
  description: '',
  status,
  priority,
  due_date,
  tags,
  completed_at: status === 'completed' ? `${daysAgo(created - 1)}T15:00:00Z` : null,
  created_at: `${daysAgo(created)}T09:00:00Z`,
  updated_at: `${daysAgo(Math.max(0, created - 1))}T09:00:00Z`,
}));

// ── Calendar ────────────────────────────────────────────────────────────────

// Spread across a few weeks either side of today so the month view is populated
// whenever the demo is opened. Negative daysAgo() is the future.
const EVENT_SEEDS: Array<[string, number, string, string, string, string]> = [
  ['Team standup',        0,  '09:00', '09:30', 'work',     ''],
  ['Deep work block',     0,  '14:00', '18:00', 'work',     ''],
  ['Gym — pull day',      0,  '17:30', '18:30', 'health',   ''],
  ['Lunch with Alex',    -1,  '12:00', '13:00', 'personal', 'Cafe Nord'],
  ['Roadmap review',     -1,  '10:00', '11:00', 'work',     'HQ'],
  ['Gym — legs',         -2,  '17:30', '18:45', 'health',   ''],
  ['Quarterly planning', -3,  '10:00', '12:00', 'work',     'HQ'],
  ['Dentist',            -6,  '08:30', '09:15', 'health',   'Northside Dental'],
  ['Golf with Jordan',   -8,  '08:00', '12:00', 'personal', 'Riverbend'],
  ['Venue walkthrough', -12,  '15:00', '16:30', 'personal', 'Across town'],
  ['1:1 with manager',    1,  '11:00', '11:30', 'work',     ''],
  ['Gym — push day',      2,  '17:30', '18:30', 'health',   ''],
  ['Team retro',          3,  '15:00', '16:00', 'work',     ''],
  ['Dinner with Sam',  5,  '19:00', '21:00', 'personal', 'Downtown'],
  ['Gym — legs',          6,  '17:30', '18:45', 'health',   ''],
  ['Sprint planning',     9,  '10:00', '11:30', 'work',     ''],
  ['Long run',           12,  '07:00', '08:15', 'health',   ''],
];

const EVENT_COLOR: Record<string, string> = {
  work: '#5B8DEF',
  health: '#4CAF50',
  personal: '#FFB74D',
};

const calendar_events = EVENT_SEEDS.map(([title, d, from, to, category, location], i) => ({
  id: `c-${i}`,
  user_id: 'demo',
  title,
  description: null,
  location,
  start_time: `${daysAgo(d)}T${from}:00Z`,
  end_time: `${daysAgo(d)}T${to}:00Z`,
  all_day: false,
  category,
  color: EVENT_COLOR[category] || '#7d8590',
  source: 'google',
  source_calendar_name: 'Personal',
  status: 'confirmed',
}));

// ── Contacts ────────────────────────────────────────────────────────────────

const contacts = [
  { id: 'p-1', user_id: 'demo', name: 'Alex Rivera',  email: 'alex@example.com',  notes: '' },
  { id: 'p-2', user_id: 'demo', name: 'Jordan Park',  email: 'jordan@example.com', notes: '' },
];

// ── Finances ────────────────────────────────────────────────────────────────

// Column names mirror the real Supabase schema exactly (account_name /
// account_type / account_subtype / current_balance), because the finance
// helpers in lib/finance.ts bucket accounts off those fields.
const financial_accounts = [
  { id: 'a-1', user_id: 'demo', account_name: 'Checking',    institution: 'Sample Bank',   account_type: 'depository', account_subtype: 'checking',   current_balance: 8420.15,   is_active: true, currency: 'USD', last_updated: daysAgo(0) },
  { id: 'a-2', user_id: 'demo', account_name: 'Savings',     institution: 'Sample Bank',   account_type: 'depository', account_subtype: 'savings',    current_balance: 32150.00,  is_active: true, currency: 'USD', last_updated: daysAgo(0) },
  { id: 'a-3', user_id: 'demo', account_name: 'Brokerage',   institution: 'Sample Broker', account_type: 'brokerage',  account_subtype: 'taxable',    current_balance: 87420.55,  is_active: true, currency: 'USD', last_updated: daysAgo(0) },
  { id: 'a-4', user_id: 'demo', account_name: '401(k)',      institution: 'Sample Retire', account_type: 'retirement', account_subtype: '401k',       current_balance: 124300.00, is_active: true, currency: 'USD', last_updated: daysAgo(0) },
  { id: 'a-5', user_id: 'demo', account_name: 'Roth IRA',    institution: 'Sample Retire', account_type: 'retirement', account_subtype: 'roth',       current_balance: 41250.00,  is_active: true, currency: 'USD', last_updated: daysAgo(0) },
  { id: 'a-6', user_id: 'demo', account_name: 'Credit Card', institution: 'Sample Card',   account_type: 'credit',     account_subtype: 'credit_card', current_balance: -1820.40, is_active: true, currency: 'USD', last_updated: daysAgo(0) },
];

// [category, typical charge, merchant, roughly how many days between charges]
const TXN_CATEGORIES: Array<[string, number, string, number]> = [
  ['groceries',     -78,  'Whole Foods',      4],
  ['dining',        -34,  'Local Eatery',     3],
  ['utilities',     -145, 'Power Co',        30],
  ['transport',     -22,  'Uber',             5],
  ['entertainment', -19,  'Streaming Plus',  30],
  ['shopping',      -64,  'Online Store',     9],
  ['gym',           -65,  'Gym',             30],
];

const DAYS_OF_HISTORY = 120;

// Recurring spend, generated per category on its own cadence. Each category
// gets a different starting offset so charges land on staggered days instead of
// every merchant billing on the same date.
const recurring_txns = TXN_CATEGORIES.flatMap(([cat, base, merchant, everyN], ci) =>
  range(Math.floor(DAYS_OF_HISTORY / everyN)).map((k) => {
    const day = k * everyN + (ci * 2) % everyN;
    // The dining anomaly the observation engine reports: weekday lunches out
    // have crept up over the last month. Without this the "62% above average"
    // insight would be describing data that doesn't show it.
    const isRecentDining = cat === 'dining' && day <= 30;
    const amt = base * (1 + (Math.random() - 0.5) * 0.35) * (isRecentDining ? 1.7 : 1);
    return {
      id: `tx-${cat}-${k}`,
      user_id: 'demo',
      account_id: k % 5 === 0 ? 'a-6' : 'a-1',
      date: daysAgo(day),
      description: merchant,
      merchant_name: merchant,
      amount: Math.round(amt * 100) / 100,
      empower_category: cat,
      custom_category: cat,
      pending: false,
    };
  }),
);

// Deliberately round figures. Everything in this file is invented, and an
// oddly precise paycheck would read as somebody's real number — so the demo
// uses flat amounts that are obviously synthetic. Kept in sync with
// DEFAULT_SEMI_MONTHLY_PAYCHECK in lib/finance.ts, which the projection math
// reads.
const DEMO_PAYCHECK = 5000;   // semi-monthly → $10,000/mo, $120,000/yr
const DEMO_RENT = 2200;
const DEMO_SAVINGS_TRANSFER = 1500;

// Rent on the 1st, salary on the 15th and the last day — semi-monthly.
const fixed_txns = range(6).flatMap(m => {
  const monthStart = new Date(today.getFullYear(), today.getMonth() - m, 1);
  const iso2 = (d: Date) => d.toISOString().slice(0, 10);
  const mid = new Date(today.getFullYear(), today.getMonth() - m, 15);
  const end = new Date(today.getFullYear(), today.getMonth() - m + 1, 0);
  const rows = [
    { id: `tx-rent-${m}`, date: iso2(monthStart), amount: -DEMO_RENT, cat: 'rent', name: 'Apartment' },
    { id: `tx-pay-a-${m}`, date: iso2(mid), amount: DEMO_PAYCHECK, cat: 'income', name: 'Employer' },
    { id: `tx-pay-b-${m}`, date: iso2(end), amount: DEMO_PAYCHECK, cat: 'income', name: 'Employer' },
    { id: `tx-xfer-${m}`, date: iso2(mid), amount: -DEMO_SAVINGS_TRANSFER, cat: 'transfer', name: 'Savings Transfer' },
  ];
  return rows
    .filter(r => r.date <= daysAgo(0))
    .map(r => ({
      id: r.id,
      user_id: 'demo',
      account_id: 'a-1',
      date: r.date,
      description: r.name,
      merchant_name: r.name,
      amount: r.amount,
      empower_category: r.cat,
      custom_category: r.cat,
      pending: false,
    }));
});

const financial_transactions = [...recurring_txns, ...fixed_txns]
  .sort((a, b) => b.date.localeCompare(a.date));

// Derived from the transactions above so the insight the engine "wrote" quotes
// numbers a visitor can verify on the Finances page. Hard-coding them would let
// the copy drift away from the chart.
const DINING_STATS = (() => {
  const rows = financial_transactions.filter(t => t.custom_category === 'dining');
  const dayOf = (t: { date: string }) =>
    Math.round((Date.now() - new Date(t.date).getTime()) / 86400000);
  const sum = (xs: typeof rows) => Math.abs(xs.reduce((s, t) => s + t.amount, 0));
  const recentRows = rows.filter(t => dayOf(t) <= 30);
  const priorRows = rows.filter(t => dayOf(t) > 30 && dayOf(t) <= 120);
  const recent = Math.round(sum(recentRows));
  const baseline = Math.round(priorRows.length ? sum(priorRows) / 3 : 0);
  return {
    recent,
    baseline,
    count: recentRows.length,
    pct: baseline ? Math.round(((recent - baseline) / baseline) * 100) : 0,
  };
})();

const SUB_SEEDS: Array<[string, string, string, number, string, string | null, number]> = [
  ['sub-1', 'Gym',            'Gym',       65.00, 'essential',        null, 1],
  ['sub-2', 'Streaming Plus', 'Streaming', 18.99, 'nice_to_have',     null, 12],
  ['sub-3', 'Music',          'Music',     11.99, 'cancel_candidate', 'Overlaps with Streaming Plus — check usage before renewal.', 20],
  ['sub-4', 'Cloud Storage',  'Cloud',      9.99, 'essential',        null, 3],
];

const financial_subscriptions = SUB_SEEDS.map(([id, name, merchant_pattern, expected_amount, tier, notes, dueIn]) => ({
  id,
  user_id: 'demo',
  name,
  merchant_pattern,
  expected_amount,
  cadence: 'monthly' as const,
  status: 'active' as const,
  tier,
  first_charged_at: daysAgo(400),
  last_charged_at: daysAgo(30 - dueIn),
  next_expected_at: daysAgo(-dueIn),
  trial_ends_at: null,
  canceled_at: null,
  source: 'detected' as const,
  notes,
  cancel_url: null,
}));

// ticker / current_value / snapshot_date match the real schema. SPAXX is
// deliberately included: the net-worth math treats it as cash even though it
// sits inside a brokerage account, which is one of the subtler rules worth
// showing off.
const HOLDING_SEEDS: Array<[string, string, string, number, number, number, string]> = [
  ['h-1', 'a-3', 'VTI',   145.2, 268.40, 0.78, 'equity'],
  ['h-2', 'a-3', 'VXUS',  220.8, 62.10,  0.91, 'equity'],
  ['h-3', 'a-3', 'BND',   95.5,  73.25,  1.04, 'bond'],
  ['h-4', 'a-4', 'VTI',   460.0, 268.40, 0.71, 'equity'],
  ['h-5', 'a-5', 'VOO',   78.0,  528.90, 0.74, 'equity'],
  ['h-6', 'a-3', 'SPAXX', 27420, 1.00,   1.00, 'cash'],
];

const HOLDING_NAMES: Record<string, string> = {
  VTI: 'Vanguard Total Stock Market ETF',
  VXUS: 'Vanguard Total International Stock ETF',
  BND: 'Vanguard Total Bond Market ETF',
  VOO: 'Vanguard S&P 500 ETF',
  SPAXX: 'Fidelity Government Money Market',
};

// SPAXX is deliberately included: the net-worth math treats it as cash even
// though it sits inside a brokerage account, which is one of the subtler rules
// worth showing off.
const investment_holdings = HOLDING_SEEDS.map(([id, account_id, ticker, quantity, current_price, basisRatio, asset_class]) => {
  const current_value = Math.round(quantity * current_price * 100) / 100;
  const cost_basis = Math.round(current_value * basisRatio * 100) / 100;
  const gain_loss = Math.round((current_value - cost_basis) * 100) / 100;
  return {
    id,
    user_id: 'demo',
    account_id,
    ticker,
    description: HOLDING_NAMES[ticker] || ticker,
    quantity,
    current_price,
    current_value,
    cost_basis,
    gain_loss,
    gain_loss_pct: cost_basis ? Math.round((gain_loss / cost_basis) * 1000) / 10 : 0,
    asset_class,
    snapshot_date: daysAgo(0),
  };
});

const financial_investment_activity = range(Math.floor(DAYS / 7) + 6).map(i => {
  const kind = (i % 3 === 0 ? '401k' : i % 3 === 1 ? 'dividend' : 'buy') as '401k' | 'dividend' | 'buy';
  const ticker = ['VTI', 'VOO', 'BND'][i % 3];
  return {
    id: `ia-${i}`,
    user_id: 'demo',
    date: daysAgo(i * 7),
    account_id: i % 2 === 0 ? 'a-3' : 'a-4',
    description: kind === '401k' ? '401(k) contribution'
               : kind === 'dividend' ? `${ticker} dividend`
               : `Buy ${ticker}`,
    merchant_name: 'Sample Broker',
    amount: 250 + Math.round(Math.random() * 750),
    kind,
    empower_transaction_id: null,
    pending: false,
  };
});

const net_worth_snapshots = range(24).map(i => {
  // i = months back from today, so index 0 is the most recent snapshot.
  const cash = 40000 - i * 200;
  const brokerage = 87000 - i * 1500;
  const retirement = 165000 - i * 2800;
  const total_liabilities = 1820 + Math.round(Math.random() * 500);
  const total_assets = cash + brokerage + retirement;
  return {
    id: `nw-${i}`,
    user_id: 'demo',
    date: daysAgo(i * 30),
    net_worth: total_assets - total_liabilities,
    total_assets,
    total_liabilities,
    breakdown: { cash, brokerage, retirement },
    by_institution: {
      'Sample Bank': cash,
      'Sample Broker': brokerage,
      'Sample Retire': retirement,
    },
  };
});

// Months are computed relative to today so the demo never looks stale — the
// last 6 months always end at the current month, whenever the page is opened.
const monthAgo = (n: number) => {
  const d = new Date(today.getFullYear(), today.getMonth() - n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const SPEND_BASE: Array<[string, number]> = [
  ['groceries',     540.20],
  ['dining',        285.40],
  ['rent',         2150.00],
  ['utilities',     145.10],
  ['transport',     180.55],
  ['entertainment',  95.97],
  ['shopping',      220.45],
];

const monthly_spending_by_category = range(6).flatMap(m =>
  SPEND_BASE.map(([category, base]) => {
    // Rent is fixed; everything else drifts a little month to month. Dining
    // trends up toward the current month so the anomaly observation holds up.
    const total = category === 'rent'
      ? base
      : Math.round(
          (base * (1 + (Math.random() - 0.5) * 0.18) +
            (category === 'dining' ? (5 - m) * 22 : 0)) * 100,
        ) / 100;
    return { user_id: 'demo', month: monthAgo(m), category, total };
  }),
);

// ── Misc ────────────────────────────────────────────────────────────────────

const golf_rounds = range(Math.floor(DAYS / 14)).map(i => ({
  id: `g-${i}`,
  user_id: 'demo',
  date: daysAgo(i * 14),
  course: ['Pinecrest GC', 'Lakeside CC', 'Riverbend'][i % 3],
  score: 84 + Math.round(Math.random() * 8),
  par: 72,
  notes: '',
}));

const agent_briefings = [
  {
    id: 'b-1',
    user_id: 'demo',
    agent_id: 'general',
    kind: 'morning',
    for_date: daysAgo(0),
    generated_at: `${daysAgo(0)}T06:30:00Z`,
    created_at: `${daysAgo(0)}T06:30:00Z`,
    headline: "Recovery is back at baseline — good day to push",
    raw_text: null,
    body: {
      sections: [
        {
          kind: 'highlight',
          label: 'The short version',
          items: [
            'Recovery is green for the third day running after last week\'s dip. Nothing in the data suggests holding back today.',
          ],
        },
        {
          kind: 'wins',
          label: 'Going well',
          items: [
            'Three lifting sessions completed this week, all at full working weight.',
            'Sleep has cleared seven hours five nights running.',
            'Resting heart rate and HRV are both back at baseline.',
          ],
        },
        {
          kind: 'missed',
          label: 'Slipping',
          items: [
            'Protein came in under target on 8 of the last 14 days.',
            `Dining spend is ${DINING_STATS.pct}% above your three-month average, all weekday charges.`,
          ],
        },
        {
          kind: 'preview',
          label: 'Today',
          items: [
            'Two meetings before noon, then a clear afternoon.',
            'Gym block at 5:30pm — pull day.',
            'Gym membership renews tomorrow ($65).',
          ],
        },
        {
          kind: 'asks',
          label: 'Waiting on you',
          items: [
            { agent: 'finance', ask: 'Two transactions from Tuesday still need a category.', link: '/finances' },
            { agent: 'trainer', ask: 'Confirm whether to push deadlifts to 325 next block.', link: '/fitness' },
          ],
        },
      ],
    },
  },
  {
    id: 'b-2',
    user_id: 'demo',
    agent_id: 'general',
    kind: 'evening',
    for_date: daysAgo(1),
    generated_at: `${daysAgo(1)}T21:00:00Z`,
    created_at: `${daysAgo(1)}T21:00:00Z`,
    headline: 'Solid day — training done, spending quiet',
    raw_text: null,
    body: {
      sections: [
        {
          kind: 'highlight',
          label: 'The short version',
          items: ['You hit everything that mattered today and spent almost nothing.'],
        },
        {
          kind: 'wins',
          label: 'Going well',
          items: ['Lifting session completed.', 'Protein target met for the first time in four days.'],
        },
        {
          kind: 'note',
          label: 'Worth knowing',
          items: ['Your best sleep consistently follows lifting days, so tonight should be a good one.'],
        },
      ],
    },
  },
  {
    id: 'b-3',
    user_id: 'demo',
    agent_id: 'general',
    kind: 'weekly',
    for_date: daysAgo(3),
    generated_at: `${daysAgo(3)}T18:00:00Z`,
    created_at: `${daysAgo(3)}T18:00:00Z`,
    headline: 'Week in review: training consistent, money drifting',
    raw_text: null,
    body: {
      sections: [
        {
          kind: 'highlight',
          label: 'The short version',
          items: ['Training and sleep held steady through a week where your body was clearly under strain. Spending is the one thing trending the wrong way.'],
        },
        {
          kind: 'list',
          label: 'By the numbers',
          items: [
            'Sleep: 7h06m average, one night under six hours.',
            'Training: 3 lifts, 2 runs, zero missed sessions.',
            'Recovery: five days suppressed mid-week, now recovered.',
            'Spending: dining 62% over average, everything else on plan.',
          ],
        },
        {
          kind: 'missed',
          label: 'Slipping',
          items: ['Weekday dining is the entire spending gap — eight charges, none on a weekend.'],
        },
      ],
    },
  },
];

// agent_activity_today is a view keyed by agent, not a log of individual
// actions — one row per agent with counts and a last-seen timestamp.
const AGENT_ACTIVITY: Array<[string, number, number, number, string[]]> = [
  ['personal-assistant', 14, 5, 0.4,  ['schedule', 'tasks', 'capture']],
  ['financial-advisor',   9, 4, 1.5,  ['categorize', 'anomaly-check']],
  ['trainer',             6, 2, 4.0,  ['program', 'recovery-check']],
  ['nutritionist',        5, 1, 6.5,  ['log-meal', 'macro-check']],
  ['mental-health',       3, 1, 11.0, ['journal-review']],
];

const agent_activity_today = AGENT_ACTIVITY.map(([agent_id, message_count, actions_taken, hoursBack, intents]) => ({
  user_id: 'demo',
  agent_id,
  message_count,
  actions_taken,
  last_message_at: hoursAgo(hoursBack),
  intents,
}));

// The daily_macros view exposes total_* aggregates, not the raw column names.
const daily_macros = daily_logs.map(d => ({
  user_id: 'demo',
  date: d.date,
  total_calories: d.calories,
  total_protein: d.protein_g,
  total_carbs: d.carbs_g,
  total_fat: d.fat_g,
  meal_count: 4,
}));

// ── Vitals (recent_vitals view, 60 days) ────────────────────────────────────
// Deliberately shaped: a mid-window dip in HRV + spike in resting HR that the
// observation engine "notices" below. Demo viewers should be able to see the
// signal in the chart that the agent claims to have found.

const vitals = range(DAYS).map(i => {
  // i counts backwards from today; the dip sits ~8-13 days ago.
  const inDip = i >= 8 && i <= 13;
  const rhr = 54 + Math.sin(i / 9) * 2 + (inDip ? 6 : 0) + (Math.random() - 0.5);
  const hrv = 68 + Math.cos(i / 7) * 5 - (inDip ? 16 : 0) + (Math.random() - 0.5) * 3;
  return {
    user_id: 'demo',
    date: daysAgo(i),
    resting_hr: Math.round(rhr),
    hrv_rmssd: Math.round(hrv),
    spo2_avg: Math.round((96 + Math.random() * 2) * 10) / 10,
    spo2_min: Math.round((93 + Math.random() * 2) * 10) / 10,
    breathing_rate_avg: Math.round((14 + (Math.random() - 0.5)) * 10) / 10,
    skin_temp_deviation: Math.round(((inDip ? 0.7 : 0) + (Math.random() - 0.5) * 0.4) * 10) / 10,
    steps: Math.round(8000 + Math.random() * 4000),
    active_minutes_total: Math.round(45 + Math.random() * 40),
    very_active_min: Math.round(12 + Math.random() * 18),
    hr_zone_cardio_min: Math.round(8 + Math.random() * 15),
    hr_zone_peak_min: Math.round(Math.random() * 6),
    calories_active: Math.round(600 + Math.random() * 300),
    calories_total: Math.round(2600 + Math.random() * 300),
    resting_hr_7d_avg: Math.round(55 + (inDip ? 3 : 0)),
    hrv_rmssd_7d_avg: Math.round(66 - (inDip ? 9 : 0)),
  };
});

// ── Recovery scores (60 days) ───────────────────────────────────────────────

const recovery_scores = vitals.map((v, i) => {
  const inDip = i >= 8 && i <= 13;
  const score = inDip
    ? Math.round(38 + Math.random() * 12)
    : Math.round(72 + Math.random() * 18);
  const band = score >= 70 ? 'green' : score >= 50 ? 'yellow' : 'red';
  const sleepRow = sleep[i];
  return {
    user_id: 'demo',
    date: v.date,
    score,
    band,
    confidence: 'high',
    hrv_rmssd: v.hrv_rmssd,
    hrv_baseline: 66,
    resting_hr: v.resting_hr,
    rhr_baseline: 55,
    sleep_hours: sleepRow ? Math.round(sleepRow.hours * 10) / 10 : 7.2,
    sleep_eff: Math.round(88 + (Math.random() - 0.5) * 6),
    deep_min: sleepRow?.deep_minutes ?? 75,
    rem_min: sleepRow?.rem_minutes ?? 90,
    flags: inDip ? ['hrv_below_baseline', 'rhr_elevated'] : [],
    drivers: inDip
      ? [
          { name: 'HRV vs baseline', contribution: -22, note: '16ms below your 30-day baseline' },
          { name: 'Resting HR',      contribution: -14, note: '6bpm above baseline for 5 straight days' },
          { name: 'Sleep duration',  contribution: 6,   note: 'Still hitting ~7h' },
        ]
      : [
          { name: 'HRV vs baseline', contribution: 12, note: 'At or above your baseline' },
          { name: 'Sleep duration',  contribution: 9,  note: '7h+ for 3 nights running' },
          { name: 'Training load',   contribution: -4, note: 'Moderate load this week' },
        ],
    summary: inDip
      ? 'Recovery is suppressed. HRV is well under baseline and resting HR has been elevated for five days — this reads like accumulated fatigue or a minor illness, not a one-off bad night.'
      : 'Recovery is in a good place. Nothing here suggests backing off training.',
  };
});

// ── Agent observations ──────────────────────────────────────────────────────
// The heart of the demo. These are what the observation engine writes: it
// DESCRIBES what it noticed and never prescribes. Each one ties back to data
// that is actually visible elsewhere in the fixture.

const OBS: Array<Partial<any>> = [
  {
    agent_id: 'health', source: 'stats', kind: 'anomaly', severity: 'high',
    title: 'Resting heart rate ran 6bpm above baseline for five straight days',
    body: 'Between 13 and 8 days ago your resting HR sat at 60-61bpm against a 55bpm baseline, while HRV dropped to 50ms from a 66ms baseline. Skin temperature was also +0.7°C over the same window. All three moved together and have since returned to normal.',
    data: { metric: 'resting_hr', baseline: 55, peak: 61, days: 5 },
    related_table: 'recovery_scores', magnitude: 0.82, surprise: 0.74,
    pattern_key: 'rhr_elevated_multiday', pinned: true,
  },
  {
    agent_id: 'finance', source: 'stats', kind: 'anomaly', severity: 'medium',
    title: `Dining spend is tracking ${DINING_STATS.pct}% above your 3-month average`,
    body: `Over the last 30 days you have spent $${DINING_STATS.recent} on dining against a $${DINING_STATS.baseline} monthly average for the three months before that. ${DINING_STATS.count} charges, and the gap is weekday lunches — weekend dining is unchanged.`,
    data: { category: 'dining', current: DINING_STATS.recent, expected: DINING_STATS.baseline, pct: DINING_STATS.pct },
    related_table: 'financial_transactions', magnitude: 0.62, surprise: 0.55,
    pattern_key: 'dining_above_avg',
  },
  {
    agent_id: 'health', source: 'agent', kind: 'pattern', severity: 'info',
    title: 'Your best sleep follows lifting days, not running days',
    body: 'Across 30 workouts, nights after a lifting session averaged 7h38m with a sleep score of 86. Nights after a run averaged 6h51m with a score of 74. The gap holds when controlling for bedtime, so it is not simply that you run later in the day.',
    data: { lift_hours: 7.63, run_hours: 6.85, n: 30 },
    related_table: 'workouts', magnitude: 0.44, surprise: 0.61,
    pattern_key: 'sleep_by_workout_type',
  },
  {
    agent_id: 'finance', source: 'cron', kind: 'insight', severity: 'info',
    title: 'Four subscriptions renew in the next 12 days, totalling $105.97',
    body: 'Gym ($65) renews tomorrow, Cloud Storage ($9.99) in 3 days, Streaming Plus ($18.99) in 12 days, Music ($11.99) in 20 days. Combined that is 1.3% of your typical monthly outflow.',
    data: { count: 4, total: 105.97 },
    related_table: 'financial_subscriptions', magnitude: 0.2, surprise: 0.1,
  },
  {
    agent_id: 'health', source: 'stats', kind: 'milestone', severity: 'info',
    title: 'Deadlift PR of 365lb set 30 days ago still stands as your top lift',
    body: 'Your working deadlift sets have climbed from 295lb to 315lb over the last 8 weeks — a 6.8% increase while body weight stayed flat at roughly 175lb.',
    data: { exercise: 'Deadlift', pr: 365, working: 315 },
    related_table: 'exercise_prs', magnitude: 0.5, surprise: 0.3,
  },
  {
    agent_id: 'general', source: 'agent', kind: 'pattern', severity: 'low',
    title: 'Journal entries mentioning work stress cluster on Sundays',
    body: 'Of 9 entries tagged with work stress in the last 60 days, 5 were written on a Sunday. Sunday entries also score lowest on mood (avg 5.4 vs 7.1 on other days).',
    data: { day: 'Sunday', count: 5, of: 9 },
    related_table: 'journal_entries', magnitude: 0.38, surprise: 0.52,
  },
  {
    agent_id: 'finance', source: 'stats', kind: 'insight', severity: 'info',
    title: 'Net worth is up $54,200 over 24 months, but the mix has shifted',
    body: 'Retirement grew from $97k to $165k while cash stayed roughly flat at $40k. Your cash position as a share of net worth fell from 17% to 14%.',
    data: { delta: 54200, months: 24 },
    related_table: 'net_worth_snapshots', magnitude: 0.55, surprise: 0.2,
  },
  {
    agent_id: 'health', source: 'stats', kind: 'warning', severity: 'medium',
    title: 'Protein intake dipped below target on 8 of the last 14 days',
    body: 'Average protein over the last two weeks was 141g against your 150g target. The shortfall is concentrated on days with no logged lunch.',
    data: { avg: 141, target: 150, misses: 8 },
    related_table: 'daily_macros', magnitude: 0.3, surprise: 0.25,
  },
];

const agent_observations = OBS.map((o, i) => ({
  id: `obs-${i + 1}`,
  user_id: 'demo',
  agent_id: o.agent_id,
  source: o.source,
  kind: o.kind,
  severity: o.severity,
  title: o.title,
  body: o.body,
  data: o.data ?? null,
  related_agents: [],
  related_table: o.related_table ?? null,
  related_ids: [],
  observed_for_date: daysAgo(Math.floor(i / 2)),
  expires_at: null,
  status: 'active',
  dismissed_at: null,
  dismissed_reason: null,
  acknowledged_at: null,
  pinned: o.pinned ?? false,
  pattern_key: o.pattern_key ?? null,
  magnitude: o.magnitude ?? null,
  surprise: o.surprise ?? null,
  created_at: hoursAgo(i * 7 + 2),
  updated_at: hoursAgo(i * 7 + 2),
}));

// ── Predictions + forecast accuracy ─────────────────────────────────────────
// The self-scoring loop: the system commits to a number, then grades itself.

// The last value is the metric's hit rate. They differ on purpose: a system
// that self-scores honestly is right more often about weight than about
// discretionary spending, and a demo showing 100% everywhere reads as fake.
const PRED_METRICS: Array<[string, string, number, string, string, number]> = [
  ['sleep_hours',  '7.4h',   7.4,  '±0.6h', 'Lifting day yesterday and a normal bedtime — your post-lift nights average 7h38m.', 0.78],
  ['resting_hr',   '55bpm',  55,   '±2bpm', 'HRV and skin temp are back at baseline after last week\'s elevation.', 0.89],
  ['steps',        '9,400',  9400, '±1,500', 'Weekday with a gym block on the calendar; matches your Tuesday median.', 0.67],
  ['weight_lbs',   '175.2',  175.2, '±0.8', 'Weight has oscillated in a 3lb band for 60 days with no trend.', 0.94],
  ['dining_spend', '$28',    28,   '±$14',  'Weekday dining averages $28 when a lunch is not logged at home.', 0.50],
];

// Scored history: every metric predicted every day across the window, then
// graded the next morning. That's DAYS × 5 rows, so the accuracy view has a
// real sample behind its percentages instead of a handful of points.
const scored_predictions = range(DAYS * PRED_METRICS.length).map(i => {
  const [metric, predicted, num, band, rationale, hitRate] = PRED_METRICS[i % PRED_METRICS.length];
  const dayOffset = Math.floor(i / PRED_METRICS.length) + 1;
  // Deterministic spread per metric so the published hit rate matches hitRate
  // instead of drifting with Math.random().
  const hit = ((dayOffset - 1) % 100) < Math.round(hitRate * 100);
  const errPct = hit ? (Math.random() * 0.04) : (0.09 + Math.random() * 0.08);
  const actualNum = Math.round(num * (1 + (i % 2 ? errPct : -errPct)) * 100) / 100;
  return {
    id: `pred-${i}`,
    user_id: 'demo',
    made_on: daysAgo(dayOffset + 1),
    target_date: daysAgo(dayOffset),
    metric,
    predicted,
    predicted_num: num,
    band,
    confidence: Math.round((0.6 + Math.random() * 0.35) * 100) / 100,
    rationale,
    actual: String(actualNum),
    correct: hit,
    error: Math.round(Math.abs(actualNum - num) * 100) / 100,
    scored_at: `${daysAgo(dayOffset - 1)}T06:00:00Z`,
  };
});

// Open predictions for tomorrow — not yet scored.
const open_predictions = PRED_METRICS.map(([metric, predicted, num, band, rationale], i) => ({
  id: `pred-open-${i}`,
  user_id: 'demo',
  made_on: daysAgo(0),
  target_date: daysAgo(-1),
  metric,
  predicted,
  predicted_num: num,
  band,
  confidence: Math.round((0.62 + Math.random() * 0.3) * 100) / 100,
  rationale,
  actual: null,
  correct: null,
  error: null,
  scored_at: null,
}));

const predictions = [...open_predictions, ...scored_predictions];

const forecast_accuracy = PRED_METRICS.map(([metric]) => {
  const rows = scored_predictions.filter(p => p.metric === metric);
  const hits = rows.filter(p => p.correct).length;
  return {
    user_id: 'demo',
    metric,
    scored: rows.length,
    hits,
    hit_rate_pct: rows.length ? Math.round((hits / rows.length) * 1000) / 10 : null,
    avg_error: rows.length
      ? Math.round((rows.reduce((s, p) => s + (p.error || 0), 0) / rows.length) * 100) / 100
      : null,
  };
});

// ── Journal entries ─────────────────────────────────────────────────────────

const JOURNAL_SEEDS: Array<[number, string, string, number, string, string[], string[]]> = [
  [1,  'Long day but a good one. Shipped the migration I have been putting off for three weeks and it went cleanly on the first try. Went to the gym after and hit 315 on deadlifts for a triple, which felt easy. Sam made dinner. Feeling like the backlog is finally shrinking instead of growing.', 'positive', 8, 'Shipped the migration and hit 315x3.', ['work', 'training'], ['Sam']],
  [3,  'Slept badly, maybe five hours, and it showed all day. Could not focus in the morning block at all. Skipped the gym which I always regret. Ordered lunch out again — that is the third time this week and I can feel it in both the budget and how I feel after.', 'negative', 4, 'Bad sleep, skipped gym, ate out again.', ['sleep', 'work'], []],
  [6,  'Quiet Sunday. Did the grocery run, meal prepped for the week, read on the porch for two hours. No work at all which is rare and I should protect that more. Still had the low-level Sunday dread about the week ahead creeping in around 6pm.', 'mixed', 6, 'Restful Sunday with the usual evening dread.', ['rest', 'work stress'], []],
  [9,  'Felt off all day. Heart rate has been high on the watch and I have been dragging since the weekend. Went easy at the gym, just mobility. Probably fighting something off. Went to bed at 9:30 which is unheard of.', 'negative', 5, 'Run down, took a rest day.', ['health'], []],
  [13, 'Better today. Whatever that was seems to have passed. Back to lifting, kept it moderate. Long call with Alex about the contract work — could be a real opportunity but the timing is bad with everything else going on.', 'positive', 7, 'Recovering, and a possible opportunity from Alex.', ['health', 'work'], ['Alex']],
  [17, 'Golf with Jordan at Riverbend. Shot an 86 which I will take. Weather was perfect. Spent the afternoon doing nothing in particular and did not feel guilty about it, which is progress.', 'positive', 9, 'Golf with Jordan, shot 86.', ['golf', 'rest'], ['Jordan']],
  [22, 'Rough one at work. The roadmap review went sideways and I spent the evening replaying it. Ate dinner standing up at the counter at 9pm. Did not journal properly, just needed to get this down.', 'negative', 3, 'Roadmap review went badly.', ['work stress'], []],
  [26, 'Sunday again. Same pattern I keep noticing — fine all day, then the tightness in my chest around dinner thinking about Monday. Went for a walk which helped more than I expected.', 'mixed', 5, 'The Sunday pattern again.', ['work stress', 'rest'], []],
  [31, 'Good week overall. Three lifts, two runs, slept over seven hours every night but one. Money is boring right now in the best way. Starting to think seriously about the Lisbon trip in the spring.', 'positive', 8, 'Consistent week, planning Lisbon.', ['training', 'travel'], []],
  [38, 'Dinner with Sam at the new place downtown. Talked about the wedding timeline and actually made decisions instead of circling. Feel much better having them written down.', 'positive', 9, 'Wedding planning progress with Sam.', ['wedding'], ['Sam']],
  [45, 'Slow start, strong finish. Deep work block from 2 to 6 with no interruptions was worth more than the entire morning. Should defend that time deliberately rather than hoping for it.', 'positive', 7, 'Afternoon deep work block paid off.', ['work'], []],
  [52, 'Sunday. Predictably tense in the evening. Noting it because the pattern is getting hard to ignore at this point.', 'mixed', 5, 'Sunday tension, again.', ['work stress'], []],
  [56, 'First real week back at full training volume. Legs were wrecked by Thursday but in the good way. Sleep has been excellent, over seven and a half hours most nights, and I can feel the difference in the afternoons.', 'positive', 8, 'Back to full training volume.', ['training', 'sleep'], []],
  [59, 'Sunday. Went for a long walk before the dread could set in and it genuinely helped. Filing that away as something that works rather than something I did once.', 'mixed', 6, 'Walked before the Sunday dread.', ['work stress', 'rest'], []],
  [63, 'Spent the morning on the budget and it was less painful than expected. Everything is roughly where it should be except eating out, which keeps creeping. Not a crisis, just a leak.', 'neutral', 7, 'Budget review — dining is the leak.', ['money'], []],
  [67, 'Long call with Jordan about the trip. He has done that trip twice and had strong opinions about where to stay. Wrote it all down before I forgot it.', 'positive', 8, 'Trip planning with Jordan.', ['travel'], ['Jordan']],
  [70, 'Tough training week and I think I underslept it. Nothing dramatic, just flat. Backing the volume off slightly next week rather than pushing through and paying for it.', 'mixed', 5, 'Flat week, pulling volume back.', ['training', 'health'], []],
  [74, 'Sunday. Quieter than usual — no dread to speak of. Interesting that the weeks where I actually finish things on Friday are the ones where Sunday is fine.', 'positive', 7, 'A Sunday without the dread.', ['work stress', 'rest'], []],
  [78, 'Sam and I walked the venue across town. Much better in person than the photos suggested. Narrowing down faster now that we have actually seen a few.', 'positive', 9, 'Venue walkthrough went well.', ['wedding'], ['Sam']],
  [81, 'Nothing much to report. Worked, lifted, ate reasonably, slept fine. Writing it down anyway because the boring days are the ones that actually add up.', 'neutral', 7, 'An ordinary, solid day.', ['rest'], []],
  [85, 'Sunday. The tightness was back. Third or fourth time I have written this exact sentence now, which is probably the point.', 'mixed', 5, 'The Sunday pattern, noted again.', ['work stress'], []],
  [88, 'Good session — hit a clean triple at 305 on deadlift and it moved well. Two months ago that was a hard single. Progress is slow enough that I only see it in the log.', 'positive', 9, 'Deadlift progress visible in the log.', ['training'], []],
];

const journal_entries = JOURNAL_SEEDS.map(([d, raw, sentiment, mood, oneLiner, topics, people], i) => ({
  id: `j-${i}`,
  user_id: 'demo',
  date: daysAgo(d),
  raw_text: raw,
  word_count: raw.split(/\s+/).length,
  mood,
  energy: Math.max(1, Math.min(10, mood + (Math.random() > 0.5 ? 1 : -1))),
  sentiment,
  topics,
  people,
  highlights: [oneLiner],
  one_liner: oneLiner,
  created_at: `${daysAgo(d)}T21:30:00Z`,
}));

// ── Notes (user-written and agent-written) ──────────────────────────────────

const NOTE_SEEDS: Array<[string, string, string[], boolean, 'user' | 'agent', string | null, number]> = [
  ['Trip — open questions', 'Do we need the visa on arrival or in advance?\nCheck whether both legs can be booked on one ticket.\nAsk Jordan about the place he stayed near the centre.', ['travel'], true, 'user', null, 2],
  ['Weekly review — week of the 12th', 'Training: 3 lifts, 2 runs, all sessions completed.\nSleep: averaged 7h12m, one night under 6h.\nMoney: dining is running hot, everything else on plan.\nThe recovery dip mid-week lines up with the elevated resting HR the health agent flagged.', ['review'], false, 'agent', 'general', 4],
  ['Deadlift programming notes', 'Working sets are at 315 for triples and moving well.\nNext block: push to 325 for doubles before deloading.\nKeep the pause variation on the second session each week.', ['training'], false, 'user', null, 7],
  ['Things to stop doing', 'Checking email before the first deep work block.\nSaying yes to meetings that could be a message.\nOrdering lunch out on weekdays — it is both the money and the afternoon crash.', ['habits'], true, 'user', null, 11],
  ['Sunday pattern — what the journal shows', 'Across 60 days, 5 of 9 work-stress entries fall on a Sunday and Sunday mood averages 5.4 against 7.1 elsewhere. Recording this because it has now appeared in three separate weekly reviews.', ['pattern', 'work stress'], false, 'agent', 'general', 14],
  ['Wedding — decisions made so far', 'Date locked for the fall.\nVenue shortlist down to three, all within an hour of town.\nStill open: photographer, and whether we do a rehearsal dinner or something looser.', ['wedding'], false, 'user', null, 20],
  ['Subscription audit', 'Four active subscriptions totalling $105.97/mo. Music and Streaming Plus overlap for what you actually listen to — worth checking usage before the next renewal.', ['money'], false, 'agent', 'finance', 25],
];

const notes = NOTE_SEEDS.map(([title, body, tags, pinned, kind, agentName, d], i) => ({
  id: `n-${i}`,
  user_id: 'demo',
  title,
  body,
  tags,
  pinned,
  author_kind: kind,
  author_agent: agentName,
  archived_at: null,
  created_at: `${daysAgo(d)}T14:00:00Z`,
  updated_at: `${daysAgo(d)}T14:00:00Z`,
}));

// ── Profile ─────────────────────────────────────────────────────────────────

const profiles = [
  { id: 'demo', user_id: 'demo', email: 'demo@dyno', role: 'owner', allowed_spaces: [] },
];

const FIXTURE: Record<string, any[]> = {
  daily_logs,
  daily_macros,
  sleep,
  meals,
  workouts,
  workout_exercises,
  exercise_prs,
  tasks,
  calendar_events,
  contacts,
  financial_accounts,
  financial_transactions,
  financial_subscriptions,
  financial_investment_activity,
  investment_holdings,
  net_worth_snapshots,
  monthly_spending_by_category,
  golf_rounds,
  agent_briefings,
  agent_activity_today,
  recent_vitals: vitals,
  recovery_scores,
  agent_observations,
  predictions,
  forecast_accuracy,
  journal_entries,
  notes,
  profiles,
  extension_pairing: [],
  dashboard_feedback: [],
  observation_feedback: [],
};

export default FIXTURE;
