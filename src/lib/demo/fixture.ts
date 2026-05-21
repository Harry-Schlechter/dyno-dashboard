// Fake data for demo/portfolio mode. Hand-crafted to look realistic but
// contain zero real personal data. Keys match Supabase table column names.

const today = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date(today); d.setDate(d.getDate() - n); return iso(d);
};

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

// ── Daily logs (last 60 days) ───────────────────────────────────────────────

const daily_logs = range(60).map(i => ({
  id: `dl-${i}`,
  user_id: 'demo',
  date: daysAgo(i),
  weight_lbs: 175 + Math.sin(i / 8) * 1.5 + (Math.random() - 0.5),
  steps: Math.round(8000 + Math.random() * 4000),
  calories: Math.round(2100 + (Math.random() - 0.5) * 400),
  protein_g: Math.round(150 + (Math.random() - 0.5) * 30),
  carbs_g: Math.round(220 + (Math.random() - 0.5) * 40),
  fat_g: Math.round(75 + (Math.random() - 0.5) * 15),
  mood: ['great', 'good', 'ok', 'good', 'great'][i % 5],
  energy: 6 + Math.round(Math.random() * 3),
  notes: '',
}));

// ── Sleep (60 days) ─────────────────────────────────────────────────────────

const sleep = range(60).map(i => ({
  id: `s-${i}`,
  user_id: 'demo',
  date: daysAgo(i),
  hours: 7 + (Math.random() - 0.5) * 1.5,
  score: Math.round(80 + (Math.random() - 0.5) * 20),
  rem_minutes: Math.round(90 + (Math.random() - 0.5) * 30),
  deep_minutes: Math.round(75 + (Math.random() - 0.5) * 25),
}));

// ── Meals (recent) ──────────────────────────────────────────────────────────

const meals = range(40).map(i => ({
  id: `m-${i}`,
  user_id: 'demo',
  date: daysAgo(Math.floor(i / 4)),
  meal_type: ['breakfast', 'lunch', 'dinner', 'snack'][i % 4],
  description: ['Greek yogurt + granola', 'Chicken salad bowl', 'Salmon + rice + broccoli', 'Protein shake'][i % 4],
  calories: [380, 620, 740, 280][i % 4],
  protein_g: [25, 40, 50, 30][i % 4],
  carbs_g: [45, 55, 60, 25][i % 4],
  fat_g: [10, 25, 30, 5][i % 4],
}));

// ── Workouts ────────────────────────────────────────────────────────────────

const workouts = range(30).map(i => ({
  id: `w-${i}`,
  user_id: 'demo',
  date: daysAgo(i * 2),
  workout_type: ['lift', 'run', 'lift', 'mobility', 'lift', 'run'][i % 6],
  duration_minutes: 45 + Math.round(Math.random() * 30),
  intensity: 6 + Math.round(Math.random() * 3),
  notes: '',
}));

const workout_exercises = workouts.flatMap((w, i) => w.workout_type === 'lift' ? [
  { id: `we-${i}-1`, workout_id: w.id, user_id: 'demo', exercise: 'Bench Press', sets: 4, reps: 8, weight_lbs: 175 },
  { id: `we-${i}-2`, workout_id: w.id, user_id: 'demo', exercise: 'Back Squat',  sets: 4, reps: 6, weight_lbs: 245 },
  { id: `we-${i}-3`, workout_id: w.id, user_id: 'demo', exercise: 'Deadlift',    sets: 3, reps: 5, weight_lbs: 315 },
] : []);

const exercise_prs = [
  { id: 'pr-1', user_id: 'demo', exercise: 'Bench Press', weight_lbs: 205, reps: 1, achieved_on: daysAgo(45) },
  { id: 'pr-2', user_id: 'demo', exercise: 'Back Squat',  weight_lbs: 295, reps: 1, achieved_on: daysAgo(60) },
  { id: 'pr-3', user_id: 'demo', exercise: 'Deadlift',    weight_lbs: 365, reps: 1, achieved_on: daysAgo(30) },
];

// ── Tasks ───────────────────────────────────────────────────────────────────

const tasks = [
  { id: 't-1', user_id: 'demo', title: 'Review Q2 roadmap',         status: 'todo',        priority: 'high',   due_date: daysAgo(-2), created_at: daysAgo(3), tags: ['work'] },
  { id: 't-2', user_id: 'demo', title: 'Renew gym membership',      status: 'todo',        priority: 'medium', due_date: daysAgo(-7), created_at: daysAgo(1), tags: ['personal'] },
  { id: 't-3', user_id: 'demo', title: 'Schedule dentist',          status: 'in_progress', priority: 'low',    due_date: null,         created_at: daysAgo(5), tags: ['health'] },
  { id: 't-4', user_id: 'demo', title: 'File expense report',       status: 'done',        priority: 'medium', due_date: daysAgo(2),   created_at: daysAgo(4), tags: ['work'] },
  { id: 't-5', user_id: 'demo', title: 'Book flights for trip',     status: 'todo',        priority: 'high',   due_date: daysAgo(-5), created_at: daysAgo(2), tags: ['travel'] },
];

// ── Calendar ────────────────────────────────────────────────────────────────

const calendar_events = [
  { id: 'c-1', user_id: 'demo', title: 'Team standup',          start_time: `${daysAgo(-1)}T09:00:00Z`, end_time: `${daysAgo(-1)}T09:30:00Z`, location: '' },
  { id: 'c-2', user_id: 'demo', title: 'Lunch w/ Alex',          start_time: `${daysAgo(-1)}T12:00:00Z`, end_time: `${daysAgo(-1)}T13:00:00Z`, location: 'Cafe Nord' },
  { id: 'c-3', user_id: 'demo', title: 'Gym',                    start_time: `${daysAgo(0)}T17:30:00Z`,  end_time: `${daysAgo(0)}T18:30:00Z`,  location: '' },
  { id: 'c-4', user_id: 'demo', title: 'Quarterly planning',     start_time: `${daysAgo(-3)}T10:00:00Z`, end_time: `${daysAgo(-3)}T12:00:00Z`, location: 'HQ' },
];

// ── Contacts ────────────────────────────────────────────────────────────────

const contacts = [
  { id: 'p-1', user_id: 'demo', name: 'Alex Rivera',  email: 'alex@example.com',  notes: '' },
  { id: 'p-2', user_id: 'demo', name: 'Jordan Park',  email: 'jordan@example.com', notes: '' },
];

// ── Finances ────────────────────────────────────────────────────────────────

const financial_accounts = [
  { id: 'a-1', user_id: 'demo', name: 'Checking',          institution: 'Sample Bank',     type: 'checking',  balance: 8420.15,  currency: 'USD', last_updated: daysAgo(0) },
  { id: 'a-2', user_id: 'demo', name: 'Savings',           institution: 'Sample Bank',     type: 'savings',   balance: 32150.00, currency: 'USD', last_updated: daysAgo(0) },
  { id: 'a-3', user_id: 'demo', name: 'Brokerage',         institution: 'Sample Broker',   type: 'brokerage', balance: 87420.55, currency: 'USD', last_updated: daysAgo(0) },
  { id: 'a-4', user_id: 'demo', name: '401(k)',             institution: 'Sample Retire',   type: 'retirement', balance: 124300.00, currency: 'USD', last_updated: daysAgo(0) },
  { id: 'a-5', user_id: 'demo', name: 'Roth IRA',           institution: 'Sample Retire',   type: 'retirement', balance: 41250.00, currency: 'USD', last_updated: daysAgo(0) },
  { id: 'a-6', user_id: 'demo', name: 'Credit Card',        institution: 'Sample Card',     type: 'credit',    balance: -1820.40, currency: 'USD', last_updated: daysAgo(0) },
];

const TXN_CATEGORIES: Array<[string, number, string]> = [
  ['groceries',     -8,   'Whole Foods'],
  ['dining',        -5,   'Local Eatery'],
  ['rent',          -1,   'Apartment'],
  ['utilities',     -1,   'Power Co'],
  ['transport',     -3,   'Uber'],
  ['entertainment', -1,   'Streaming'],
  ['shopping',      -2,   'Online Store'],
  ['gym',           -1,   'Gym'],
  ['income',        4055, 'Employer'],
  ['transfer',      -500, 'Savings Transfer'],
];

const financial_transactions = range(120).map(i => {
  const [cat, amtBase, name] = TXN_CATEGORIES[i % TXN_CATEGORIES.length];
  const noise = (Math.random() - 0.5) * Math.abs(amtBase * 0.4);
  const amt = cat === 'rent' ? -2150 : cat === 'income' ? amtBase : amtBase + noise;
  return {
    id: `tx-${i}`,
    user_id: 'demo',
    account_id: 'a-1',
    date: daysAgo(Math.floor(i / 3)),
    description: name,
    amount: Math.round(amt * 100) / 100,
    category: cat,
    custom_category: cat,
    pending: false,
  };
});

const financial_subscriptions = [
  { id: 'sub-1', user_id: 'demo', name: 'Streaming Plus', amount: 18.99,  cadence: 'monthly', next_charge: daysAgo(-12), category: 'entertainment', status: 'active' },
  { id: 'sub-2', user_id: 'demo', name: 'Cloud Storage',  amount: 9.99,   cadence: 'monthly', next_charge: daysAgo(-3),  category: 'subscriptions', status: 'active' },
  { id: 'sub-3', user_id: 'demo', name: 'Music',          amount: 11.99,  cadence: 'monthly', next_charge: daysAgo(-20), category: 'entertainment', status: 'active' },
  { id: 'sub-4', user_id: 'demo', name: 'Gym',            amount: 65.00,  cadence: 'monthly', next_charge: daysAgo(-1),  category: 'gym',           status: 'active' },
];

const investment_holdings = [
  { id: 'h-1', user_id: 'demo', symbol: 'VTI',  account_id: 'a-3', shares: 145.2,  price: 268.40, value: 38971.69, last_updated: daysAgo(0) },
  { id: 'h-2', user_id: 'demo', symbol: 'VXUS', account_id: 'a-3', shares: 220.8,  price: 62.10,  value: 13711.68, last_updated: daysAgo(0) },
  { id: 'h-3', user_id: 'demo', symbol: 'BND',  account_id: 'a-3', shares: 95.5,   price: 73.25,  value: 6995.38,  last_updated: daysAgo(0) },
  { id: 'h-4', user_id: 'demo', symbol: 'VTI',  account_id: 'a-4', shares: 460.0,  price: 268.40, value: 123464.00, last_updated: daysAgo(0) },
  { id: 'h-5', user_id: 'demo', symbol: 'VOO',  account_id: 'a-5', shares: 78.0,   price: 528.90, value: 41254.20, last_updated: daysAgo(0) },
  { id: 'h-6', user_id: 'demo', symbol: 'SPAXX', account_id: 'a-3', shares: 27420, price: 1.00,   value: 27420.00, last_updated: daysAgo(0) },
];

const financial_investment_activity = range(20).map(i => ({
  id: `ia-${i}`,
  user_id: 'demo',
  date: daysAgo(i * 7),
  account_id: i % 2 === 0 ? 'a-3' : 'a-4',
  type: i % 3 === 0 ? 'contribution' : i % 3 === 1 ? 'dividend' : 'reinvest',
  symbol: ['VTI', 'VOO', 'BND'][i % 3],
  amount: 250 + Math.round(Math.random() * 750),
  shares: 1 + Math.random() * 3,
}));

const net_worth_snapshots = range(24).map(i => ({
  id: `nw-${i}`,
  user_id: 'demo',
  date: daysAgo(i * 30),
  total: 280000 - i * 4500 + Math.round((Math.random() - 0.5) * 3000),
  cash: 40000 - i * 200,
  brokerage: 87000 - i * 1500,
  retirement: 165000 - i * 2800,
  liabilities: -1820 - Math.round(Math.random() * 500),
}));

const monthly_spending_by_category = [
  { user_id: 'demo', month: '2026-04', category: 'groceries',     amount: 540.20 },
  { user_id: 'demo', month: '2026-04', category: 'dining',        amount: 285.40 },
  { user_id: 'demo', month: '2026-04', category: 'rent',          amount: 2150.00 },
  { user_id: 'demo', month: '2026-04', category: 'utilities',     amount: 145.10 },
  { user_id: 'demo', month: '2026-04', category: 'transport',     amount: 180.55 },
  { user_id: 'demo', month: '2026-04', category: 'entertainment', amount: 95.97 },
  { user_id: 'demo', month: '2026-04', category: 'shopping',      amount: 220.45 },
];

// ── Misc ────────────────────────────────────────────────────────────────────

const golf_rounds = range(8).map(i => ({
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
    type: 'morning',
    created_at: new Date().toISOString(),
    content: {
      headline: "You're on track today",
      sections: [
        { title: 'Sleep', body: 'You got 7h 24m last night. RHR was solid.' },
        { title: 'Today', body: 'Two meetings before noon, gym at 5:30pm.' },
        { title: 'Money', body: 'No unusual spending in the last 24h.' },
      ],
    },
  },
];

const agent_activity_today = [
  { id: 'a-1', agent: 'general', action: 'Logged breakfast (380 cal)', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
  { id: 'a-2', agent: 'finance', action: 'Categorized 4 transactions', timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString() },
  { id: 'a-3', agent: 'trainer', action: 'Updated weekly lifting plan', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString() },
];

const daily_macros = daily_logs.map(d => ({
  user_id: 'demo',
  date: d.date,
  calories: d.calories,
  protein_g: d.protein_g,
  carbs_g: d.carbs_g,
  fat_g: d.fat_g,
}));

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
  dashboard_feedback: [],
  observation_feedback: [],
};

export default FIXTURE;
