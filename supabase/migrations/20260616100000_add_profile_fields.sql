-- Add first_name, last_name, date_of_birth, phone_number to user_profiles
-- Keeps existing full_name/age columns for backward compat

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS phone_number TEXT;
