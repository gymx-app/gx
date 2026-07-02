import { calculateAge } from '../../utils/dateUtils'

// Mirrors buildOdinPayloadFromWizardState (src/features/onboarding/buildOdinPayload.ts)
// but sources every field from the already-persisted user_profiles/user_health
// rows instead of in-memory wizard state — returning users don't re-enter
// InBody, goal precision, or baseline strength (all collected at onboarding).
const GOAL_MAP: Record<string, string> = {
  body_recomposition: 'recomposition',
  general_fitness: 'recomposition',
  maintenance: 'recomposition',
}

const EQUIPMENT_MAP: Record<string, string> = {
  bodyweight_only: 'bodyweight',
}

export interface ReturningUserProfile {
  full_name: string | null
  date_of_birth: string | null
  gender: string | null
  height_cm: number | null
  current_weight_kg: number | null
  target_weight_kg: number | null
}

export interface ReturningUserHealth {
  fitness_level: string | null
  goal: string | null
  available_days_per_week: number | null
  session_duration_min: number | null
  equipment: string | null
  lifestyle: string[] | null
  occupation: string | null
  medical_conditions: string[] | null
  preferred_workout_time: string | null
  injuries_v2: { area: string; modification: 'modify' | 'avoid' | null; notes?: string }[] | null
  goal_sub_fields: Record<string, number | string> | null
  baseline_path: string | null
  known_lifts: { exercise_id: string; weight_kg: number; reps: number }[] | null
  target_body_fat_pct: number | null
  target_timeframe_weeks: number | null
}

export function buildReturningUserOdinPayload(
  profile: ReturningUserProfile,
  health: ReturningUserHealth,
  targetWeightOverrideKg: number | null
) {
  const rawGoal = health.goal ?? 'fat_loss'
  const odinGoal = GOAL_MAP[rawGoal] ?? rawGoal

  const rawEquip = health.equipment ?? 'full_gym'
  const odinEquip = EQUIPMENT_MAP[rawEquip] ?? rawEquip

  const currentWeight = profile.current_weight_kg ?? 70
  const targetWeight = profile.target_weight_kg ?? targetWeightOverrideKg ?? currentWeight

  const injuries = (health.injuries_v2 ?? [])
    .filter((i) => i.modification !== null)
    .map((i) => ({
      area: i.area,
      severity: i.modification as 'modify' | 'avoid',
      notes: i.notes ?? '',
    }))

  const sub = health.goal_sub_fields ?? {}
  const goalParameters: Record<string, number | string> = {}
  for (const [key, value] of Object.entries(sub)) {
    if (value !== null && value !== undefined && value !== '') {
      goalParameters[key === 'target_timeframe_weeks' ? 'timeframe_weeks' : key] = value
    }
  }
  if (health.target_body_fat_pct != null)
    goalParameters.target_body_fat_pct = health.target_body_fat_pct
  if (health.target_timeframe_weeks != null)
    goalParameters.timeframe_weeks = Math.round(health.target_timeframe_weeks)

  const knownLiftsPayload =
    health.baseline_path === 'self_reported' ? (health.known_lifts ?? []) : []
  const effectiveBaselinePath =
    health.baseline_path === 'self_reported' && knownLiftsPayload.length === 0
      ? 'skipped'
      : (health.baseline_path ?? 'skipped')

  return {
    name: profile.full_name ?? 'Athlete',
    age: calculateAge(profile.date_of_birth) ?? 25,
    sex: profile.gender === 'female' ? ('female' as const) : ('male' as const),
    current_weight_kg: currentWeight,
    target_weight_kg: targetWeight,
    height_cm: profile.height_cm ?? 170,
    goal: odinGoal,
    available_days_per_week: health.available_days_per_week ?? 4,
    session_duration_min: health.session_duration_min ?? 60,
    equipment: odinEquip,
    fitness_level: health.fitness_level ?? 'beginner',
    lifestyle: health.lifestyle ?? [],
    occupation: health.occupation ?? undefined,
    injuries,
    medical_conditions: health.medical_conditions ?? [],
    // Segmental balance (lean_* limbs) only ever comes from a prior InBody
    // upload's stored inbody_logs row — returning users don't re-upload here.
    inbody: null,
    ...(health.preferred_workout_time
      ? { schedule: { preferred_workout_time: health.preferred_workout_time } }
      : {}),
    ...(Object.keys(goalParameters).length > 0 ? { goal_parameters: goalParameters } : {}),
    baseline_path: effectiveBaselinePath,
    known_lifts: knownLiftsPayload,
  }
}
