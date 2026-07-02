import { calculateAge } from '../../utils/dateUtils'
import type { WizardState } from './useWizardState'

// Mirrors buildAthletePayload in GenerateProgrammeView.tsx (see agent-odin
// AthleteInputV2Schema) so onboarding and the returning-user flow send Odin
// an identically-shaped payload.
const GOAL_MAP: Record<string, string> = {
  body_recomposition: 'recomposition',
  general_fitness: 'recomposition',
  maintenance: 'recomposition',
}

const EQUIPMENT_MAP: Record<string, string> = {
  bodyweight_only: 'bodyweight',
}

export function buildOdinPayloadFromWizardState(wizardState: WizardState) {
  const rawGoal = wizardState.goal ?? 'fat_loss'
  const odinGoal = GOAL_MAP[rawGoal] ?? rawGoal

  const rawEquip = wizardState.equipment ?? 'full_gym'
  const odinEquip = EQUIPMENT_MAP[rawEquip] ?? rawEquip

  const currentWeight = wizardState.current_weight_kg ?? 70
  const targetWeight =
    wizardState.goal_sub_fields.target_muscle_gain_kg != null
      ? currentWeight + wizardState.goal_sub_fields.target_muscle_gain_kg
      : currentWeight

  const injuries = wizardState.injuries
    .filter((i) => i.modification !== null)
    .map((i) => ({ area: i.area, severity: i.modification as 'modify' | 'avoid', notes: '' }))

  const sub = wizardState.goal_sub_fields
  const goalParameters: Record<string, number | string> = {}
  if (sub.current_body_fat_pct != null)
    goalParameters.current_body_fat_pct = sub.current_body_fat_pct
  if (sub.target_body_fat_pct != null) goalParameters.target_body_fat_pct = sub.target_body_fat_pct
  if (sub.target_muscle_gain_kg != null)
    goalParameters.target_muscle_gain_kg = sub.target_muscle_gain_kg
  if (sub.target_timeframe_weeks != null)
    goalParameters.timeframe_weeks = Math.round(sub.target_timeframe_weeks)
  if (sub.primary_lift) goalParameters.primary_lift = sub.primary_lift
  if (sub.current_1rm_kg != null) goalParameters.current_1rm_kg = sub.current_1rm_kg
  if (sub.target_1rm_kg != null) goalParameters.target_1rm_kg = sub.target_1rm_kg
  if (sub.focus) goalParameters.endurance_focus = sub.focus

  const knownLiftsPayload =
    wizardState.baseline_path === 'self_reported'
      ? wizardState.known_lifts.map((l) => ({
          exercise_id: l.exercise_id,
          weight_kg: l.weight_kg,
          reps: l.reps,
        }))
      : []
  // Odin rejects baseline_path: 'self_reported' with an empty known_lifts array.
  const effectiveBaselinePath =
    wizardState.baseline_path === 'self_reported' && knownLiftsPayload.length === 0
      ? 'skipped'
      : (wizardState.baseline_path ?? 'skipped')

  return {
    name: wizardState.full_name || 'Athlete',
    age: calculateAge(wizardState.date_of_birth) ?? 25,
    sex: wizardState.gender === 'female' ? ('female' as const) : ('male' as const),
    current_weight_kg: currentWeight,
    target_weight_kg: targetWeight,
    height_cm: wizardState.height_cm ?? 170,
    goal: odinGoal,
    available_days_per_week: wizardState.available_days_per_week,
    session_duration_min: wizardState.session_duration_min,
    equipment: odinEquip,
    fitness_level: wizardState.fitness_level ?? 'beginner',
    lifestyle: wizardState.lifestyle,
    occupation: wizardState.occupation ?? undefined,
    injuries,
    medical_conditions: wizardState.medical_conditions,
    // Segmental balance (lean_* limbs) is never available at onboarding time —
    // it only ever comes from a prior stored inbody_logs row — so the full
    // strict inbody object can't be populated from a first-time upload.
    inbody: null,
    ...(wizardState.preferred_workout_time
      ? { schedule: { preferred_workout_time: wizardState.preferred_workout_time } }
      : {}),
    ...(Object.keys(goalParameters).length > 0 ? { goal_parameters: goalParameters } : {}),
    baseline_path: effectiveBaselinePath,
    known_lifts: knownLiftsPayload,
  }
}
