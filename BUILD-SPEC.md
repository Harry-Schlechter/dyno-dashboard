# Dyno Dashboard v2 — Build Spec

## What This Is
A personal life dashboard powered by an AI assistant called Dyno. Dyno runs 24/7 on Telegram, collecting life data (sleep, nutrition, workouts, finances, mood, journal, contacts). This dashboard is the visual layer — showing everything Dyno knows in a beautiful, data-rich UI.

## Stack
- **Framework:** React 18 + TypeScript + Vite (NOT Next.js — this is a SPA deployed to Netlify)
- **UI:** MUI (Material UI) v5 — use the EXACT theme from `THEME-REFERENCE.md`
- **Charts:** Recharts
- **Data:** Supabase (PostgREST API)
- **Styling:** Dark mode only. Glassmorphism cards. The aesthetic from the theme file.
- **Deploy:** Netlify (netlify.toml already exists)
- **Routing:** React Router v6

## CRITICAL: Theme & Styling
The theme.ts and designSystem.ts files from the old personalos project are included in `THEME-REFERENCE.md`. You MUST use this exact theme — the dark glassmorphism aesthetic with:
- Background: #05070b (page), #121821 (cards with 0.9 opacity + blur)
- Primary: #5B8DEF
- Gradient buttons: linear-gradient(135deg, #667eea 0%, #764ba2 100%)
- Border radius: 18px on cards
- Hover: translateY(-4px) with colored box-shadow
- Glass effect: backdrop-filter blur(10px), rgba borders

## Environment Variables (.env.local)
```
VITE_SUPABASE_URL=https://mrgeucdjjnxexcqcmhgr.supabase.co
VITE_SUPABASE_ANON_KEY=<will be set>
VITE_USER_ID=ea8f4579-3ac6-4945-b64d-9daedeb63870
```

ALL Supabase queries MUST filter by user_id.

## Supabase Tables & Columns

### sleep
awakenings, core_sleep_min, created_at, date, deep_sleep_min, efficiency_pct, hours, id, notes, quality, rem_sleep_min, sleep_latency_min, source, time_in_bed_min, updated_at, user_id, went_to_bed_at, woke_up_at

### meals
calories, carbs_g, created_at, date, description, fat_g, fiber_g, id, meal_type, protein_g, user_id

### workouts
created_at, date, duration_min, id, name, notes, template_id, user_id

### workout_exercises
created_at, exercise_name, exercise_order, id, is_pr, notes, reps, rpe, set_number, weight_lbs, workout_id

### daily_logs
body_fat_pct, created_at, date, energy, id, journal, mood, stress, updated_at, user_id, weight_lbs

### drinks
amount_oz, caffeine_mg, date, id, logged_at, notes, type, user_id

### tasks
completed_at, created_at, description, due_date, id, priority (1=high, 2=med, 3=low), status (pending/completed/blocked), tags, title, updated_at, user_id

### financial_accounts
account_name, account_subtype, account_type, available_balance, created_at, currency, current_balance, empower_account_id, id, institution, is_active, is_asset, last_four, last_synced_at, updated_at, user_id

### financial_transactions
account_id, amount, created_at, custom_category, date, description, empower_category, empower_transaction_id, id, is_duplicate, merchant_name, notes, pending, tagged_by, tags, updated_at, user_id

### investment_holdings
account_id, asset_class, cost_basis, created_at, current_price, current_value, description, empower_holding_id, gain_loss, gain_loss_pct, id, quantity, snapshot_date, ticker, user_id

### net_worth_snapshots
breakdown, by_institution, created_at, date, id, net_worth, total_assets, total_liabilities, user_id

### Supabase Views (read-only)
daily_macros, daily_hydration, exercise_prs, monthly_spending, monthly_spending_by_category, weekly_activity, daily_summary, recent_transactions, portfolio_summary, current_net_worth, cash_flow_summaries

## Pages to Build

### 1. Home / Life Score (/)
The main dashboard. At a glance, how is Harry doing TODAY.
- **Life Score** — composite score (0-100) based on: sleep quality, nutrition adherence (2250 cal / 170g protein targets), exercise done, mood, hydration, journal streak
- Score breakdown: each category shows its sub-score with a small radial/ring chart
- **Today's snapshot:** sleep last night, meals logged, workout done, mood, hydration
- **Streaks:** journal streak, exercise streak, logging streak
- **Trends:** 7-day sparklines for sleep, calories, mood
- **Missing today:** clear indicators of what hasn't been logged yet

### 2. Nutrition (/nutrition)
- Daily macro summary: calories, protein, carbs, fat vs targets (2250 cal, 170g protein)
- Meal cards for each logged meal (description, macros breakdown)
- Weekly/monthly trend charts (calories over time, protein adherence)
- Never show breakfast — Harry doesn't eat it. Show lunch, dinner, snacks only.

### 3. Workouts (/workouts)
- This week's workout plan (from current data)
- Workout history — cards per session with exercises, sets, reps, weight
- Exercise PRs table
- Activity type breakdown (lifting vs basketball vs climbing)
- Volume trends over time

### 4. Sleep (/sleep)
- Last night's sleep card (hours, quality, bed/wake times, deep/REM/core breakdown)
- Sleep trends (7/30/90 day charts)
- Correlation cards: sleep vs mood, sleep vs exercise
- Average bedtime / wake time

### 5. Finances (/finances)
THE BIG ONE. Full financial dashboard.
- **Net worth** — big number at top, trend chart over time from net_worth_snapshots
- **Accounts overview** — all financial_accounts, grouped by institution, showing balances
- **Investment portfolio** — all holdings from investment_holdings, grouped by account. Show ticker, shares, current value, gain/loss, allocation %
- **Transactions** — table of financial_transactions with:
  - Date, description/merchant, amount, account, category
  - **If custom_category is null → show a dropdown/chip to let user assign category** (PATCH to Supabase)
  - Filter by: account, category, date range, amount range
  - Search by description/merchant
- **Spending breakdown** — monthly spending by category (pie/bar chart)
- **Cash flow** — income vs expenses monthly

### 6. Tasks (/tasks)
- Port from personalos but connected to Supabase tasks table
- Group by: priority (P1/P2/P3), then by status
- Overdue tasks highlighted in red
- Click to mark complete (PATCH status + completed_at)
- Tags shown as chips
- Filter by status, priority, tags

### 7. Journal & Mood (/journal)
- Calendar view showing which days have journal entries (from daily_logs.journal)
- Click a day → read the journal entry
- Mood trend chart (daily_logs.mood, 1-5 scale)
- Mood vs sleep correlation
- Mood vs exercise correlation
- Energy and stress trends

### 8. Contacts (/contacts)
- Contact cards (from Supabase contacts table if populated, else placeholder)
- Overdue check-ins
- Upcoming birthdays
- Interaction history

## Pages to Port from PersonalOS (keep exact functionality + styling)

### 9. Planner (/planner)
Port PlannerPage.tsx from personalos/packages/web/src/pages/PlannerPage.tsx. Keep the same functionality and styling. Adapt imports to new project structure.

### 10. Calendar (/calendar)
Port CalendarPage.tsx from personalos. Same deal — keep functionality, adapt imports.

## Navigation
- Left sidebar nav (collapsible on mobile)
- Icons + labels for each page
- Active page highlighted
- Dyno 🦕 logo/branding at top of sidebar

## General Rules
1. ALL data fetched from Supabase via @supabase/supabase-js client
2. ALL queries filter by user_id from env var
3. Loading states: skeleton loaders, not spinners
4. Error states: friendly messages, not crashes
5. Responsive: works on mobile (sidebar collapses to bottom nav or hamburger)
6. No authentication needed — this is a personal dashboard, single user
7. Use the MUI theme EXACTLY as specified — this is non-negotiable
8. Charts use Recharts with colors matching the theme
9. Dates: show in US Eastern timezone
10. Currency: USD, formatted with $ and commas

## File Structure
```
src/
  components/
    layout/
      Sidebar.tsx
      Layout.tsx
    common/
      LoadingSkeleton.tsx
      ScoreRing.tsx
      TrendSparkline.tsx
      StatCard.tsx
    nutrition/
    workouts/
    sleep/
    finances/
    tasks/
    journal/
    contacts/
  pages/
    HomePage.tsx
    NutritionPage.tsx
    WorkoutsPage.tsx
    SleepPage.tsx
    FinancesPage.tsx
    TasksPage.tsx
    JournalPage.tsx
    ContactsPage.tsx
    PlannerPage.tsx
    CalendarPage.tsx
  hooks/
    useSupabase.ts (generic query hook)
    useSleep.ts
    useNutrition.ts
    useWorkouts.ts
    useFinances.ts
    useTasks.ts
    useDailyLogs.ts
  lib/
    supabase.ts (client init)
    scores.ts (life score calculation)
    formatters.ts (date, currency, number formatting)
  theme/
    theme.ts
    designSystem.ts
  App.tsx
  main.tsx
```

## What NOT to Build
- No authentication/login
- No AI chat widget (Dyno lives in Telegram)
- No Chrome extension
- No reminders/thoughts/decisions pages
- No settings page (for now)
