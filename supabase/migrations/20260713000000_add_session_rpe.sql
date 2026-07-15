ALTER TABLE workout_sessions
  ADD COLUMN IF NOT EXISTS session_rpe int
  CHECK (session_rpe BETWEEN 5 AND 10);

COMMENT ON COLUMN workout_sessions.session_rpe IS
  'Post-workout session-RPE (5-10): 5 = as hard as expected, 10 = toughest possible.';
