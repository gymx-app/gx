-- ═══════════════════════════════════════════════════════════
-- Gx Programme Seed — User #1 (Rohan)
-- Run AFTER health-programme-schema.sql
-- Run against DEV Supabase project only.
-- ═══════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────
-- User profile
-- ───────────────────────────────────────────────────────────
INSERT INTO user_profiles (
  user_id, full_name, age, gender, height_cm,
  current_weight_kg, target_weight_kg,
  dietary_preference, onboarding_completed
) VALUES (
  'd566a631-6ec8-4e78-a67d-c2a08bcb8fd6',
  'Rohan', 31, 'male', 170,
  105, 87, 'eggetarian', true
) ON CONFLICT (user_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  age = EXCLUDED.age,
  gender = EXCLUDED.gender,
  height_cm = EXCLUDED.height_cm,
  current_weight_kg = EXCLUDED.current_weight_kg,
  target_weight_kg = EXCLUDED.target_weight_kg,
  dietary_preference = EXCLUDED.dietary_preference,
  onboarding_completed = EXCLUDED.onboarding_completed;


-- ───────────────────────────────────────────────────────────
-- Programme
-- ───────────────────────────────────────────────────────────
INSERT INTO programmes (
  id, user_id, name, goal_type, goal_description,
  start_weight_kg, target_weight_kg, target_weeks,
  available_days, equipment, created_by_ai, is_active,
  started_at
) VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'd566a631-6ec8-4e78-a67d-c2a08bcb8fd6',
  'Fat Loss Programme 2026',
  'fat_loss',
  'Structured 21-week fat loss programme. Target: 105kg to 87kg. Push/Legs/LISS/Pull+Core/Full Body split. 6 active days per week.',
  105, 87, 21, 6, 'full_gym', false, true,
  '2026-03-13'
) ON CONFLICT (id) DO NOTHING;


-- ───────────────────────────────────────────────────────────
-- 5 Phases
-- ───────────────────────────────────────────────────────────
INSERT INTO programme_phases (
  programme_id, phase_number, name, goal,
  weeks_count, intensity_level, volume_level
) VALUES
(
  'a1b2c3d4-0000-0000-0000-000000000001',
  1, 'Foundation',
  'Establish movement patterns, build work capacity, adapt joints and connective tissue to training load.',
  4, 5, 5
),
(
  'a1b2c3d4-0000-0000-0000-000000000001',
  2, 'Progressive Overload',
  'Increase training load systematically. Build strength base. Establish progressive overload on all primary movements.',
  4, 6, 7
),
(
  'a1b2c3d4-0000-0000-0000-000000000001',
  3, 'Peak Intensity',
  'Maximum training volume and intensity. Highest caloric expenditure. Push strength and endurance to peak levels before deload.',
  5, 9, 9
),
(
  'a1b2c3d4-0000-0000-0000-000000000001',
  4, 'Deload',
  'Reduce volume by 40%, maintain intensity. Allow full recovery from peak phase. Consolidate strength gains.',
  4, 4, 3
),
(
  'a1b2c3d4-0000-0000-0000-000000000001',
  5, 'Maintenance',
  'Sustain fat loss results. Long-term consistency. Maintain strength and body composition indefinitely.',
  999, 6, 5
)
ON CONFLICT (programme_id, phase_number) DO NOTHING;


-- ───────────────────────────────────────────────────────────
-- Programme days for all 5 phases
-- ───────────────────────────────────────────────────────────
DO $$
DECLARE
  v_phase_id UUID;
  v_phase_num INTEGER;
BEGIN
  FOR v_phase_num IN 1..5 LOOP
    SELECT id INTO v_phase_id
    FROM programme_phases
    WHERE programme_id = 'a1b2c3d4-0000-0000-0000-000000000001'
      AND phase_number = v_phase_num;

    IF v_phase_id IS NULL THEN
      RAISE NOTICE 'Phase % not found, skipping', v_phase_num;
      CONTINUE;
    END IF;

    INSERT INTO programme_days (
      phase_id, day_of_week, workout_type, title,
      subtitle, duration_min, kcal_range, tags, has_warmup
    ) VALUES
    (v_phase_id, 'MON', 'workout', 'PUSH DAY',
      'DB Press · Machine · Triceps',
      75, '700–780', ARRAY['push'], true),
    (v_phase_id, 'TUE', 'workout', 'LEG DAY',
      'KB · DB · Machine',
      80, '750–850', ARRAY['legs'], true),
    (v_phase_id, 'WED', 'liss', 'LISS + RECOVERY',
      'Active Recovery · Fat Burn Zone',
      45, '400–500', ARRAY['liss'], false),
    (v_phase_id, 'THU', 'workout', 'PULL + CORE',
      'DB Row · KB · Cable · Battle Ropes',
      80, '650–730', ARRAY['pull','core'], true),
    (v_phase_id, 'FRI', 'workout', 'FULL BODY',
      'Push · Pull · Legs',
      75, '700–800', ARRAY['push','pull','legs'], true),
    (v_phase_id, 'SAT', 'liss', 'LISS + RECOVERY',
      'Active Recovery · Fat Burn Zone',
      45, '400–500', ARRAY['liss'], false),
    (v_phase_id, 'SUN', 'rest', 'REST DAY',
      NULL, NULL, NULL, ARRAY['rest'], false)
    ON CONFLICT (phase_id, day_of_week) DO NOTHING;
  END LOOP;
END $$;


-- ───────────────────────────────────────────────────────────
-- Warmup items (programme-level)
-- ───────────────────────────────────────────────────────────
INSERT INTO warmup_items (
  programme_id, display_order, item_key,
  label, detail, icon
) VALUES
(
  'a1b2c3d4-0000-0000-0000-000000000001',
  1, 'wrist_rot', 'Wrist rotations',
  '18 reps each side — 9 CW + 9 CCW', '🤲'
),
(
  'a1b2c3d4-0000-0000-0000-000000000001',
  2, 'finger_rot', 'Finger rotations',
  '18 reps each side — spread, close, rotate', '✋'
),
(
  'a1b2c3d4-0000-0000-0000-000000000001',
  3, 'elbow_rot', 'Elbow rotations',
  '18 reps each side — 9 each direction', '💪'
),
(
  'a1b2c3d4-0000-0000-0000-000000000001',
  4, 'shoulder_rot', 'Shoulder rotations',
  '18 reps each side — 9 fwd + 9 back', '🔄'
),
(
  'a1b2c3d4-0000-0000-0000-000000000001',
  5, 'neck_rot', 'Neck rotations',
  '9 reps each direction — slow and controlled', '🧠'
),
(
  'a1b2c3d4-0000-0000-0000-000000000001',
  6, 'hip_circle', 'Hip circles',
  '9 reps each direction', '⭕'
),
(
  'a1b2c3d4-0000-0000-0000-000000000001',
  7, 'knee_circle', 'Knee circles',
  '9 reps each direction', '🦵'
),
(
  'a1b2c3d4-0000-0000-0000-000000000001',
  8, 'bw_squat', 'Bodyweight squats',
  '15 reps — full depth, controlled descent', '🏋️'
),
(
  'a1b2c3d4-0000-0000-0000-000000000001',
  9, 'treadmill_walk', 'Treadmill walk',
  '3 min easy walk to elevate heart rate', '🚶'
)
ON CONFLICT (programme_id, item_key) DO NOTHING;


-- ───────────────────────────────────────────────────────────
-- Link programme_config to programme
-- ───────────────────────────────────────────────────────────
UPDATE programme_config
SET programme_id = 'a1b2c3d4-0000-0000-0000-000000000001'
WHERE user_id = 'd566a631-6ec8-4e78-a67d-c2a08bcb8fd6';
