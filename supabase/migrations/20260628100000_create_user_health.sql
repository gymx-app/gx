-- Create user_health table for onboarding step 2 (training preferences)
CREATE TABLE IF NOT EXISTS user_health (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  fitness_level text,
  goal text,
  available_days_per_week integer,
  session_duration_min integer,
  equipment text,
  injuries text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_user_health_user_id ON user_health(user_id);

ALTER TABLE user_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own health data"
  ON user_health FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health data"
  ON user_health FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health data"
  ON user_health FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
