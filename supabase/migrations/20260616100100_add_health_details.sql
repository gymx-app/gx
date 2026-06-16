-- Add activity_level to user_profiles
-- height_cm and current_weight_kg already exist

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS activity_level TEXT CHECK (activity_level IN (
    'sedentary', 'lightly_active', 'active', 'very_active'
  ));
