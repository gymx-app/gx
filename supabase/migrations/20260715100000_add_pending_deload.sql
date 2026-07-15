ALTER TABLE programmes
  ADD COLUMN IF NOT EXISTS pending_deload jsonb;

COMMENT ON COLUMN programmes.pending_deload IS
  'Last readiness-check result when deload_recommended was true: { reasons, adjustments, checked_at }. Cleared once applied to the upcoming week.';
