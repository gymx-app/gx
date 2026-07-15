ALTER TABLE workout_sessions
  ADD COLUMN IF NOT EXISTS session_type text
  DEFAULT 'workout'
  CHECK (session_type IN ('workout', 'baseline_assessment', 'liss', 'rest'));

COMMENT ON COLUMN workout_sessions.session_type IS
  'Type of session logged. baseline_assessment = Day 0 strength baseline.';
