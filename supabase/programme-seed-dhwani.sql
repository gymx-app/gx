-- ═══════════════════════════════════════════════════════════
-- Gx Programme Seed — Dhwani (16-Week Knee-Sparing Fat Loss)
-- Run AFTER health-programme-schema.sql
-- Run against DEV Supabase project only.
-- ═══════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────
-- User profile (update existing auto-created row)
-- ───────────────────────────────────────────────────────────
UPDATE user_profiles SET
  full_name            = 'Dhwani',
  age                  = 33,
  gender               = 'female',
  current_weight_kg    = 66.1,
  target_weight_kg     = 57,
  onboarding_completed = true
WHERE user_id = '667688a3-54a9-463b-b102-f67acb5da55e';


-- ───────────────────────────────────────────────────────────
-- Global exercises (new entries for this programme)
-- ───────────────────────────────────────────────────────────
INSERT INTO exercises (name, equipment, is_global, created_by) VALUES
  ('Chest-Supported Machine Row',       '{mach}',  true, null),
  ('Dumbbell Romanian Deadlift',        '{db}',    true, null),
  ('Seated Leg Curl',                   '{mach}',  true, null),
  ('Neutral-Grip Machine Shoulder Press','{mach}',  true, null),
  ('Neutral-Grip Lat Pulldown',         '{cable}', true, null),
  ('Neutral-Grip Incline Dumbbell Press','{db}',   true, null),
  ('Seated Cable Row',                  '{cable}', true, null),
  ('Hip Thrust Machine',                '{mach}',  true, null),
  ('Lying Leg Curl',                    '{mach}',  true, null),
  ('Cable Chest Fly',                   '{cable}', true, null),
  ('Cable Face Pull',                   '{cable}', true, null),
  ('Cable Chest Press',                 '{cable}', true, null),
  ('Single-Arm Cable Row',              '{cable}', true, null),
  ('Cable Pull-Through',                '{cable}', true, null),
  ('Seated Hip Abduction',              '{mach}',  true, null),
  ('Machine Shoulder Press',            '{mach}',  true, null),
  ('Straight-Arm Cable Pulldown',       '{cable}', true, null)
ON CONFLICT (name) WHERE is_global = true DO NOTHING;


-- ───────────────────────────────────────────────────────────
-- Programme
-- ───────────────────────────────────────────────────────────
INSERT INTO programmes (
  id, user_id, name, goal_type, goal_description,
  start_weight_kg, target_weight_kg, target_weeks,
  available_days, equipment, created_by_ai, ai_model,
  is_active, started_at
) VALUES (
  'b2c3d4e5-0000-0000-0000-000000000002',
  '667688a3-54a9-463b-b102-f67acb5da55e',
  'Dhwani 16-Week Knee-Sparing Fat-Loss Programme',
  'fat_loss',
  'A 16-week programme designed to reduce body weight from 66.1 kg toward 57 kg while preserving or improving skeletal muscle mass. The programme prioritises resistance training because skeletal muscle mass is relatively low at 20.6 kg, while the elevated visceral fat area of 155.3 cm² makes consistent fat loss important. Three full-body resistance sessions provide each major muscle group with at least two weekly stimulation events, while two low-intensity cardio sessions increase energy expenditure without adding excessive fatigue. Loaded knee-bending exercises such as squats, lunges, leg presses, step-ups and leg extensions are excluded. Training is scheduled for 7:00 PM to 8:00 PM, so sessions avoid high-intensity conditioning that may interfere with recovery or sleep. The target requires an average loss of approximately 0.57 kg per week, which is realistic but should be adjusted according to strength retention, recovery and weekly weight trends.',
  66.1, 57, 16, 5, 'full_gym',
  true, 'claude-opus-4-6', true,
  '2026-06-22'
) ON CONFLICT (id) DO NOTHING;


-- ───────────────────────────────────────────────────────────
-- 3 Phases
-- ───────────────────────────────────────────────────────────
INSERT INTO programme_phases (
  programme_id, phase_number, name, goal,
  weeks_count, intensity_level, volume_level
) VALUES
  ('b2c3d4e5-0000-0000-0000-000000000002', 1,
   'Accumulation — Technique and Work Capacity',
   'Build consistent movement quality, establish recoverable training volume and increase weekly activity without provoking knee symptoms.',
   6, 6, 6),
  ('b2c3d4e5-0000-0000-0000-000000000002', 2,
   'Intensification — Muscle and Strength Retention',
   'Increase training stress through higher RPE, additional working sets and slightly heavier repetition ranges while maintaining knee-safe exercise selection.',
   6, 8, 7),
  ('b2c3d4e5-0000-0000-0000-000000000002', 3,
   'Realisation — Strength Consolidation and Deload',
   'Use higher-intensity, lower-repetition resistance work to consolidate strength, followed by a reduced-volume final week to dissipate fatigue.',
   4, 9, 5)
ON CONFLICT (programme_id, phase_number) DO NOTHING;


-- ───────────────────────────────────────────────────────────
-- Days, exercises, and cooldowns for all 3 phases
-- ───────────────────────────────────────────────────────────
DO $$
DECLARE
  v_prog_id  UUID := 'b2c3d4e5-0000-0000-0000-000000000002';
  v_user_id  UUID := '667688a3-54a9-463b-b102-f67acb5da55e';

  -- Phase IDs
  v_p1 UUID;
  v_p2 UUID;
  v_p3 UUID;

  -- Day IDs (phase 1)
  v_p1_mon UUID;
  v_p1_tue UUID;
  v_p1_wed UUID;
  v_p1_thu UUID;
  v_p1_fri UUID;
  v_p1_sat UUID;
  v_p1_sun UUID;

  -- Day IDs (phase 2)
  v_p2_mon UUID;
  v_p2_tue UUID;
  v_p2_wed UUID;
  v_p2_thu UUID;
  v_p2_fri UUID;
  v_p2_sat UUID;
  v_p2_sun UUID;

  -- Day IDs (phase 3)
  v_p3_mon UUID;
  v_p3_tue UUID;
  v_p3_wed UUID;
  v_p3_thu UUID;
  v_p3_fri UUID;
  v_p3_sat UUID;
  v_p3_sun UUID;

  -- Exercise IDs
  ex_machine_chest_press UUID;
  ex_chest_supported_row UUID;
  ex_db_rdl UUID;
  ex_seated_leg_curl UUID;
  ex_ng_shoulder_press UUID;
  ex_ng_lat_pulldown UUID;
  ex_ng_incline_db_press UUID;
  ex_seated_cable_row UUID;
  ex_hip_thrust UUID;
  ex_lying_leg_curl UUID;
  ex_cable_chest_fly UUID;
  ex_cable_face_pull UUID;
  ex_cable_chest_press UUID;
  ex_single_arm_cable_row UUID;
  ex_cable_pull_through UUID;
  ex_seated_hip_abduction UUID;
  ex_machine_shoulder_press UUID;
  ex_straight_arm_pulldown UUID;

BEGIN
  -- ─── Look up phase IDs ─────────────────────────────────
  SELECT id INTO v_p1 FROM programme_phases WHERE programme_id = v_prog_id AND phase_number = 1;
  SELECT id INTO v_p2 FROM programme_phases WHERE programme_id = v_prog_id AND phase_number = 2;
  SELECT id INTO v_p3 FROM programme_phases WHERE programme_id = v_prog_id AND phase_number = 3;

  -- ─── Look up exercise IDs ──────────────────────────────
  SELECT id INTO ex_machine_chest_press    FROM exercises WHERE name = 'Machine Chest Press'              AND is_global = true;
  SELECT id INTO ex_chest_supported_row    FROM exercises WHERE name = 'Chest-Supported Machine Row'      AND is_global = true;
  SELECT id INTO ex_db_rdl                 FROM exercises WHERE name = 'Dumbbell Romanian Deadlift'       AND is_global = true;
  SELECT id INTO ex_seated_leg_curl        FROM exercises WHERE name = 'Seated Leg Curl'                  AND is_global = true;
  SELECT id INTO ex_ng_shoulder_press      FROM exercises WHERE name = 'Neutral-Grip Machine Shoulder Press' AND is_global = true;
  SELECT id INTO ex_ng_lat_pulldown        FROM exercises WHERE name = 'Neutral-Grip Lat Pulldown'        AND is_global = true;
  SELECT id INTO ex_ng_incline_db_press    FROM exercises WHERE name = 'Neutral-Grip Incline Dumbbell Press' AND is_global = true;
  SELECT id INTO ex_seated_cable_row       FROM exercises WHERE name = 'Seated Cable Row'                 AND is_global = true;
  SELECT id INTO ex_hip_thrust             FROM exercises WHERE name = 'Hip Thrust Machine'               AND is_global = true;
  SELECT id INTO ex_lying_leg_curl         FROM exercises WHERE name = 'Lying Leg Curl'                   AND is_global = true;
  SELECT id INTO ex_cable_chest_fly        FROM exercises WHERE name = 'Cable Chest Fly'                  AND is_global = true;
  SELECT id INTO ex_cable_face_pull        FROM exercises WHERE name = 'Cable Face Pull'                  AND is_global = true;
  SELECT id INTO ex_cable_chest_press      FROM exercises WHERE name = 'Cable Chest Press'                AND is_global = true;
  SELECT id INTO ex_single_arm_cable_row   FROM exercises WHERE name = 'Single-Arm Cable Row'             AND is_global = true;
  SELECT id INTO ex_cable_pull_through     FROM exercises WHERE name = 'Cable Pull-Through'               AND is_global = true;
  SELECT id INTO ex_seated_hip_abduction   FROM exercises WHERE name = 'Seated Hip Abduction'             AND is_global = true;
  SELECT id INTO ex_machine_shoulder_press FROM exercises WHERE name = 'Machine Shoulder Press'            AND is_global = true;
  SELECT id INTO ex_straight_arm_pulldown  FROM exercises WHERE name = 'Straight-Arm Cable Pulldown'      AND is_global = true;

  -- ═══════════════════════════════════════════════════════
  -- PHASE 1 — Accumulation
  -- ═══════════════════════════════════════════════════════

  -- ─── Days ──────────────────────────────────────────────
  INSERT INTO programme_days (phase_id, day_of_week, workout_type, title, subtitle, duration_min, kcal_range, tags, has_warmup)
  VALUES
    (v_p1, 'MON', 'workout', 'Full Body A — Horizontal Strength',
     '7:00 PM session focused on balanced pushing, pulling and posterior-chain development',
     60, '250–375 kcal', ARRAY['full-body','knee-sparing','resistance','evening-training'], true),
    (v_p1, 'TUE', 'liss', 'LISS A — Aerobic Base',
     'Low-impact evening cardio at a conversational effort',
     35, '150–250 kcal', ARRAY['LISS','fat-loss','recovery-friendly','evening-training'], false),
    (v_p1, 'WED', 'workout', 'Full Body B — Incline Push and Hip Extension',
     'Second full-body stimulus with glute, hamstring, chest and back emphasis',
     60, '250–375 kcal', ARRAY['full-body','knee-sparing','resistance','evening-training'], true),
    (v_p1, 'THU', 'liss', 'LISS B — Fat-Oxidation Session',
     'Steady low-intensity cardio with minimal recovery cost',
     35, '150–250 kcal', ARRAY['LISS','fat-loss','recovery-friendly','evening-training'], false),
    (v_p1, 'FRI', 'workout', 'Full Body C — Vertical Pull and Posterior Chain',
     'Third weekly muscle-retention stimulus without loaded knee bending',
     60, '250–375 kcal', ARRAY['full-body','knee-sparing','resistance','evening-training'], true),
    (v_p1, 'SAT', 'rest', 'Rest and Daily Movement',
     'No formal training; prioritise recovery and gentle activity',
     NULL, NULL, ARRAY['rest','recovery'], false),
    (v_p1, 'SUN', 'rest', 'Full Rest',
     'Prepare for the next training week',
     NULL, NULL, ARRAY['rest','recovery'], false)
  ON CONFLICT (phase_id, day_of_week) DO NOTHING;

  SELECT id INTO v_p1_mon FROM programme_days WHERE phase_id = v_p1 AND day_of_week = 'MON';
  SELECT id INTO v_p1_tue FROM programme_days WHERE phase_id = v_p1 AND day_of_week = 'TUE';
  SELECT id INTO v_p1_wed FROM programme_days WHERE phase_id = v_p1 AND day_of_week = 'WED';
  SELECT id INTO v_p1_thu FROM programme_days WHERE phase_id = v_p1 AND day_of_week = 'THU';
  SELECT id INTO v_p1_fri FROM programme_days WHERE phase_id = v_p1 AND day_of_week = 'FRI';
  SELECT id INTO v_p1_sat FROM programme_days WHERE phase_id = v_p1 AND day_of_week = 'SAT';
  SELECT id INTO v_p1_sun FROM programme_days WHERE phase_id = v_p1 AND day_of_week = 'SUN';

  -- ─── P1 MON exercises ─────────────────────────────────
  INSERT INTO programme_exercises (day_id, exercise_id, display_order, sets_reps, rest, notes, warn) VALUES
    (v_p1_mon, ex_machine_chest_press,  1, '3 x 10–12 @ RPE 6–7', '90 sec',
     'Use a controlled two-second lowering phase. Increase load only after completing all sets at 12 repetitions without exceeding RPE 7.', NULL),
    (v_p1_mon, ex_chest_supported_row,  2, '3 x 10–12 @ RPE 6–7', '90 sec',
     'Keep the chest supported and pause briefly when the elbows reach the torso.', NULL),
    (v_p1_mon, ex_db_rdl,              3, '3 x 10–12 @ RPE 6–7', '90 sec',
     'Keep only a soft bend in the knees, push the hips backward and stop before the lower back rounds.',
     'This is a hip-dominant movement. Stop if knee discomfort increases despite minimal knee flexion.'),
    (v_p1_mon, ex_seated_leg_curl,     4, '3 x 10–12 @ RPE 7', '75 sec',
     'Keep the hips against the pad and control the return phase without allowing the weight stack to slam.', NULL),
    (v_p1_mon, ex_ng_shoulder_press,   5, '3 x 10–12 @ RPE 6–7', '90 sec',
     'Use back support and a neutral grip. Stop the range before the shoulders roll forward.', NULL),
    (v_p1_mon, ex_ng_lat_pulldown,     6, '3 x 10–12 @ RPE 6–7', '90 sec',
     'Pull the elbows downward without leaning the torso excessively backward.', NULL)
  ON CONFLICT (day_id, display_order) DO NOTHING;

  -- ─── P1 WED exercises ─────────────────────────────────
  INSERT INTO programme_exercises (day_id, exercise_id, display_order, sets_reps, rest, notes, warn) VALUES
    (v_p1_wed, ex_ng_incline_db_press, 1, '3 x 10–12 @ RPE 6–7', '90 sec',
     'Keep the wrists neutral and use a bench angle of approximately 20–30 degrees.', NULL),
    (v_p1_wed, ex_seated_cable_row,    2, '3 x 10–12 @ RPE 6–7', '90 sec',
     'Maintain an upright torso and avoid using momentum to finish repetitions.', NULL),
    (v_p1_wed, ex_hip_thrust,          3, '3 x 10–12 @ RPE 6–7', '90 sec',
     'Position the feet so the knees remain comfortable. Drive through the heels and finish with the glutes rather than the lower back.',
     'Use only a foot position and range that do not provoke knee pain. Replace with a cable pull-through if symptoms occur.'),
    (v_p1_wed, ex_lying_leg_curl,      4, '3 x 10–12 @ RPE 7', '75 sec',
     'Keep the pelvis pressed into the pad and lower the weight under control.', NULL),
    (v_p1_wed, ex_cable_chest_fly,     5, '3 x 12–15 @ RPE 7', '60 sec',
     'Maintain a slight elbow bend and stop before the shoulders move into an uncomfortable stretched position.', NULL),
    (v_p1_wed, ex_cable_face_pull,     6, '3 x 12–15 @ RPE 7', '60 sec',
     'Pull toward eye level and finish with gentle external rotation without arching the lower back.', NULL)
  ON CONFLICT (day_id, display_order) DO NOTHING;

  -- ─── P1 FRI exercises ─────────────────────────────────
  INSERT INTO programme_exercises (day_id, exercise_id, display_order, sets_reps, rest, notes, warn) VALUES
    (v_p1_fri, ex_cable_chest_press,     1, '3 x 10–12 @ RPE 6–7', '90 sec',
     'Use a staggered stance only if comfortable. A seated cable setup may be used to minimise lower-body involvement.', NULL),
    (v_p1_fri, ex_single_arm_cable_row,  2, '3 x 10–12 per side @ RPE 6–7', '75 sec',
     'Keep the torso square and avoid rotating to complete the repetition.', NULL),
    (v_p1_fri, ex_cable_pull_through,    3, '3 x 10–12 @ RPE 6–7', '90 sec',
     'Use a hip hinge with minimal knee bend and finish by squeezing the glutes without leaning backward.',
     'Stop if the setup or movement produces knee discomfort.'),
    (v_p1_fri, ex_seated_hip_abduction,  4, '3 x 12–15 @ RPE 7', '60 sec',
     'Keep the torso controlled and pause briefly at the widest comfortable position.', NULL),
    (v_p1_fri, ex_machine_shoulder_press,5, '3 x 10–12 @ RPE 6–7', '90 sec',
     'Use back support and avoid locking the elbows aggressively.', NULL),
    (v_p1_fri, ex_straight_arm_pulldown, 6, '3 x 12–15 @ RPE 7', '60 sec',
     'Keep the ribs down and move through the shoulders without turning the exercise into a triceps pressdown.', NULL)
  ON CONFLICT (day_id, display_order) DO NOTHING;

  -- ─── P1 cooldowns ─────────────────────────────────────
  -- MON, WED, FRI (workout days)
  INSERT INTO cooldown_items (day_id, display_order, item_key, label, detail) VALUES
    (v_p1_mon, 1, 'easy_walk',      'Downshift', 'Walk slowly for 3 minutes or remain seated while breathing returns to normal.'),
    (v_p1_mon, 2, 'gentle_mobility', 'Mobility',  'Perform gentle chest, upper-back, hamstring and glute stretches for 20–30 seconds each without forcing range.'),
    (v_p1_wed, 1, 'easy_walk',      'Downshift', 'Walk slowly for 3 minutes or remain seated while breathing returns to normal.'),
    (v_p1_wed, 2, 'gentle_mobility', 'Mobility',  'Perform gentle chest, lat, glute and hamstring stretches for 20–30 seconds each.'),
    (v_p1_fri, 1, 'easy_walk',      'Downshift', 'Walk slowly for 3 minutes or remain seated while breathing returns to normal.'),
    (v_p1_fri, 2, 'gentle_mobility', 'Mobility',  'Perform gentle shoulder, upper-back, glute and hamstring stretches for 20–30 seconds each.')
  ON CONFLICT (day_id, item_key) DO NOTHING;

  -- TUE, THU (LISS days)
  INSERT INTO cooldown_items (day_id, display_order, item_key, label, detail) VALUES
    (v_p1_tue, 1, 'cardio_downshift', 'Downshift', 'Reduce the pace gradually for the final 4 minutes.'),
    (v_p1_tue, 2, 'breathing',        'Breathing', 'Complete 2 minutes of slow nasal breathing before leaving the gym to support evening recovery.'),
    (v_p1_thu, 1, 'cardio_downshift', 'Downshift', 'Reduce the pace gradually for the final 4 minutes.'),
    (v_p1_thu, 2, 'breathing',        'Breathing', 'Complete 2 minutes of slow nasal breathing before leaving the gym.')
  ON CONFLICT (day_id, item_key) DO NOTHING;


  -- ═══════════════════════════════════════════════════════
  -- PHASE 2 — Intensification
  -- ═══════════════════════════════════════════════════════

  INSERT INTO programme_days (phase_id, day_of_week, workout_type, title, subtitle, duration_min, kcal_range, tags, has_warmup)
  VALUES
    (v_p2, 'MON', 'workout', 'Full Body A — Horizontal Strength',
     'Higher training stress through additional sets and increased RPE',
     60, '275–400 kcal', ARRAY['full-body','knee-sparing','intensification','evening-training'], true),
    (v_p2, 'TUE', 'liss', 'LISS A — Aerobic Progression',
     'Longer steady-state cardio without high-intensity interference',
     45, '200–300 kcal', ARRAY['LISS','fat-loss','progressive-cardio','evening-training'], false),
    (v_p2, 'WED', 'workout', 'Full Body B — Incline Push and Hip Extension',
     'Moderate-volume, higher-intensity full-body training',
     60, '275–400 kcal', ARRAY['full-body','knee-sparing','intensification','evening-training'], true),
    (v_p2, 'THU', 'liss', 'LISS B — Fat-Loss Support',
     'Recoverable aerobic work between resistance sessions',
     45, '200–300 kcal', ARRAY['LISS','fat-loss','progressive-cardio','evening-training'], false),
    (v_p2, 'FRI', 'workout', 'Full Body C — Vertical Pull and Posterior Chain',
     'Higher-load muscle-retention work before the weekend recovery period',
     60, '275–400 kcal', ARRAY['full-body','knee-sparing','intensification','evening-training'], true),
    (v_p2, 'SAT', 'rest', 'Rest and Gentle Activity',
     'Recover from the intensification block',
     NULL, NULL, ARRAY['rest','recovery'], false),
    (v_p2, 'SUN', 'rest', 'Full Rest',
     'Prioritise sleep and readiness for the next week',
     NULL, NULL, ARRAY['rest','recovery'], false)
  ON CONFLICT (phase_id, day_of_week) DO NOTHING;

  SELECT id INTO v_p2_mon FROM programme_days WHERE phase_id = v_p2 AND day_of_week = 'MON';
  SELECT id INTO v_p2_tue FROM programme_days WHERE phase_id = v_p2 AND day_of_week = 'TUE';
  SELECT id INTO v_p2_wed FROM programme_days WHERE phase_id = v_p2 AND day_of_week = 'WED';
  SELECT id INTO v_p2_thu FROM programme_days WHERE phase_id = v_p2 AND day_of_week = 'THU';
  SELECT id INTO v_p2_fri FROM programme_days WHERE phase_id = v_p2 AND day_of_week = 'FRI';

  -- ─── P2 MON exercises ─────────────────────────────────
  INSERT INTO programme_exercises (day_id, exercise_id, display_order, sets_reps, rest, notes, warn) VALUES
    (v_p2_mon, ex_machine_chest_press,  1, '4 x 8–10 @ RPE 7–8', '105 sec',
     'Increase load when all four sets reach 10 repetitions at or below RPE 8.', NULL),
    (v_p2_mon, ex_chest_supported_row,  2, '4 x 8–10 @ RPE 7–8', '105 sec',
     'Pause briefly at peak contraction and maintain full range throughout all sets.', NULL),
    (v_p2_mon, ex_db_rdl,              3, '4 x 8–10 @ RPE 7–8', '105 sec',
     'Use a controlled hip hinge and stop before spinal position changes.',
     'Maintain minimal knee flexion and discontinue if knee symptoms increase.'),
    (v_p2_mon, ex_seated_leg_curl,     4, '4 x 8–10 @ RPE 8', '90 sec',
     'Keep the hips anchored and control the eccentric phase for approximately two seconds.', NULL),
    (v_p2_mon, ex_ng_shoulder_press,   5, '3 x 8–10 @ RPE 7–8', '90 sec',
     'Maintain back support and stop before reaching a grinding repetition.', NULL),
    (v_p2_mon, ex_ng_lat_pulldown,     6, '3 x 8–10 @ RPE 7–8', '90 sec',
     'Keep the torso stable and pull the elbows toward the sides of the ribs.', NULL)
  ON CONFLICT (day_id, display_order) DO NOTHING;

  -- ─── P2 WED exercises ─────────────────────────────────
  INSERT INTO programme_exercises (day_id, exercise_id, display_order, sets_reps, rest, notes, warn) VALUES
    (v_p2_wed, ex_ng_incline_db_press, 1, '4 x 8–10 @ RPE 7–8', '105 sec',
     'Increase load only after all sets reach 10 technically consistent repetitions.', NULL),
    (v_p2_wed, ex_seated_cable_row,    2, '4 x 8–10 @ RPE 7–8', '105 sec',
     'Keep the torso upright and avoid shortening the final repetitions.', NULL),
    (v_p2_wed, ex_hip_thrust,          3, '4 x 8–10 @ RPE 7–8', '105 sec',
     'Use the same pain-free foot position established in Phase 1.',
     'Replace with a cable pull-through immediately if knee symptoms occur.'),
    (v_p2_wed, ex_lying_leg_curl,      4, '4 x 8–10 @ RPE 8', '90 sec',
     'Maintain pelvic contact with the pad and avoid lifting the hips.', NULL),
    (v_p2_wed, ex_cable_chest_fly,     5, '3 x 10–12 @ RPE 8', '75 sec',
     'Control the stretched position and stop before shoulder mechanics change.', NULL),
    (v_p2_wed, ex_cable_face_pull,     6, '3 x 10–12 @ RPE 8', '75 sec',
     'Keep the ribs stacked and finish with controlled external rotation.', NULL)
  ON CONFLICT (day_id, display_order) DO NOTHING;

  -- ─── P2 FRI exercises ─────────────────────────────────
  INSERT INTO programme_exercises (day_id, exercise_id, display_order, sets_reps, rest, notes, warn) VALUES
    (v_p2_fri, ex_cable_chest_press,     1, '4 x 8–10 @ RPE 7–8', '105 sec',
     'Use a seated setup if standing creates unnecessary lower-body fatigue.', NULL),
    (v_p2_fri, ex_single_arm_cable_row,  2, '4 x 8–10 per side @ RPE 7–8', '90 sec',
     'Keep the torso square and complete both sides with the same load and repetitions.', NULL),
    (v_p2_fri, ex_cable_pull_through,    3, '4 x 8–10 @ RPE 7–8', '105 sec',
     'Maintain a hip-dominant movement with minimal knee bend.',
     'Stop if knee symptoms appear during setup or execution.'),
    (v_p2_fri, ex_seated_hip_abduction,  4, '4 x 10–12 @ RPE 8', '75 sec',
     'Pause for one second at peak abduction and return slowly.', NULL),
    (v_p2_fri, ex_machine_shoulder_press,5, '3 x 8–10 @ RPE 7–8', '90 sec',
     'Keep the back supported and avoid forceful elbow lockout.', NULL),
    (v_p2_fri, ex_straight_arm_pulldown, 6, '3 x 10–12 @ RPE 8', '75 sec',
     'Keep the elbows softly bent and avoid using torso momentum.', NULL)
  ON CONFLICT (day_id, display_order) DO NOTHING;

  -- ─── P2 cooldowns ─────────────────────────────────────
  INSERT INTO cooldown_items (day_id, display_order, item_key, label, detail) VALUES
    (v_p2_mon, 1, 'easy_walk',      'Downshift', 'Walk slowly for 3 minutes or remain seated while breathing returns to normal.'),
    (v_p2_mon, 2, 'gentle_mobility', 'Mobility',  'Perform gentle chest, upper-back, hamstring and glute stretches for 20–30 seconds each.'),
    (v_p2_wed, 1, 'easy_walk',      'Downshift', 'Walk slowly for 3 minutes or remain seated while breathing returns to normal.'),
    (v_p2_wed, 2, 'gentle_mobility', 'Mobility',  'Perform gentle chest, lat, glute and hamstring stretches for 20–30 seconds each.'),
    (v_p2_fri, 1, 'easy_walk',      'Downshift', 'Walk slowly for 3 minutes or remain seated while breathing returns to normal.'),
    (v_p2_fri, 2, 'gentle_mobility', 'Mobility',  'Perform gentle shoulder, back, glute and hamstring stretches for 20–30 seconds each.'),
    (v_p2_tue, 1, 'cardio_downshift', 'Downshift', 'Reduce the pace gradually for the final 5 minutes.'),
    (v_p2_tue, 2, 'breathing',        'Breathing', 'Complete 2 minutes of slow breathing to transition out of the evening session.'),
    (v_p2_thu, 1, 'cardio_downshift', 'Downshift', 'Reduce the pace gradually for the final 5 minutes.'),
    (v_p2_thu, 2, 'breathing',        'Breathing', 'Complete 2 minutes of slow breathing before leaving the gym.')
  ON CONFLICT (day_id, item_key) DO NOTHING;


  -- ═══════════════════════════════════════════════════════
  -- PHASE 3 — Realisation
  -- ═══════════════════════════════════════════════════════

  INSERT INTO programme_days (phase_id, day_of_week, workout_type, title, subtitle, duration_min, kcal_range, tags, has_warmup)
  VALUES
    (v_p3, 'MON', 'workout', 'Full Body A — Strength Consolidation',
     'Higher-intensity work with reduced total volume',
     55, '250–375 kcal', ARRAY['full-body','knee-sparing','realisation','evening-training'], true),
    (v_p3, 'TUE', 'liss', 'LISS A — Peak Aerobic Volume',
     'Highest steady-state duration while keeping intensity controlled',
     50, '225–325 kcal', ARRAY['LISS','fat-loss','realisation','evening-training'], false),
    (v_p3, 'WED', 'workout', 'Full Body B — Strength Consolidation',
     'Maintain muscle-retention intensity with controlled fatigue',
     55, '250–375 kcal', ARRAY['full-body','knee-sparing','realisation','evening-training'], true),
    (v_p3, 'THU', 'liss', 'LISS B — Peak Fat-Loss Support',
     'Final weekly aerobic session at a recovery-compatible intensity',
     50, '225–325 kcal', ARRAY['LISS','fat-loss','realisation','evening-training'], false),
    (v_p3, 'FRI', 'workout', 'Full Body C — Final Strength Stimulus',
     'Posterior-chain and upper-body strength before weekend recovery',
     55, '250–375 kcal', ARRAY['full-body','knee-sparing','realisation','evening-training'], true),
    (v_p3, 'SAT', 'rest', 'Rest and Recovery',
     'Allow accumulated fatigue to dissipate',
     NULL, NULL, ARRAY['rest','recovery','deload-support'], false),
    (v_p3, 'SUN', 'rest', 'Full Rest',
     'Complete the week recovered rather than exhausted',
     NULL, NULL, ARRAY['rest','recovery','deload-support'], false)
  ON CONFLICT (phase_id, day_of_week) DO NOTHING;

  SELECT id INTO v_p3_mon FROM programme_days WHERE phase_id = v_p3 AND day_of_week = 'MON';
  SELECT id INTO v_p3_tue FROM programme_days WHERE phase_id = v_p3 AND day_of_week = 'TUE';
  SELECT id INTO v_p3_wed FROM programme_days WHERE phase_id = v_p3 AND day_of_week = 'WED';
  SELECT id INTO v_p3_thu FROM programme_days WHERE phase_id = v_p3 AND day_of_week = 'THU';
  SELECT id INTO v_p3_fri FROM programme_days WHERE phase_id = v_p3 AND day_of_week = 'FRI';

  -- ─── P3 MON exercises ─────────────────────────────────
  INSERT INTO programme_exercises (day_id, exercise_id, display_order, sets_reps, rest, notes, warn) VALUES
    (v_p3_mon, ex_machine_chest_press,  1, '3 x 6–8 @ RPE 8–8.5', '120 sec',
     'Maintain technically clean repetitions and stop before reaching failure. During the final deload week, perform 2 sets at RPE 6–7.', NULL),
    (v_p3_mon, ex_chest_supported_row,  2, '3 x 6–8 @ RPE 8–8.5', '120 sec',
     'Retain full range and reduce load if the chest leaves the support. During the final deload week, perform 2 sets at RPE 6–7.', NULL),
    (v_p3_mon, ex_db_rdl,              3, '3 x 6–8 @ RPE 8', '120 sec',
     'Keep a controlled hip hinge and stop before spinal position changes. During the final deload week, perform 2 sets at RPE 6–7.',
     'Keep knee flexion minimal and discontinue if knee symptoms increase.'),
    (v_p3_mon, ex_seated_leg_curl,     4, '3 x 8–10 @ RPE 8', '90 sec',
     'Control the lowering phase. During the final deload week, perform 2 sets at RPE 6–7.', NULL),
    (v_p3_mon, ex_ng_shoulder_press,   5, '3 x 6–8 @ RPE 8', '105 sec',
     'Use back support and avoid grinding repetitions. Perform 2 easier sets during the deload week.', NULL),
    (v_p3_mon, ex_ng_lat_pulldown,     6, '3 x 6–8 @ RPE 8', '105 sec',
     'Keep the torso stable and stop before momentum is required. Perform 2 easier sets during the deload week.', NULL)
  ON CONFLICT (day_id, display_order) DO NOTHING;

  -- ─── P3 WED exercises ─────────────────────────────────
  INSERT INTO programme_exercises (day_id, exercise_id, display_order, sets_reps, rest, notes, warn) VALUES
    (v_p3_wed, ex_ng_incline_db_press, 1, '3 x 6–8 @ RPE 8–8.5', '120 sec',
     'Stop before failure and maintain a consistent pressing path. During the deload week, perform 2 sets at RPE 6–7.', NULL),
    (v_p3_wed, ex_seated_cable_row,    2, '3 x 6–8 @ RPE 8–8.5', '120 sec',
     'Keep the torso upright and preserve full range. During the deload week, perform 2 sets at RPE 6–7.', NULL),
    (v_p3_wed, ex_hip_thrust,          3, '3 x 6–8 @ RPE 8', '120 sec',
     'Use the established pain-free setup. Perform 2 easier sets during the final deload week.',
     'Replace immediately with a cable pull-through if knee symptoms occur.'),
    (v_p3_wed, ex_lying_leg_curl,      4, '3 x 8–10 @ RPE 8', '90 sec',
     'Maintain pelvic contact with the pad. Perform 2 easier sets during the deload week.', NULL),
    (v_p3_wed, ex_cable_chest_fly,     5, '2 x 10–12 @ RPE 8', '75 sec',
     'Use a controlled range and perform only 1 easy set during the deload week.', NULL),
    (v_p3_wed, ex_cable_face_pull,     6, '2 x 10–12 @ RPE 8', '75 sec',
     'Maintain controlled scapular movement and perform only 1 easy set during the deload week.', NULL)
  ON CONFLICT (day_id, display_order) DO NOTHING;

  -- ─── P3 FRI exercises ─────────────────────────────────
  INSERT INTO programme_exercises (day_id, exercise_id, display_order, sets_reps, rest, notes, warn) VALUES
    (v_p3_fri, ex_cable_chest_press,     1, '3 x 6–8 @ RPE 8–8.5', '120 sec',
     'Use a seated setup when preferred. During the final deload week, perform 2 sets at RPE 6–7.', NULL),
    (v_p3_fri, ex_single_arm_cable_row,  2, '3 x 6–8 per side @ RPE 8–8.5', '105 sec',
     'Keep the torso square and match both sides. During the deload week, perform 2 sets at RPE 6–7.', NULL),
    (v_p3_fri, ex_cable_pull_through,    3, '3 x 6–8 @ RPE 8', '120 sec',
     'Maintain a hip hinge with minimal knee bend. Perform 2 easier sets during the deload week.',
     'Discontinue if knee symptoms appear.'),
    (v_p3_fri, ex_seated_hip_abduction,  4, '3 x 8–10 @ RPE 8', '90 sec',
     'Pause briefly at peak contraction. Perform 2 easier sets during the deload week.', NULL),
    (v_p3_fri, ex_machine_shoulder_press,5, '3 x 6–8 @ RPE 8', '105 sec',
     'Maintain back support and stop before failure. Perform 2 easier sets during the deload week.', NULL),
    (v_p3_fri, ex_straight_arm_pulldown, 6, '3 x 8–10 @ RPE 8', '90 sec',
     'Keep the torso stable and avoid swinging. Perform 2 easier sets during the deload week.', NULL)
  ON CONFLICT (day_id, display_order) DO NOTHING;

  -- ─── P3 cooldowns ─────────────────────────────────────
  INSERT INTO cooldown_items (day_id, display_order, item_key, label, detail) VALUES
    (v_p3_mon, 1, 'easy_walk',      'Downshift', 'Walk slowly for 3 minutes or remain seated until breathing returns to normal.'),
    (v_p3_mon, 2, 'gentle_mobility', 'Mobility',  'Perform gentle chest, upper-back, hamstring and glute stretches for 20–30 seconds each.'),
    (v_p3_wed, 1, 'easy_walk',      'Downshift', 'Walk slowly for 3 minutes or remain seated until breathing returns to normal.'),
    (v_p3_wed, 2, 'gentle_mobility', 'Mobility',  'Perform gentle chest, lat, glute and hamstring stretches for 20–30 seconds each.'),
    (v_p3_fri, 1, 'easy_walk',      'Downshift', 'Walk slowly for 3 minutes or remain seated until breathing returns to normal.'),
    (v_p3_fri, 2, 'gentle_mobility', 'Mobility',  'Perform gentle shoulder, back, glute and hamstring stretches for 20–30 seconds each.'),
    (v_p3_tue, 1, 'cardio_downshift', 'Downshift', 'Reduce the pace gradually for the final 5 minutes.'),
    (v_p3_tue, 2, 'breathing',        'Breathing', 'Complete 2–3 minutes of slow breathing to support evening recovery.'),
    (v_p3_thu, 1, 'cardio_downshift', 'Downshift', 'Reduce the pace gradually for the final 5 minutes.'),
    (v_p3_thu, 2, 'breathing',        'Breathing', 'Complete 2–3 minutes of slow breathing before leaving the gym.')
  ON CONFLICT (day_id, item_key) DO NOTHING;

END $$;


-- ───────────────────────────────────────────────────────────
-- Warmup items (programme-level)
-- ───────────────────────────────────────────────────────────
INSERT INTO warmup_items (
  programme_id, display_order, item_key, label, detail
) VALUES
  ('b2c3d4e5-0000-0000-0000-000000000002', 1, 'general_raise',
   'General Warm-Up',
   'Perform 4–5 minutes of easy flat treadmill walking at a comfortable stride. Use an upper-body ergometer instead if normal walking increases knee symptoms.'),
  ('b2c3d4e5-0000-0000-0000-000000000002', 2, 'movement_prep',
   'Movement Preparation',
   'Complete 8 controlled hip hinges, 10 band pull-aparts, 8 thoracic rotations per side and 10 bodyweight glute bridges. Avoid squats, lunges and deep knee flexion.'),
  ('b2c3d4e5-0000-0000-0000-000000000002', 3, 'ramp_sets',
   'Exercise Ramp-Up',
   'Perform 2–3 progressively heavier warm-up sets for the first upper-body exercise and first hip-hinge exercise. Warm-up sets do not count as working sets.')
ON CONFLICT (programme_id, item_key) DO NOTHING;


-- ───────────────────────────────────────────────────────────
-- Programme config
-- ───────────────────────────────────────────────────────────
UPDATE programme_config SET
  programme_id   = 'b2c3d4e5-0000-0000-0000-000000000002',
  start_date     = '2026-06-22',
  phase_weeks    = '{6,6,4}',
  min_active_days = 5,
  updated_at     = now()
WHERE user_id = '667688a3-54a9-463b-b102-f67acb5da55e';
