CREATE TABLE IF NOT EXISTS strength_baselines (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  programme_id uuid REFERENCES programmes(id) ON DELETE CASCADE,
  exercise_id text NOT NULL,
  exercise_name text NOT NULL,
  set3_weight_kg numeric NOT NULL,
  set3_reps integer NOT NULL,
  estimated_1rm_kg numeric NOT NULL,
  working_weight_kg numeric NOT NULL,
  goal_type text NOT NULL,
  tested_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strength_baselines_user_exercise
  ON strength_baselines (user_id, exercise_id, tested_at DESC);

ALTER TABLE strength_baselines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own strength baselines" ON strength_baselines;
CREATE POLICY "Users can view own strength baselines"
  ON strength_baselines FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own strength baselines" ON strength_baselines;
CREATE POLICY "Users can insert own strength baselines"
  ON strength_baselines FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own strength baselines" ON strength_baselines;
CREATE POLICY "Users can update own strength baselines"
  ON strength_baselines FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
