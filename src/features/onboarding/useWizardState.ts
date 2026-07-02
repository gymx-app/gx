import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'
import { getISTTodayStr } from '../../utils/dateUtils'

export type Gender = 'male' | 'female' | 'other' | null
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced' | null
export type Equipment = 'full_gym' | 'dumbbells_only' | 'home_gym' | 'bodyweight_only' | null
export type BaselinePath = 'self_reported' | 'day_one_test' | 'skipped' | null
export type WorkoutTime = 'morning' | 'afternoon' | 'evening' | null
export type InjuryModification = 'modify' | 'avoid'
export type GenerationErrorType = 'API_ERROR' | 'VALIDATION_ERROR' | 'SAVE_ERROR' | null

export interface InBodyData {
  body_fat_pct: number | null
  skeletal_muscle_mass: number | null
  body_fat_mass: number | null
  bmr: number | null
  visceral_fat_level: number | null
  total_body_water: number | null
  weight_kg: number | null
}

export interface KnownLift {
  exercise_id: string
  weight_kg: number
  reps: number
}

export interface InjuryEntry {
  area: string
  modification: InjuryModification | null
}

export interface GoalSubFields {
  current_body_fat_pct: number | null
  target_body_fat_pct: number | null
  target_timeframe_weeks: number | null
  target_muscle_gain_kg: number | null
  primary_lift: string | null
  current_1rm_kg: number | null
  target_1rm_kg: number | null
  focus: string | null
}

const EMPTY_GOAL_SUB_FIELDS: GoalSubFields = {
  current_body_fat_pct: null,
  target_body_fat_pct: null,
  target_timeframe_weeks: null,
  target_muscle_gain_kg: null,
  primary_lift: null,
  current_1rm_kg: null,
  target_1rm_kg: null,
  focus: null,
}

export interface WizardState {
  // Screen 2
  full_name: string
  gender: Gender
  date_of_birth: string | null
  nationality: string

  // Screen 3
  height_cm: number | null
  current_weight_kg: number | null
  body_fat_pct: number | null
  inbody_uploaded: boolean
  inbody_data: InBodyData | null
  inbody_field_sources: {
    body_fat_pct: 'inbody' | 'manual' | null
    weight_kg: 'inbody' | 'manual' | null
  }

  // Screen 4
  fitness_level: FitnessLevel
  lifestyle: string[]
  occupation: string | null

  // Screen 5
  goal: string | null

  // Screen 6
  goal_sub_fields: GoalSubFields

  // Screen 7
  equipment: Equipment
  available_days_per_week: number
  session_duration_min: number
  preferred_workout_time: WorkoutTime

  // Screen 8
  baseline_path: BaselinePath
  known_lifts: KnownLift[]

  // Screen 9
  medical_conditions: string[]
  injuries: InjuryEntry[]

  // Screen 10
  start_date: string

  // Meta
  current_step: number
  last_saved_step: number
  generation_result: unknown
  generation_error: string | null
  generation_error_type: GenerationErrorType
  save_error: string | null
}

function initialWizardState(): WizardState {
  return {
    full_name: '',
    gender: null,
    date_of_birth: null,
    nationality: 'India',

    height_cm: null,
    current_weight_kg: null,
    body_fat_pct: null,
    inbody_uploaded: false,
    inbody_data: null,
    inbody_field_sources: { body_fat_pct: null, weight_kg: null },

    fitness_level: null,
    lifestyle: [],
    occupation: null,

    goal: null,

    goal_sub_fields: { ...EMPTY_GOAL_SUB_FIELDS },

    equipment: null,
    available_days_per_week: 4,
    session_duration_min: 60,
    preferred_workout_time: null,

    baseline_path: null,
    known_lifts: [],

    medical_conditions: [],
    injuries: [],

    start_date: getISTTodayStr(),

    current_step: 1,
    last_saved_step: 0,
    generation_result: null,
    generation_error: null,
    generation_error_type: null,
    save_error: null,
  }
}

// Shallow dot-path setter — only ever one level deep in practice
// (goal_sub_fields.*, inbody_field_sources.*), so no need for a general
// deep-set implementation.
function setPath(state: WizardState, path: string, value: unknown): WizardState {
  if (!path.includes('.')) {
    return { ...state, [path]: value }
  }
  const [parentKey, childKey] = path.split('.') as [keyof WizardState, string]
  const parent = state[parentKey]
  if (typeof parent !== 'object' || parent === null) return state
  return { ...state, [parentKey]: { ...parent, [childKey]: value } }
}

interface UseWizardStateReturn {
  wizardState: WizardState
  loadingInitial: boolean
  setField: (key: string, value: unknown) => void
  setFields: (fields: Partial<WizardState>) => void
  setInbodyData: (parsedData: InBodyData) => void
  overrideInbodyField: (field: keyof InBodyData, value: number | null) => void
  advanceStep: () => void
  goToStep: (n: number) => void
  resetGeneration: () => void
  setGenerationResult: (result: unknown) => void
  setGenerationError: (message: string, type: GenerationErrorType) => void
  markStepSaved: (step: number) => void
}

export function useWizardState(): UseWizardStateReturn {
  const { user } = useAuth()
  const [wizardState, setWizardState] = useState<WizardState>(initialWizardState)
  const [loadingInitial, setLoadingInitial] = useState(true)

  // ── Resume from Supabase on mount ──
  // Deliberately no "already hydrated" ref guard here: under StrictMode's dev
  // double-invoke, a ref guard would let the first (soon-cancelled) run mark
  // itself hydrated and block the second run from ever setting loadingInitial
  // to false. Relying only on the effect-local `cancelled` flag (like the
  // equivalent pattern in Program.tsx) lets the second, surviving run finish
  // normally instead.
  useEffect(() => {
    let cancelled = false

    const hydrate = async () => {
      if (!user) {
        setLoadingInitial(false)
        return
      }

      const [profileRes, healthRes, inbodyRes] = await Promise.all([
        supabase
          .from('user_profiles')
          .select(
            'full_name, gender, date_of_birth, nationality, height_cm, onboarding_step, onboarding_completed'
          )
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('user_health')
          .select(
            'height_cm, current_weight_kg, body_fat_pct, fitness_level, lifestyle, occupation, goal, goal_sub_fields, equipment, available_days_per_week, session_duration_min, preferred_workout_time, baseline_path, known_lifts, medical_conditions, injuries_v2'
          )
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('inbody_logs')
          .select(
            'body_fat_pct, skeletal_muscle_mass, body_fat_mass, bmr, visceral_fat_level, total_body_water, weight_kg'
          )
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      if (cancelled) return

      const p = profileRes.data
      const h = healthRes.data
      const inbody = inbodyRes.data

      const savedStep = p?.onboarding_step ?? 0

      setWizardState((prev) => {
        const next: WizardState = {
          ...prev,
          full_name: p?.full_name ?? prev.full_name,
          gender: (p?.gender as Gender) ?? prev.gender,
          date_of_birth: p?.date_of_birth ?? prev.date_of_birth,
          nationality: p?.nationality ?? prev.nationality,
          height_cm: h?.height_cm ?? p?.height_cm ?? prev.height_cm,
          current_weight_kg: h?.current_weight_kg ?? prev.current_weight_kg,
          body_fat_pct: h?.body_fat_pct ?? prev.body_fat_pct,
          fitness_level: (h?.fitness_level as FitnessLevel) ?? prev.fitness_level,
          lifestyle: h?.lifestyle ?? prev.lifestyle,
          occupation: h?.occupation ?? prev.occupation,
          goal: h?.goal ?? prev.goal,
          goal_sub_fields: {
            ...prev.goal_sub_fields,
            ...((h?.goal_sub_fields as Partial<GoalSubFields> | null) ?? {}),
          },
          equipment: (h?.equipment as Equipment) ?? prev.equipment,
          available_days_per_week: h?.available_days_per_week ?? prev.available_days_per_week,
          session_duration_min: h?.session_duration_min ?? prev.session_duration_min,
          preferred_workout_time:
            (h?.preferred_workout_time as WorkoutTime) ?? prev.preferred_workout_time,
          baseline_path: (h?.baseline_path as BaselinePath) ?? prev.baseline_path,
          known_lifts: (h?.known_lifts as unknown as KnownLift[]) ?? prev.known_lifts,
          medical_conditions: h?.medical_conditions ?? prev.medical_conditions,
          injuries: Array.isArray(h?.injuries_v2)
            ? (
                h.injuries_v2 as unknown as { area: string; modification: InjuryModification }[]
              ).map((i) => ({ area: i.area, modification: i.modification ?? null }))
            : prev.injuries,
          last_saved_step: savedStep,
          current_step:
            savedStep > 0 && !p?.onboarding_completed ? savedStep + 1 : prev.current_step,
        }

        if (inbody) {
          next.inbody_uploaded = true
          next.inbody_data = {
            body_fat_pct: inbody.body_fat_pct,
            skeletal_muscle_mass: inbody.skeletal_muscle_mass,
            body_fat_mass: inbody.body_fat_mass,
            bmr: inbody.bmr,
            visceral_fat_level: inbody.visceral_fat_level,
            total_body_water: inbody.total_body_water,
            weight_kg: inbody.weight_kg,
          }
          next.inbody_field_sources = {
            body_fat_pct: inbody.body_fat_pct != null ? 'inbody' : null,
            weight_kg: inbody.weight_kg != null ? 'inbody' : null,
          }
        }

        return next
      })

      setLoadingInitial(false)
    }

    void hydrate()
    return () => {
      cancelled = true
    }
  }, [user])

  const setField = useCallback((key: string, value: unknown) => {
    setWizardState((prev) => setPath(prev, key, value))
  }, [])

  const setFields = useCallback((fields: Partial<WizardState>) => {
    setWizardState((prev) => ({ ...prev, ...fields }))
  }, [])

  const setInbodyData = useCallback((parsedData: InBodyData) => {
    setWizardState((prev) => ({
      ...prev,
      inbody_uploaded: true,
      inbody_data: parsedData,
      inbody_field_sources: {
        body_fat_pct:
          parsedData.body_fat_pct != null ? 'inbody' : prev.inbody_field_sources.body_fat_pct,
        weight_kg: parsedData.weight_kg != null ? 'inbody' : prev.inbody_field_sources.weight_kg,
      },
      body_fat_pct: parsedData.body_fat_pct ?? prev.body_fat_pct,
      current_weight_kg: parsedData.weight_kg ?? prev.current_weight_kg,
    }))
  }, [])

  const overrideInbodyField = useCallback((field: keyof InBodyData, value: number | null) => {
    setWizardState((prev) => {
      const nextInbody = { ...(prev.inbody_data ?? ({} as InBodyData)), [field]: value }
      const sourcesUpdate =
        field === 'body_fat_pct' || field === 'weight_kg'
          ? { ...prev.inbody_field_sources, [field]: 'manual' as const }
          : prev.inbody_field_sources
      return {
        ...prev,
        inbody_data: nextInbody,
        inbody_field_sources: sourcesUpdate,
        body_fat_pct: field === 'body_fat_pct' ? value : prev.body_fat_pct,
        current_weight_kg: field === 'weight_kg' ? value : prev.current_weight_kg,
      }
    })
  }, [])

  const advanceStep = useCallback(() => {
    setWizardState((prev) => ({ ...prev, current_step: prev.current_step + 1 }))
  }, [])

  const goToStep = useCallback((n: number) => {
    setWizardState((prev) => ({ ...prev, current_step: n }))
  }, [])

  const markStepSaved = useCallback((step: number) => {
    setWizardState((prev) => ({ ...prev, last_saved_step: step }))
  }, [])

  const resetGeneration = useCallback(() => {
    setWizardState((prev) => ({
      ...prev,
      generation_result: null,
      generation_error: null,
      generation_error_type: null,
      save_error: null,
    }))
  }, [])

  const setGenerationResult = useCallback((result: unknown) => {
    setWizardState((prev) => ({
      ...prev,
      generation_result: result,
      generation_error: null,
      generation_error_type: null,
    }))
  }, [])

  const setGenerationError = useCallback((message: string, type: GenerationErrorType) => {
    setWizardState((prev) => ({ ...prev, generation_error: message, generation_error_type: type }))
  }, [])

  return {
    wizardState,
    loadingInitial,
    setField,
    setFields,
    setInbodyData,
    overrideInbodyField,
    advanceStep,
    goToStep,
    resetGeneration,
    setGenerationResult,
    setGenerationError,
    markStepSaved,
  }
}
