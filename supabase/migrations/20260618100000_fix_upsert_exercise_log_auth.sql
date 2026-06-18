-- Fix: validate auth.uid() inside SECURITY DEFINER function
-- Prevents authenticated users from writing logs to another user's account

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
$$ language plpgsql security definer;
