-- Add programme_data JSONB column to store full Odin response
ALTER TABLE programmes
  ADD COLUMN IF NOT EXISTS programme_data JSONB;

-- Add 'dumbbells_only' to equipment_type enum (used by onboarding wizard)
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'dumbbells_only';
