-- Onboarding v2: nationality on user_profiles; body/lifestyle/medical/injury
-- fields on user_health, matching the 3-step onboarding wizard rebuild.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS nationality text;

ALTER TABLE user_health
  ADD COLUMN IF NOT EXISTS height_cm numeric(5,2),
  ADD COLUMN IF NOT EXISTS current_weight_kg numeric(5,2),
  ADD COLUMN IF NOT EXISTS lifestyle text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS occupation text,
  ADD COLUMN IF NOT EXISTS medical_conditions text[] DEFAULT '{}',
  -- Structured injuries [{area, modification, notes}], replacing the bare
  -- area-name text[] `injuries` column for the new wizard's modify/avoid flow.
  -- `injuries` is left in place — GenerateProgrammeView/Program.tsx still read it.
  ADD COLUMN IF NOT EXISTS injuries_v2 jsonb DEFAULT '[]';
