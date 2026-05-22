-- Add CRUD policies for every table with a user_id column that's missing policies.
-- Pattern: signed-in user can do anything with rows where user_id = auth.uid().

DROP POLICY IF EXISTS "activities_owner_all" ON activities;
CREATE POLICY "activities_owner_all" ON activities
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "cash_flow_summaries_owner_all" ON cash_flow_summaries;
CREATE POLICY "cash_flow_summaries_owner_all" ON cash_flow_summaries
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "contact_interactions_owner_all" ON contact_interactions;
CREATE POLICY "contact_interactions_owner_all" ON contact_interactions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "contacts_owner_all" ON contacts;
CREATE POLICY "contacts_owner_all" ON contacts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "daily_logs_owner_all" ON daily_logs;
CREATE POLICY "daily_logs_owner_all" ON daily_logs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "drinks_owner_all" ON drinks;
CREATE POLICY "drinks_owner_all" ON drinks
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "financial_accounts_owner_all" ON financial_accounts;
CREATE POLICY "financial_accounts_owner_all" ON financial_accounts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "financial_sync_owner_all" ON financial_sync;
CREATE POLICY "financial_sync_owner_all" ON financial_sync
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "financial_transactions_owner_all" ON financial_transactions;
CREATE POLICY "financial_transactions_owner_all" ON financial_transactions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "golf_rounds_owner_all" ON golf_rounds;
CREATE POLICY "golf_rounds_owner_all" ON golf_rounds
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "health_sync_owner_all" ON health_sync;
CREATE POLICY "health_sync_owner_all" ON health_sync
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "investment_holdings_owner_all" ON investment_holdings;
CREATE POLICY "investment_holdings_owner_all" ON investment_holdings
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "meals_owner_all" ON meals;
CREATE POLICY "meals_owner_all" ON meals
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "net_worth_snapshots_owner_all" ON net_worth_snapshots;
CREATE POLICY "net_worth_snapshots_owner_all" ON net_worth_snapshots
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notes_owner_all" ON notes;
CREATE POLICY "notes_owner_all" ON notes
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sleep_owner_all" ON sleep;
CREATE POLICY "sleep_owner_all" ON sleep
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tasks_owner_all" ON tasks;
CREATE POLICY "tasks_owner_all" ON tasks
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "workout_templates_owner_all" ON workout_templates;
CREATE POLICY "workout_templates_owner_all" ON workout_templates
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "workouts_owner_all" ON workouts;
CREATE POLICY "workouts_owner_all" ON workouts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
