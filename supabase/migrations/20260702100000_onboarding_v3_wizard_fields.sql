-- Onboarding v3: 10-screen wizard fields on user_health.
-- Goal precision (Screen 6) and baseline strength (Screen 8) are now
-- persisted at onboarding time instead of being handed to
-- GenerateProgrammeView via sessionStorage.
ALTER TABLE user_health
  ADD COLUMN IF NOT EXISTS body_fat_pct numeric(4,1),
  ADD COLUMN IF NOT EXISTS target_weight_kg numeric(5,2),
  ADD COLUMN IF NOT EXISTS target_body_fat_pct numeric(4,1),
  ADD COLUMN IF NOT EXISTS target_timeframe_weeks integer,
  ADD COLUMN IF NOT EXISTS goal_sub_fields jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS baseline_path text,
  ADD COLUMN IF NOT EXISTS known_lifts jsonb DEFAULT '[]';
