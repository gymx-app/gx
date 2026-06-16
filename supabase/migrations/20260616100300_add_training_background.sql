ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS training_experience TEXT CHECK (training_experience IN (
    'never', 'less_than_6_months', '6_months_to_2_years', '2_plus_years'
  )),
  ADD COLUMN IF NOT EXISTS fitness_level TEXT CHECK (fitness_level IN (
    'beginner', 'intermediate', 'advanced'
  )),
  ADD COLUMN IF NOT EXISTS primary_activity TEXT,
  ADD COLUMN IF NOT EXISTS occupation_type TEXT CHECK (occupation_type IN (
    'desk_job', 'light_physical', 'heavy_physical'
  )),
  ADD COLUMN IF NOT EXISTS medical_conditions TEXT;
