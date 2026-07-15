-- Add visceral_fat_area (cm²) to inbody_logs — the direct area measurement InBody
-- devices (e.g. 770) report alongside visceral_fat_level. Odin's inbody schema
-- requires this cm² value; visceral_fat_level (a unitless 1-20 index) cannot be
-- converted to it, so it must be captured separately.
ALTER TABLE inbody_logs
  ADD COLUMN IF NOT EXISTS visceral_fat_area numeric(6,2);
