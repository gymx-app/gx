-- ============================================================
-- Gx Seed Data
-- ============================================================

-- ============================================================
-- Global exercise library (22 exercises)
-- ============================================================
insert into exercises (name, equipment, gif_url, is_global, created_by) values
  ('KB Goblet Squat',      '{kb}',         'https://static.exercisedb.dev/media/ZA8b5hc.gif', true, null),
  ('KB Romanian Deadlift',  '{kb}',         'https://static.exercisedb.dev/media/rR0LJzx.gif', true, null),
  ('KB Renegade Row',       '{kb}',         'https://static.exercisedb.dev/media/b9kqlBy.gif', true, null),
  ('DB Single-Arm Row',     '{db}',         'https://static.exercisedb.dev/media/fUBheHs.gif', true, null),
  ('Cable Face Pulls',      '{cable}',      'https://static.exercisedb.dev/media/hvV79Si.gif', true, null),
  ('Dead Bug',              '{bw}',         'https://static.exercisedb.dev/media/iny3m5y.gif', true, null),
  ('KB Russian Twist',      '{kb}',         'https://static.exercisedb.dev/media/fZFZ704.gif', true, null),
  ('DB Thrusters',          '{db}',         'https://static.exercisedb.dev/media/yWxMvB5.gif', true, null),
  ('KB Swings',             '{kb}',         'https://static.exercisedb.dev/media/UHJlbu3.gif', true, null),
  ('Plank',                 '{bw}',         'https://static.exercisedb.dev/media/VO2qeJg.gif', true, null),
  ('DB Lateral Raises',     '{db}',         'https://static.exercisedb.dev/media/DsgkuIt.gif', true, null),
  ('Pec Fly',               '{mach}',       'https://static.exercisedb.dev/media/w4dLzSx.gif', true, null),
  ('DB Walking Lunges',     '{db}',         'https://static.exercisedb.dev/media/IZVHb27.gif', true, null),
  ('DB Shoulder Press',     '{db}',         'https://static.exercisedb.dev/media/znQUdHY.gif', true, null),
  ('Cable Row',             '{cable}',      'https://static.exercisedb.dev/media/fUBheHs.gif', true, null),
  ('DB Chest Press',        '{db}',         'https://static.exercisedb.dev/media/SpYC0Kp.gif', true, null),
  ('KB Hammer Curl',        '{kb}',         'https://static.exercisedb.dev/media/slDvUAU.gif', true, null),
  ('Leg Extension',         '{mach}',       'https://static.exercisedb.dev/media/my33uHU.gif', true, null),
  ('Leg Curl',              '{mach}',       'https://static.exercisedb.dev/media/Zg3XY7P.gif', true, null),
  ('Seated Calf Raise',     '{mach}',       'https://static.exercisedb.dev/media/bOOdeyc.gif', true, null),
  ('Machine Chest Press',   '{mach}',       'https://static.exercisedb.dev/media/DOoWcnA.gif', true, null),
  ('Machine Incline Press', '{mach}',       'https://static.exercisedb.dev/media/jHAnWmT.gif', true, null)
on conflict (name) where is_global = true do nothing;

-- ============================================================
-- Programme config is NOT seeded here.
-- The on_auth_user_created trigger in gx-schema.sql auto-creates
-- a programme_config row with defaults when a user signs up.
--
-- After signup, update your start date if needed:
--   update programme_config
--   set start_date = '2026-03-13', updated_at = now()
--   where user_id = auth.uid();
-- ============================================================
