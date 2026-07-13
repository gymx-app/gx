-- ═══════════════════════════════════════════════════════════
-- Gx Health & Programme Schema
-- Run against DEV Supabase project only.
-- Depends on: gx-schema.sql (exercises, programme_config)
-- ═══════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════
-- ENUMS
-- ═══════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE gender_type AS ENUM (
    'male', 'female', 'other', 'prefer_not_to_say'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE dietary_preference AS ENUM (
    'vegetarian', 'eggetarian', 'non_vegetarian',
    'vegan', 'pescatarian', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE fitness_level AS ENUM (
    'beginner', 'intermediate', 'advanced'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE goal_type AS ENUM (
    'fat_loss', 'muscle_gain', 'body_recomposition',
    'strength', 'endurance', 'maintenance',
    'general_fitness'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE equipment_type AS ENUM (
    'full_gym', 'home_gym', 'minimal', 'bodyweight_only'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE injury_status AS ENUM (
    'current', 'recovering', 'history'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE injury_body_part AS ENUM (
    'knees', 'wrists', 'lower_back', 'upper_back',
    'shoulders', 'hips', 'ankles', 'neck',
    'elbows', 'hamstrings', 'quads', 'calves'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE chronic_condition_type AS ENUM (
    'hypertension', 'type2_diabetes', 'hypothyroidism',
    'pcos', 'asthma', 'osteoarthritis', 'osteoporosis',
    'heart_condition', 'chronic_lower_back_pain',
    'obesity', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE condition_severity AS ENUM (
    'mild', 'moderate', 'severe'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE workout_type AS ENUM (
    'workout', 'liss', 'hiit', 'rest', 'mobility'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE day_of_week AS ENUM (
    'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════
-- USER PROFILES
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE
    REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Personal
  full_name TEXT,
  age INTEGER CHECK (age BETWEEN 13 AND 100),
  gender gender_type,
  height_cm NUMERIC(5,1) CHECK (height_cm BETWEEN 100 AND 250),

  -- Weight
  current_weight_kg NUMERIC(5,1),
  target_weight_kg NUMERIC(5,1),

  -- Lifestyle
  dietary_preference dietary_preference,
  dietary_notes TEXT,

  -- Onboarding state
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_step INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id
  ON user_profiles(user_id);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage own profile" ON user_profiles
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user_profile()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach to auth.users trigger (won't duplicate if trigger exists)
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_profile();


-- ═══════════════════════════════════════════════════════════
-- FITNESS ASSESSMENTS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fitness_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,
  assessed_at DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Assessment tests (raw results)
  pushups_count INTEGER CHECK (pushups_count >= 0),
  jumping_jacks_30s INTEGER CHECK (jumping_jacks_30s >= 0),
  squats_count INTEGER CHECK (squats_count >= 0),
  plank_seconds INTEGER CHECK (plank_seconds >= 0),
  can_run_1km BOOLEAN,

  -- Derived (computed by app, not user input)
  derived_fitness_score NUMERIC(5,2),
  derived_fitness_level fitness_level,

  -- Context at time of assessment
  weight_kg_at_assessment NUMERIC(5,1),
  age_at_assessment INTEGER,

  -- Is this the current active assessment
  is_current BOOLEAN DEFAULT true,

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fitness_assessments_user_id
  ON fitness_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_fitness_assessments_current
  ON fitness_assessments(user_id, is_current)
  WHERE is_current = true;

ALTER TABLE fitness_assessments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage own assessments"
    ON fitness_assessments
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- When a new assessment is added, mark previous as not current
CREATE OR REPLACE FUNCTION handle_new_assessment()
RETURNS trigger AS $$
BEGIN
  UPDATE fitness_assessments
  SET is_current = false
  WHERE user_id = NEW.user_id
    AND id != NEW.id
    AND is_current = true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_new_assessment ON fitness_assessments;
CREATE TRIGGER on_new_assessment
  AFTER INSERT ON fitness_assessments
  FOR EACH ROW EXECUTE FUNCTION handle_new_assessment();


-- ═══════════════════════════════════════════════════════════
-- HEALTH CONDITIONS — INJURIES
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_injuries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,
  body_part injury_body_part NOT NULL,
  status injury_status NOT NULL DEFAULT 'current',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_injuries_user_id
  ON user_injuries(user_id);

ALTER TABLE user_injuries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage own injuries" ON user_injuries
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════
-- HEALTH CONDITIONS — CHRONIC
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_chronic_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,
  condition_type chronic_condition_type NOT NULL,
  severity condition_severity NOT NULL DEFAULT 'mild',
  notes TEXT,
  -- For 'other' type
  custom_condition_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, condition_type)
);

CREATE INDEX IF NOT EXISTS idx_chronic_conditions_user_id
  ON user_chronic_conditions(user_id);

ALTER TABLE user_chronic_conditions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage own conditions"
    ON user_chronic_conditions
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════
-- PROGRAMMES
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS programmes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity
  name TEXT NOT NULL,

  -- Goal
  goal_type goal_type NOT NULL,
  goal_description TEXT,

  -- Targets
  start_weight_kg NUMERIC(5,1),
  target_weight_kg NUMERIC(5,1),
  target_weeks INTEGER,

  -- Config
  available_days INTEGER CHECK (available_days BETWEEN 1 AND 7),
  equipment equipment_type NOT NULL DEFAULT 'full_gym',

  -- Linked context
  assessment_id UUID REFERENCES fitness_assessments(id),

  -- AI generation
  created_by_ai BOOLEAN DEFAULT false,
  ai_prompt TEXT,
  ai_model TEXT,

  -- State
  is_active BOOLEAN DEFAULT true,
  started_at DATE DEFAULT CURRENT_DATE,
  completed_at DATE,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_programmes_user_id
  ON programmes(user_id);
CREATE INDEX IF NOT EXISTS idx_programmes_active
  ON programmes(user_id, is_active) WHERE is_active = true;

ALTER TABLE programmes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage own programmes" ON programmes
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════
-- PROGRAMME PHASES
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS programme_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id UUID NOT NULL
    REFERENCES programmes(id) ON DELETE CASCADE,
  phase_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  goal TEXT NOT NULL,
  weeks_count INTEGER NOT NULL,

  -- Intensity guidance for AI/display
  intensity_level INTEGER CHECK (intensity_level BETWEEN 1 AND 10),
  volume_level INTEGER CHECK (volume_level BETWEEN 1 AND 10),

  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(programme_id, phase_number)
);

CREATE INDEX IF NOT EXISTS idx_programme_phases_programme_id
  ON programme_phases(programme_id);

ALTER TABLE programme_phases ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users view own phases" ON programme_phases
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM programmes p
        WHERE p.id = programme_phases.programme_id
        AND p.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════
-- PROGRAMME DAYS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS programme_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL
    REFERENCES programme_phases(id) ON DELETE CASCADE,
  day_of_week day_of_week NOT NULL,
  workout_type workout_type NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  duration_min INTEGER,
  kcal_range TEXT,
  tags TEXT[],
  has_warmup BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(phase_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_programme_days_phase_id
  ON programme_days(phase_id);

ALTER TABLE programme_days ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users view own days" ON programme_days
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM programme_phases ph
        JOIN programmes p ON p.id = ph.programme_id
        WHERE ph.id = programme_days.phase_id
        AND p.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════
-- PROGRAMME EXERCISES
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS programme_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id UUID NOT NULL
    REFERENCES programme_days(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id),
  display_order INTEGER NOT NULL,
  sets_reps TEXT NOT NULL,
  rest TEXT,
  notes TEXT,
  warn TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(day_id, display_order)
);

CREATE INDEX IF NOT EXISTS idx_programme_exercises_day_id
  ON programme_exercises(day_id);

ALTER TABLE programme_exercises ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users view own programme exercises"
    ON programme_exercises
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM programme_days pd
        JOIN programme_phases ph ON ph.id = pd.phase_id
        JOIN programmes p ON p.id = ph.programme_id
        WHERE pd.id = programme_exercises.day_id
        AND p.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════
-- WARMUP ITEMS (per-day, see 20260713010000_scope_warmup_items_to_day)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS warmup_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id UUID NOT NULL
    REFERENCES programmes(id) ON DELETE CASCADE,
  day_id UUID
    REFERENCES programme_days(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL,
  item_key TEXT NOT NULL,
  label TEXT NOT NULL,
  detail TEXT,
  icon TEXT,
  component_type TEXT,
  related_exercise_id TEXT,
  intensity_label TEXT,
  UNIQUE(day_id, item_key)
);

CREATE INDEX IF NOT EXISTS idx_warmup_items_day_id ON warmup_items (day_id);

ALTER TABLE warmup_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users view own warmup items" ON warmup_items
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM programme_days pd
        JOIN programme_phases ph ON ph.id = pd.phase_id
        JOIN programmes p ON p.id = ph.programme_id
        WHERE pd.id = warmup_items.day_id
        AND p.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════
-- COOLDOWN ITEMS (per-day)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cooldown_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id UUID NOT NULL
    REFERENCES programme_days(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL,
  item_key TEXT NOT NULL,
  label TEXT NOT NULL,
  detail TEXT,
  UNIQUE(day_id, item_key)
);

ALTER TABLE cooldown_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users view own cooldown items" ON cooldown_items
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM programme_days pd
        JOIN programme_phases ph ON ph.id = pd.phase_id
        JOIN programmes p ON p.id = ph.programme_id
        WHERE pd.id = cooldown_items.day_id
        AND p.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════
-- PROGRAMME CONFIG — ADD FK COLUMNS
-- ═══════════════════════════════════════════════════════════

ALTER TABLE programme_config
  ADD COLUMN IF NOT EXISTS programme_id UUID
    REFERENCES programmes(id);

ALTER TABLE programme_config
  ADD COLUMN IF NOT EXISTS assessment_id UUID
    REFERENCES fitness_assessments(id);


-- ═══════════════════════════════════════════════════════════
-- UPDATED_AT AUTO-TRIGGER
-- Shared function for all tables with updated_at column.
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all new tables with updated_at
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'user_profiles',
    'user_injuries',
    'user_chronic_conditions',
    'programmes'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_%s_updated_at ON %I;
       CREATE TRIGGER set_%s_updated_at
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      tbl, tbl, tbl, tbl
    );
  END LOOP;
END $$;
