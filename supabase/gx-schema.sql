-- ============================================================
-- Gx Multi-Tenant Schema
-- Migrated from rohan-fuzo/gymtracker single-user schema
-- All tables scoped by user_id with RLS on auth.uid()
-- ============================================================

-- ============================================================
-- 1. EXERCISES (global library + user-created)
-- Must be created before exercise_logs (FK dependency)
-- ============================================================
create table if not exists exercises (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  equipment text[],
  gif_url text,
  body_part text,
  target_muscle text,
  is_global boolean default true,
  created_by uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

create unique index idx_exercises_global_name
  on exercises (name) where is_global = true;

create index idx_exercises_is_global on exercises(is_global);

alter table exercises enable row level security;

create policy "Anyone authenticated can view global exercises"
  on exercises for select
  using (is_global = true and auth.role() = 'authenticated');

create policy "Users can view own exercises"
  on exercises for select
  using (auth.uid() = created_by);

create policy "Users can insert own exercises"
  on exercises for insert
  with check (auth.uid() = created_by and is_global = false);

create policy "Users can update own exercises"
  on exercises for update
  using (auth.uid() = created_by and is_global = false)
  with check (auth.uid() = created_by and is_global = false);

create policy "Users can delete own exercises"
  on exercises for delete
  using (auth.uid() = created_by and is_global = false);

-- ============================================================
-- 2. WORKOUT SESSIONS
-- ============================================================
create table if not exists workout_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  phase int not null,
  day_of_week text not null,
  workout_title text,
  is_travel boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now(),
  unique(user_id, date, day_of_week)
);

create index idx_workout_sessions_user_id on workout_sessions(user_id);
create index idx_workout_sessions_travel on workout_sessions(is_travel) where is_travel = true;

alter table workout_sessions enable row level security;

create policy "Users can view own sessions"
  on workout_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own sessions"
  on workout_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sessions"
  on workout_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own sessions"
  on workout_sessions for delete
  using (auth.uid() = user_id);

-- ============================================================
-- 3. EXERCISE LOGS (one row per set)
-- exercise_id is the FK to exercises; exercise_name kept as
-- denormalized TEXT for display fallback and offline resilience
-- ============================================================
create table if not exists exercise_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references workout_sessions(id) on delete cascade,
  exercise_id uuid not null references exercises(id),
  exercise_name text not null,
  date date not null,
  phase int not null,
  exercise_index int not null,
  set_number int not null,
  is_mm_set boolean default false,
  weight_kg numeric(5,2),
  reps int,
  rpe int check (rpe between 6 and 10),
  duration_s integer,
  is_travel boolean default false,
  completed boolean default false,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date, exercise_id, set_number, is_mm_set)
);

create index idx_exercise_logs_user_id on exercise_logs(user_id);
create index idx_exercise_logs_date on exercise_logs(date);
create index idx_exercise_logs_exercise_id on exercise_logs(exercise_id);

alter table exercise_logs enable row level security;

create policy "Users can view own exercise logs"
  on exercise_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own exercise logs"
  on exercise_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own exercise logs"
  on exercise_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own exercise logs"
  on exercise_logs for delete
  using (auth.uid() = user_id);

-- ============================================================
-- 4. WARMUP LOGS
-- ============================================================
create table if not exists warmup_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  phase int not null,
  item_key text not null,
  item_label text,
  completed boolean default false,
  created_at timestamptz default now(),
  unique(user_id, date, item_key)
);

create index idx_warmup_logs_user_id on warmup_logs(user_id);
create index idx_warmup_logs_date on warmup_logs(date);

alter table warmup_logs enable row level security;

create policy "Users can view own warmup logs"
  on warmup_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own warmup logs"
  on warmup_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own warmup logs"
  on warmup_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own warmup logs"
  on warmup_logs for delete
  using (auth.uid() = user_id);

-- ============================================================
-- 5. CHECKLIST LOGS (cooldown, sleep, creatine, cardio, mobility)
-- ============================================================
create table if not exists checklist_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  item_type text not null,
  item_key text not null,
  completed boolean default false,
  notes text,
  created_at timestamptz default now(),
  unique(user_id, date, item_key)
);

create index idx_checklist_logs_user_id on checklist_logs(user_id);
create index idx_checklist_logs_date on checklist_logs(date);

alter table checklist_logs enable row level security;

create policy "Users can view own checklist logs"
  on checklist_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own checklist logs"
  on checklist_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own checklist logs"
  on checklist_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own checklist logs"
  on checklist_logs for delete
  using (auth.uid() = user_id);

-- ============================================================
-- 6. BODY METRICS (weekly weigh-in)
-- ============================================================
create table if not exists body_metrics (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  weight_kg numeric(5,2) not null,
  phase int,
  notes text,
  created_at timestamptz default now(),
  unique(user_id, date)
);

create index idx_body_metrics_user_id on body_metrics(user_id);
create index idx_body_metrics_date on body_metrics(date);

alter table body_metrics enable row level security;

create policy "Users can view own body metrics"
  on body_metrics for select
  using (auth.uid() = user_id);

create policy "Users can insert own body metrics"
  on body_metrics for insert
  with check (auth.uid() = user_id);

create policy "Users can update own body metrics"
  on body_metrics for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own body metrics"
  on body_metrics for delete
  using (auth.uid() = user_id);

-- ============================================================
-- 7. HYDRATION LOGS
-- ============================================================
create table if not exists hydration_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  glasses int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);

create index idx_hydration_logs_user_id on hydration_logs(user_id);

alter table hydration_logs enable row level security;

create policy "Users can view own hydration logs"
  on hydration_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own hydration logs"
  on hydration_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own hydration logs"
  on hydration_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own hydration logs"
  on hydration_logs for delete
  using (auth.uid() = user_id);

-- ============================================================
-- 8. INBODY LOGS (bi-weekly body composition scans)
-- ============================================================
create table if not exists inbody_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  weight_kg numeric(5,2),
  body_fat_pct numeric(4,1),
  skeletal_muscle_mass numeric(5,2),
  body_fat_mass numeric(5,2),
  bmi numeric(4,1),
  total_body_water numeric(5,2),
  intracellular_water numeric(5,2),
  extracellular_water numeric(5,2),
  ecw_ratio numeric(5,3),
  bmr int,
  visceral_fat_level int,
  inbody_score int,
  lean_right_arm numeric(4,2),
  lean_left_arm numeric(4,2),
  lean_trunk numeric(4,2),
  lean_right_leg numeric(4,2),
  lean_left_leg numeric(4,2),
  notes text,
  created_at timestamptz default now(),
  unique(user_id, date)
);

create index idx_inbody_logs_user_id on inbody_logs(user_id);
create index idx_inbody_logs_date on inbody_logs(date);

alter table inbody_logs enable row level security;

create policy "Users can view own inbody logs"
  on inbody_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own inbody logs"
  on inbody_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own inbody logs"
  on inbody_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own inbody logs"
  on inbody_logs for delete
  using (auth.uid() = user_id);

-- ============================================================
-- 9. APPLE HEALTH LOGS (daily vitals)
-- ============================================================
create table if not exists apple_health_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  active_calories int,
  total_calories int,
  steps int,
  workout_duration_min int,
  resting_hr int,
  sleep_hours numeric(4,2),
  weight_kg numeric(5,2),
  created_at timestamptz default now(),
  unique(user_id, date)
);

create index idx_apple_health_logs_user_id on apple_health_logs(user_id);
create index idx_apple_health_logs_date on apple_health_logs(date);

alter table apple_health_logs enable row level security;

create policy "Users can view own apple health logs"
  on apple_health_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own apple health logs"
  on apple_health_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own apple health logs"
  on apple_health_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own apple health logs"
  on apple_health_logs for delete
  using (auth.uid() = user_id);

-- ============================================================
-- 10. BODY MEASUREMENTS (14-site tape measurements, stored in cm)
-- ============================================================
create table if not exists body_measurements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  phase int,
  neck numeric(5,1),
  shoulders numeric(5,1),
  chest numeric(5,1),
  bicep numeric(5,1),
  forearm numeric(5,1),
  wrist numeric(5,1),
  upper_abs numeric(5,1),
  waist numeric(5,1),
  lower_abs numeric(5,1),
  hips numeric(5,1),
  glutes numeric(5,1),
  thighs numeric(5,1),
  calves numeric(5,1),
  ankle numeric(5,1),
  notes text,
  created_at timestamptz default now(),
  unique(user_id, date)
);

create index idx_body_measurements_user_id on body_measurements(user_id);
create index idx_body_measurements_date on body_measurements(date);

alter table body_measurements enable row level security;

create policy "Users can view own body measurements"
  on body_measurements for select
  using (auth.uid() = user_id);

create policy "Users can insert own body measurements"
  on body_measurements for insert
  with check (auth.uid() = user_id);

create policy "Users can update own body measurements"
  on body_measurements for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own body measurements"
  on body_measurements for delete
  using (auth.uid() = user_id);

-- ============================================================
-- 11. PROGRAMME CONFIG (per-user programme settings)
-- ============================================================
create table if not exists programme_config (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade unique,
  start_date date not null default current_date,
  phase_weeks int[] not null default '{4,4,5,4,999}',
  min_active_days int not null default 4,
  updated_at timestamptz default now()
);

create index idx_programme_config_user_id on programme_config(user_id);

alter table programme_config enable row level security;

create policy "Users can view own programme config"
  on programme_config for select
  using (auth.uid() = user_id);

create policy "Users can insert own programme config"
  on programme_config for insert
  with check (auth.uid() = user_id);

create policy "Users can update own programme config"
  on programme_config for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own programme config"
  on programme_config for delete
  using (auth.uid() = user_id);

-- ============================================================
-- HELPER FUNCTION: upsert exercise log (user-scoped)
-- ============================================================
create or replace function upsert_exercise_log(
  p_user_id uuid,
  p_date date,
  p_phase int,
  p_session_id uuid,
  p_exercise_id uuid,
  p_exercise_name text,
  p_exercise_index int,
  p_set_number int,
  p_is_mm_set boolean,
  p_weight_kg numeric,
  p_reps int,
  p_completed boolean,
  p_notes text default null
) returns uuid as $$
declare
  v_id uuid;
begin
  -- Enforce caller owns the row
  if p_user_id != auth.uid() then
    raise exception 'Forbidden: user_id does not match authenticated user';
  end if;

  select id into v_id from exercise_logs
  where user_id = p_user_id
    and date = p_date
    and exercise_id = p_exercise_id
    and set_number = p_set_number
    and is_mm_set = p_is_mm_set;

  if v_id is null then
    insert into exercise_logs (
      user_id, session_id, exercise_id, exercise_name, date, phase,
      exercise_index, set_number, is_mm_set, weight_kg, reps, completed, notes
    ) values (
      p_user_id, p_session_id, p_exercise_id, p_exercise_name, p_date, p_phase,
      p_exercise_index, p_set_number, p_is_mm_set, p_weight_kg, p_reps,
      p_completed, p_notes
    ) returning id into v_id;
  else
    update exercise_logs set
      weight_kg = p_weight_kg,
      reps = p_reps,
      completed = p_completed,
      notes = p_notes,
      updated_at = now()
    where id = v_id;
  end if;
  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

-- ============================================================
-- TRIGGER: auto-create programme_config for new users
-- ============================================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into programme_config (user_id, start_date)
  values (new.id, current_date);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
