-- Add preferred_workout_time to user_health (onboarding step 2, optional field)
ALTER TABLE user_health
  ADD COLUMN IF NOT EXISTS preferred_workout_time text;
