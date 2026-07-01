import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'
import { useOdinGenerate } from '../../hooks/useOdinGenerate'
import { colors, radius } from '../../styles/tokens'
import { SectionLabel } from '../../components/ui'
import { toDateStr } from '../../utils/programme'
import { AlertCircle, Loader2, X } from 'lucide-react'
import { ProfileCard } from '../../components/programme/ProfileCard'
import type { UserProfile, UserHealth } from '../../components/programme/ProfileCard'
import { GOAL_LABELS } from '../../components/programme/goalLabels'
import { InBodyUpload } from './InBodyUpload'
import type { InBodyData } from './InBodyUpload'

// InBody's segmental analysis (lean_* columns) is a separate part of the report
// that InBodyUpload never captures — only ever sourced from prior stored rows.
interface LatestInbodyRow extends InBodyData {
  lean_left_arm: number | null
  lean_right_arm: number | null
  lean_left_leg: number | null
  lean_right_leg: number | null
  lean_trunk: number | null
}

// How far back a stored inbody_logs row still counts as "recent" for the
// existing-data prompt in InBodyUpload.
const INBODY_RECENT_DAYS = 90

// Must match SESSION_DURATION_STORAGE_KEY in OnboardingWizard.tsx — the key it
// stashes goal-refinement/baseline-strength data under before navigating here.
const ONBOARDING_PAYLOAD_KEY = 'gx-onboarding-programme-payload'

function calcAge(dob: string | null): number {
  if (!dob) return 25
  const birth = new Date(dob)
  if (isNaN(birth.getTime())) return 25
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

// Map onboarding values → Odin enum values
const GOAL_MAP: Record<string, string> = {
  body_recomposition: 'recomposition',
  general_fitness: 'recomposition',
  maintenance: 'recomposition',
}

const EQUIPMENT_MAP: Record<string, string> = {
  bodyweight_only: 'bodyweight',
}

const STRATEGY_LINES = [
  'Reading biomechanical profile…',
  'Evaluating training history…',
  'Mapping periodisation model…',
  'Calibrating volume tolerance…',
  'Selecting progression strategy…',
  'Scoring movement patterns…',
]

const BUILD_LINES = [
  'Assigning exercise library…',
  'Calculating set & rep schemes…',
  'Sequencing phase skeletons…',
  'Optimising recovery windows…',
  'Tuning RPE targets per week…',
  'Finalising programme structure…',
]

function AiGeneratingScreen({ genStatus }: { genStatus: string }) {
  const isBuilding = genStatus.toLowerCase().includes('building')
  const lines = isBuilding ? BUILD_LINES : STRATEGY_LINES
  const [lineIdx, setLineIdx] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setLineIdx((i) => (i + 1) % lines.length)
    }, 1800)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setLineIdx(0)
    }
  }, [isBuilding, lines.length])

  const step1Active = !isBuilding
  const step2Active = isBuilding

  return (
    <div
      className="flex-1 flex flex-col items-center justify-between px-6"
      style={{ background: colors.bg, paddingTop: 64, paddingBottom: 56 }}
    >
      {/* Top label */}
      <div className="flex items-center gap-2">
        <div
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: colors.accent }}
        />
        <span
          className="text-[11px] font-['DM_Sans'] font-bold tracking-[3px] uppercase"
          style={{ color: colors.accent }}
        >
          Odin AI · Processing
        </span>
        <div
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: colors.accent, animationDelay: '0.5s' }}
        />
      </div>

      {/* Animated visual */}
      <div className="flex flex-col items-center">
        <div className="relative w-[160px] h-[160px] mb-10">
          {/* Outer slow ring */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              border: `1px solid ${colors.accent}33`,
              animation: 'spin 8s linear infinite',
            }}
          />
          {/* Dashed mid ring */}
          <div
            className="absolute inset-[16px] rounded-full"
            style={{
              border: `1px dashed ${colors.accent}55`,
              animation: 'spin 5s linear infinite reverse',
            }}
          />
          {/* Inner ring */}
          <div
            className="absolute inset-[32px] rounded-full"
            style={{
              border: `1.5px solid ${colors.accent}99`,
              animation: 'spin 3s linear infinite',
            }}
          />
          {/* Ping halo */}
          <div
            className="absolute inset-[44px] rounded-full animate-ping"
            style={{ background: colors.accentMuted, animationDuration: '2.4s' }}
          />
          {/* Core */}
          <div
            className="absolute inset-[44px] rounded-full flex items-center justify-center"
            style={{
              background: colors.surface,
              border: `2px solid ${colors.accent}`,
            }}
          >
            <span
              className="font-['Bebas_Neue'] text-[22px] tracking-[3px]"
              style={{ color: colors.accent }}
            >
              AI
            </span>
          </div>
          {/* Orbit dot */}
          <div
            className="absolute w-2 h-2 rounded-full"
            style={{
              background: colors.accent,
              top: '50%',
              left: '50%',
              marginTop: -4,
              marginLeft: -4,
              transformOrigin: '-60px center',
              animation: 'spin 3s linear infinite',
            }}
          />
        </div>

        {/* Title */}
        <h2
          className="font-['Bebas_Neue'] text-[30px] tracking-[3px] text-center leading-none mb-2"
          style={{ color: colors.text }}
        >
          Building Your
          <br />
          <span style={{ color: colors.accent }}>AI Programme</span>
        </h2>
        <p
          className="text-[13px] font-['DM_Sans'] text-center mb-8"
          style={{ color: colors.muted }}
        >
          Odin is generating a personalised training plan
          <br />
          tailored to your exact profile.
        </p>

        {/* Step pills */}
        <div className="flex items-center gap-2 mb-8">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5"
            style={{
              background: step1Active ? colors.accentMuted : colors.surface2,
              border: `1px solid ${step1Active ? colors.accent : colors.border}`,
              borderRadius: 99,
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: step1Active ? colors.accent : colors.muted,
                ...(step1Active ? { animation: 'pulse 1s ease-in-out infinite' } : {}),
              }}
            />
            <span
              className="text-[11px] font-['DM_Sans'] font-semibold tracking-[0.5px]"
              style={{ color: step1Active ? colors.accent : colors.muted }}
            >
              STRATEGY
            </span>
          </div>

          <div className="w-4 h-px" style={{ background: colors.border }} />

          <div
            className="flex items-center gap-1.5 px-3 py-1.5"
            style={{
              background: step2Active ? colors.accentMuted : colors.surface2,
              border: `1px solid ${step2Active ? colors.accent : colors.border}`,
              borderRadius: 99,
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: step2Active ? colors.accent : colors.muted,
                ...(step2Active ? { animation: 'pulse 1s ease-in-out infinite' } : {}),
              }}
            />
            <span
              className="text-[11px] font-['DM_Sans'] font-semibold tracking-[0.5px]"
              style={{ color: step2Active ? colors.accent : colors.muted }}
            >
              BUILD
            </span>
          </div>
        </div>

        {/* Rotating analysis line */}
        <div
          className="px-4 py-2.5 text-center"
          style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.button,
            minWidth: 220,
          }}
        >
          <p
            className="text-[13px] font-['DM_Sans']"
            style={{ color: colors.textSecondary }}
            key={lineIdx}
          >
            {lines[lineIdx]}
          </p>
        </div>
      </div>

      {/* Bottom note */}
      <p className="text-[11px] font-['DM_Sans'] text-center" style={{ color: colors.muted }}>
        This may take 30–60 seconds
      </p>
    </div>
  )
}

// ── Goal refinement (v2 — see agent-odin GoalParametersV2Schema) ──
type PrimaryLift = 'squat' | 'deadlift' | 'bench_press' | 'overhead_press'
type EnduranceFocus = 'cardio' | 'mobility' | 'general'

interface GoalRefineForm {
  current_body_fat_pct: string
  target_body_fat_pct: string
  target_muscle_gain_kg: string
  timeframe_weeks: string
  primary_lift: PrimaryLift | ''
  current_1rm_kg: string
  target_1rm_kg: string
  endurance_focus: EnduranceFocus | ''
}

const EMPTY_GOAL_REFINE: GoalRefineForm = {
  current_body_fat_pct: '',
  target_body_fat_pct: '',
  target_muscle_gain_kg: '',
  timeframe_weeks: '',
  primary_lift: '',
  current_1rm_kg: '',
  target_1rm_kg: '',
  endurance_focus: '',
}

const PRIMARY_LIFT_OPTIONS: { value: PrimaryLift; label: string }[] = [
  { value: 'squat', label: 'Squat' },
  { value: 'bench_press', label: 'Bench Press' },
  { value: 'deadlift', label: 'Deadlift' },
  { value: 'overhead_press', label: 'Overhead Press' },
]

const ENDURANCE_FOCUS_OPTIONS: { value: EnduranceFocus; label: string }[] = [
  { value: 'cardio', label: 'Endurance' },
  { value: 'mobility', label: 'Mobility' },
  { value: 'general', label: 'Overall Health' },
]

// ── Baseline strength (v2 — see agent-odin KnownLiftSchema / BaselinePathSchema) ──
type KnownLiftExerciseId = 'squat' | 'bench_press' | 'deadlift' | 'overhead_press' | 'barbell_row'
type BaselinePath = 'self_reported' | 'day_one_test' | 'skipped'

interface KnownLiftEntry {
  exercise_id: KnownLiftExerciseId
  weight_kg: string
  reps: string
}

const KNOWN_LIFT_EXERCISE_OPTIONS: { value: KnownLiftExerciseId; label: string }[] = [
  { value: 'squat', label: 'Squat' },
  { value: 'bench_press', label: 'Bench Press' },
  { value: 'deadlift', label: 'Deadlift' },
  { value: 'overhead_press', label: 'Overhead Press' },
  { value: 'barbell_row', label: 'Barbell Row' },
]

const KNOWN_LIFT_EXERCISE_LABELS: Record<KnownLiftExerciseId, string> = {
  squat: 'Squat',
  bench_press: 'Bench Press',
  deadlift: 'Deadlift',
  overhead_press: 'Overhead Press',
  barbell_row: 'Barbell Row',
}

const BASELINE_PATH_OPTIONS: { value: BaselinePath; label: string }[] = [
  { value: 'self_reported', label: 'Self-Reported' },
  { value: 'day_one_test', label: 'Day-One Test' },
  { value: 'skipped', label: 'Skip' },
]

function goalBucket(
  rawGoal: string | null
): 'fat_loss' | 'muscle_gain' | 'strength' | 'recomposition' | 'general_fitness' | null {
  switch (rawGoal) {
    case 'fat_loss':
      return 'fat_loss'
    case 'muscle_gain':
      return 'muscle_gain'
    case 'strength':
      return 'strength'
    case 'recomposition':
    case 'body_recomposition':
      return 'recomposition'
    case 'general_fitness':
      return 'general_fitness'
    default:
      return null
  }
}

function parseOptionalNumber(value: string): number | null {
  if (value.trim() === '') return null
  const n = parseFloat(value)
  return isNaN(n) ? null : n
}

function GoalNumberField({
  label,
  hint,
  value,
  onChange,
  min,
  max,
}: {
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
  min: number
  max: number
}) {
  return (
    <div className="mb-4">
      <SectionLabel label={label} className="mb-2" />
      <input
        type="number"
        inputMode="decimal"
        step="0.1"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="—"
        className="h-[48px] w-full px-[14px] text-[#f0ede8] text-[15px] font-['DM_Sans'] placeholder:text-[#444444]"
        style={{
          background: colors.surface2,
          border: `1.5px solid ${colors.border}`,
          borderRadius: radius.input,
        }}
      />
      {hint && (
        <p className="text-[11px] mt-1 pl-1" style={{ color: colors.muted }}>
          {hint}
        </p>
      )}
    </div>
  )
}

function GoalPillRow<T extends string>({
  label,
  options,
  value,
  onChange,
  errorText,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T | ''
  onChange: (v: T | '') => void
  errorText?: string
}) {
  return (
    <div className="mb-4">
      <SectionLabel label={label} className="mb-2" />
      <div className="flex gap-2 flex-wrap">
        {options.map((opt) => {
          const active = value === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => onChange(active ? '' : opt.value)}
              className="flex-1 py-3 text-[13px] font-['DM_Sans'] font-medium tracking-[0.3px] transition-all duration-150 active:scale-[0.96]"
              style={{
                borderRadius: radius.button,
                border: `1.5px solid ${active ? colors.accent : colors.border}`,
                background: active ? colors.accentMuted : colors.surface2,
                color: active ? colors.accent : colors.muted,
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
      {errorText && (
        <p className="text-[11px] mt-1 pl-1" style={{ color: colors.error }}>
          {errorText}
        </p>
      )}
    </div>
  )
}

// Pure builder so both the manual "GENERATE" button (handleGenerate, reading
// live form state) and the onboarding auto-trigger effect (reading a just-
// parsed sessionStorage payload) can produce the exact same Odin athlete
// payload without duplicating this logic.
function buildAthletePayload({
  profile,
  health,
  latestInbody,
  inbodyOverride,
  targetWeightKg,
  goalRefine,
  baselinePath,
  knownLifts,
}: {
  profile: UserProfile
  health: UserHealth
  latestInbody: LatestInbodyRow | null
  inbodyOverride: InBodyData | null
  targetWeightKg: string
  goalRefine: GoalRefineForm
  baselinePath: BaselinePath
  knownLifts: KnownLiftEntry[]
}) {
  // Just-uploaded/manual InBody data (inbodyOverride) takes priority over the
  // stored inbody_logs row for the clinical fields. Segmental balance (lean_*)
  // is never collected by InBodyUpload, so it always comes from history —
  // Odin's InBody schema is strict and requires a fully complete object.
  const bodyFatPct = inbodyOverride?.body_fat_pct ?? latestInbody?.body_fat_pct ?? null
  const smmKg = inbodyOverride?.skeletal_muscle_mass ?? latestInbody?.skeletal_muscle_mass ?? null
  const bmrVal = inbodyOverride?.bmr ?? latestInbody?.bmr ?? null
  const visceralFatArea =
    inbodyOverride?.visceral_fat_area ?? latestInbody?.visceral_fat_area ?? null

  let inbody: {
    body_fat_pct: number
    smm_kg: number
    bmr: number
    visceral_fat_area: number
    segmental_balance: {
      left_arm: number
      right_arm: number
      left_leg: number
      right_leg: number
      trunk: number
    }
  } | null = null

  if (
    bodyFatPct != null &&
    smmKg != null &&
    bmrVal != null &&
    visceralFatArea != null &&
    latestInbody?.lean_left_arm != null &&
    latestInbody?.lean_right_arm != null &&
    latestInbody?.lean_left_leg != null &&
    latestInbody?.lean_right_leg != null &&
    latestInbody?.lean_trunk != null
  ) {
    inbody = {
      body_fat_pct: bodyFatPct,
      smm_kg: smmKg,
      bmr: bmrVal,
      visceral_fat_area: visceralFatArea,
      segmental_balance: {
        left_arm: latestInbody.lean_left_arm,
        right_arm: latestInbody.lean_right_arm,
        left_leg: latestInbody.lean_left_leg,
        right_leg: latestInbody.lean_right_leg,
        trunk: latestInbody.lean_trunk,
      },
    }
  }

  const rawGoal = health.goal ?? 'fat_loss'
  const odinGoal = GOAL_MAP[rawGoal] ?? rawGoal

  const rawEquip = health.equipment ?? 'full_gym'
  const odinEquip = EQUIPMENT_MAP[rawEquip] ?? rawEquip

  const currentWeight = profile.current_weight_kg ?? 70
  const targetWeight =
    profile.target_weight_kg ??
    (targetWeightKg ? parseFloat(targetWeightKg) : null) ??
    currentWeight

  // Prefer the structured injuries_v2 (real modify/avoid choice, from the v3
  // onboarding wizard) over the legacy bare-area-name injuries[] column,
  // which always defaulted every entry to 'modify'.
  const injuries =
    health.injuries_v2 && health.injuries_v2.length > 0
      ? health.injuries_v2.map((i) => ({
          area: i.area,
          severity: i.modification ?? 'modify',
          notes: i.notes ?? '',
        }))
      : (health.injuries ?? []).map((area) => ({
          area,
          severity: 'modify' as const,
          notes: '',
        }))

  // Odin v2 keeps `goal` as the flat mapped string and carries the typed
  // sub-fields separately in `goal_parameters` (see agent-odin GoalParametersV2Schema).
  const goalParameters: Record<string, number | string> = {}
  const currentBodyFatPct = parseOptionalNumber(goalRefine.current_body_fat_pct)
  if (currentBodyFatPct !== null) goalParameters.current_body_fat_pct = currentBodyFatPct
  const targetBodyFatPct = parseOptionalNumber(goalRefine.target_body_fat_pct)
  if (targetBodyFatPct !== null) goalParameters.target_body_fat_pct = targetBodyFatPct
  const targetMuscleGainKg = parseOptionalNumber(goalRefine.target_muscle_gain_kg)
  if (targetMuscleGainKg !== null) goalParameters.target_muscle_gain_kg = targetMuscleGainKg
  const timeframeWeeks = parseOptionalNumber(goalRefine.timeframe_weeks)
  if (timeframeWeeks !== null) goalParameters.timeframe_weeks = Math.round(timeframeWeeks)
  if (goalRefine.primary_lift) goalParameters.primary_lift = goalRefine.primary_lift
  const current1rmKg = parseOptionalNumber(goalRefine.current_1rm_kg)
  if (current1rmKg !== null) goalParameters.current_1rm_kg = current1rmKg
  const target1rmKg = parseOptionalNumber(goalRefine.target_1rm_kg)
  if (target1rmKg !== null) goalParameters.target_1rm_kg = target1rmKg
  if (goalRefine.endurance_focus) goalParameters.endurance_focus = goalRefine.endurance_focus

  const knownLiftsPayload =
    baselinePath === 'self_reported'
      ? knownLifts
          .filter((l) => l.weight_kg.trim() && l.reps.trim())
          .map((l) => ({
            exercise_id: l.exercise_id,
            weight_kg: parseFloat(l.weight_kg),
            reps: parseInt(l.reps, 10),
          }))
      : []
  // Odin rejects baseline_path: 'self_reported' with an empty known_lifts array
  // (see agent-odin AthleteInputV2Schema superRefine), so fall back to 'skipped'
  // if nothing valid was actually entered.
  const effectiveBaselinePath =
    baselinePath === 'self_reported' && knownLiftsPayload.length === 0 ? 'skipped' : baselinePath

  return {
    name: profile.full_name ?? 'Athlete',
    age: calcAge(profile.date_of_birth),
    sex: profile.gender === 'female' ? ('female' as const) : ('male' as const),
    current_weight_kg: currentWeight,
    target_weight_kg: targetWeight,
    height_cm: profile.height_cm ?? 170,
    goal: odinGoal,
    available_days_per_week: health.available_days_per_week ?? 4,
    session_duration_min: health.session_duration_min ?? 60,
    equipment: odinEquip,
    fitness_level: health.fitness_level ?? 'beginner',
    injuries,
    inbody,
    // Odin nests this under `schedule` (see agent-odin ScheduleSchema), not top-level.
    ...(health.preferred_workout_time
      ? { schedule: { preferred_workout_time: health.preferred_workout_time } }
      : {}),
    ...(Object.keys(goalParameters).length > 0 ? { goal_parameters: goalParameters } : {}),
    baseline_path: effectiveBaselinePath,
    known_lifts: knownLiftsPayload,
  }
}

export interface GenerateResult {
  odinResult: unknown
  goal: string
  equipment: string
  startDate: string
}

interface GenerateProgrammeViewProps {
  onSuccess: (result: GenerateResult) => void
}

export default function GenerateProgrammeView({ onSuccess }: GenerateProgrammeViewProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const {
    generate,
    loading: generating,
    status: genStatus,
    result,
    error,
    reset,
  } = useOdinGenerate()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [health, setHealth] = useState<UserHealth | null>(null)
  const [latestInbody, setLatestInbody] = useState<LatestInbodyRow | null>(null)
  const [isInbodyRecent, setIsInbodyRecent] = useState(false)
  const [inbodyOverride, setInbodyOverride] = useState<InBodyData | null>(null)
  const [loadingData, setLoadingData] = useState(true)

  const [startDate, setStartDate] = useState(() => toDateStr(new Date()))
  const [targetWeightKg, setTargetWeightKg] = useState('')
  const [goalRefine, setGoalRefine] = useState<GoalRefineForm>(EMPTY_GOAL_REFINE)

  const updateGoalRefine = useCallback(
    <K extends keyof GoalRefineForm>(key: K, value: GoalRefineForm[K]) => {
      setGoalRefine((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  const [baselinePath, setBaselinePath] = useState<BaselinePath>('skipped')
  const [knownLifts, setKnownLifts] = useState<KnownLiftEntry[]>([])
  const [liftEntryExercise, setLiftEntryExercise] = useState<KnownLiftExerciseId>('squat')
  const [liftEntryWeight, setLiftEntryWeight] = useState('')
  const [liftEntryReps, setLiftEntryReps] = useState('')

  const addKnownLift = useCallback(() => {
    if (!liftEntryWeight.trim() || !liftEntryReps.trim()) return
    setKnownLifts((prev) => [
      ...prev,
      { exercise_id: liftEntryExercise, weight_kg: liftEntryWeight, reps: liftEntryReps },
    ])
    setLiftEntryWeight('')
    setLiftEntryReps('')
  }, [liftEntryExercise, liftEntryWeight, liftEntryReps])

  const removeKnownLift = useCallback((index: number) => {
    setKnownLifts((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // ── Load profile + health on mount ──
  useEffect(() => {
    if (!user) return
    let cancelled = false

    const load = async () => {
      const [profileRes, healthRes, inbodyRes] = await Promise.all([
        supabase
          .from('user_profiles')
          .select(
            'full_name, date_of_birth, gender, height_cm, current_weight_kg, target_weight_kg'
          )
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('user_health')
          .select(
            'fitness_level, goal, available_days_per_week, session_duration_min, equipment, injuries, injuries_v2, preferred_workout_time'
          )
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('inbody_logs')
          .select(
            'body_fat_pct, skeletal_muscle_mass, body_fat_mass, bmr, visceral_fat_level, visceral_fat_area, total_body_water, date, lean_left_arm, lean_right_arm, lean_left_leg, lean_right_leg, lean_trunk'
          )
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      if (cancelled) return

      const inbody = inbodyRes.data ?? null
      setProfile(profileRes.data ?? null)
      setHealth((healthRes.data as unknown as UserHealth | null) ?? null)
      setLatestInbody(inbody)
      // "Recent" is time-of-fetch relative, so it belongs in this effect
      // (an external-system read) rather than in a render-time calculation.
      setIsInbodyRecent(
        !!inbody &&
          Date.now() - new Date(inbody.date + 'T00:00:00').getTime() <=
            INBODY_RECENT_DAYS * 24 * 60 * 60 * 1000
      )
      setLoadingData(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [user])

  // ── Forward result to parent on success ──
  useEffect(() => {
    if (result && health) {
      onSuccess({
        odinResult: result,
        goal: health.goal ?? 'general_fitness',
        equipment: health.equipment ?? 'full_gym',
        startDate,
      })
    }
  }, [result, health, startDate, onSuccess])

  const handleGenerate = useCallback(async () => {
    if (!profile || !health || !user) return
    await generate(
      buildAthletePayload({
        profile,
        health,
        latestInbody,
        inbodyOverride,
        targetWeightKg,
        goalRefine,
        baselinePath,
        knownLifts,
      })
    )
  }, [
    profile,
    health,
    user,
    latestInbody,
    inbodyOverride,
    targetWeightKg,
    goalRefine,
    baselinePath,
    knownLifts,
    generate,
  ])

  // ── Auto-trigger generation when arriving straight from onboarding Step 3 ──
  // OnboardingWizard stashes the goal sub-fields / baseline strength it collected
  // (never written to Supabase) under this key before navigating here, so the
  // user isn't asked to re-enter data they just gave. Builds the payload directly
  // from the parsed sessionStorage data (rather than routing through goalRefine/
  // baselinePath state + handleGenerate) so generation can fire immediately
  // without waiting a render for state to commit.
  const autoGenerateAppliedRef = useRef(false)

  useEffect(() => {
    if (autoGenerateAppliedRef.current) return
    if (loadingData || !profile || !health) return

    const raw = sessionStorage.getItem(ONBOARDING_PAYLOAD_KEY)
    if (!raw) return

    autoGenerateAppliedRef.current = true
    sessionStorage.removeItem(ONBOARDING_PAYLOAD_KEY)

    const applyAndGenerate = async () => {
      try {
        const payload = JSON.parse(raw) as {
          goalRefine: GoalRefineForm
          baselinePath: BaselinePath
          knownLifts: KnownLiftEntry[]
        }
        setGoalRefine(payload.goalRefine)
        setBaselinePath(payload.baselinePath)
        setKnownLifts(payload.knownLifts)
        await generate(
          buildAthletePayload({
            profile,
            health,
            latestInbody,
            inbodyOverride,
            targetWeightKg,
            goalRefine: payload.goalRefine,
            baselinePath: payload.baselinePath,
            knownLifts: payload.knownLifts,
          })
        )
      } catch {
        // Malformed/stale payload — fall back to the normal manual-generate form.
      }
    }

    void applyAndGenerate()
  }, [loadingData, profile, health, latestInbody, inbodyOverride, targetWeightKg, generate])

  // ════════════════════════════════════════
  // B — Generating state
  // ════════════════════════════════════════
  if (generating) {
    return <AiGeneratingScreen genStatus={genStatus} />
  }

  // ════════════════════════════════════════
  // Loading data
  // ════════════════════════════════════════
  if (loadingData) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={32} color={colors.accent} className="animate-spin" />
      </div>
    )
  }

  // ════════════════════════════════════════
  // A — Form state
  // ════════════════════════════════════════
  const todayStr = toDateStr(new Date())
  const showTargetWeight = !profile?.target_weight_kg
  const rawGoal = health?.goal ?? null
  const bucket = goalBucket(rawGoal)
  const strengthMissingLift = bucket === 'strength' && !goalRefine.primary_lift

  const existingInbodyData: InBodyData | null =
    latestInbody && isInbodyRecent
      ? {
          body_fat_pct: latestInbody.body_fat_pct,
          skeletal_muscle_mass: latestInbody.skeletal_muscle_mass,
          body_fat_mass: latestInbody.body_fat_mass,
          bmr: latestInbody.bmr,
          visceral_fat_level: latestInbody.visceral_fat_level,
          visceral_fat_area: latestInbody.visceral_fat_area,
          total_body_water: latestInbody.total_body_water,
          date: latestInbody.date,
        }
      : null

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-32">
      {/* Profile card */}
      {profile && health && (
        <ProfileCard
          profile={profile}
          health={health}
          onEdit={() => void navigate('/onboarding?step=1')}
        />
      )}

      {/* InBody Upload */}
      {health && <InBodyUpload onResult={setInbodyOverride} existingData={existingInbodyData} />}

      {/* Refine Your Goal */}
      {health && bucket && (
        <div className="mt-5 mb-1">
          <div className="flex items-center justify-between mb-2">
            <SectionLabel label="GOAL" />
            <button
              onClick={() => void navigate('/onboarding?step=3')}
              className="text-[12px] font-['DM_Sans'] font-semibold active:opacity-60"
              style={{
                color: colors.accent,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Change
            </button>
          </div>
          <div
            className="h-[48px] flex items-center px-[14px] mb-4 text-[15px] font-['DM_Sans']"
            style={{
              background: colors.surface2,
              border: `1.5px solid ${colors.border}`,
              borderRadius: radius.input,
              color: colors.text,
            }}
          >
            {GOAL_LABELS[rawGoal ?? ''] ?? rawGoal}
          </div>

          {bucket === 'fat_loss' && (
            <>
              <GoalNumberField
                label="CURRENT BODY FAT % (OPTIONAL)"
                hint="Leave blank if unknown. Upload an InBody report for accuracy."
                value={goalRefine.current_body_fat_pct}
                onChange={(v) => updateGoalRefine('current_body_fat_pct', v)}
                min={3}
                max={60}
              />
              <GoalNumberField
                label="TARGET BODY FAT % (OPTIONAL)"
                value={goalRefine.target_body_fat_pct}
                onChange={(v) => updateGoalRefine('target_body_fat_pct', v)}
                min={3}
                max={60}
              />
              <GoalNumberField
                label="TARGET TIMEFRAME (WEEKS) (OPTIONAL)"
                value={goalRefine.timeframe_weeks}
                onChange={(v) => updateGoalRefine('timeframe_weeks', v)}
                min={8}
                max={52}
              />
            </>
          )}

          {bucket === 'muscle_gain' && (
            <>
              <GoalNumberField
                label="TARGET MUSCLE GAIN (KG) (OPTIONAL)"
                value={goalRefine.target_muscle_gain_kg}
                onChange={(v) => updateGoalRefine('target_muscle_gain_kg', v)}
                min={0.5}
                max={20}
              />
              <GoalNumberField
                label="TARGET TIMEFRAME (WEEKS) (OPTIONAL)"
                value={goalRefine.timeframe_weeks}
                onChange={(v) => updateGoalRefine('timeframe_weeks', v)}
                min={8}
                max={52}
              />
            </>
          )}

          {bucket === 'strength' && (
            <>
              <GoalPillRow
                label="PRIMARY LIFT"
                options={PRIMARY_LIFT_OPTIONS}
                value={goalRefine.primary_lift}
                onChange={(v) => updateGoalRefine('primary_lift', v)}
                {...(strengthMissingLift ? { errorText: 'Select a primary lift to continue' } : {})}
              />
              <GoalNumberField
                label="CURRENT 1RM (KG) (OPTIONAL)"
                value={goalRefine.current_1rm_kg}
                onChange={(v) => updateGoalRefine('current_1rm_kg', v)}
                min={0}
                max={500}
              />
              <GoalNumberField
                label="TARGET 1RM (KG) (OPTIONAL)"
                value={goalRefine.target_1rm_kg}
                onChange={(v) => updateGoalRefine('target_1rm_kg', v)}
                min={0}
                max={500}
              />
              <GoalNumberField
                label="TARGET TIMEFRAME (WEEKS) (OPTIONAL)"
                value={goalRefine.timeframe_weeks}
                onChange={(v) => updateGoalRefine('timeframe_weeks', v)}
                min={8}
                max={52}
              />
            </>
          )}

          {bucket === 'recomposition' && (
            <>
              <GoalNumberField
                label="CURRENT BODY FAT % (OPTIONAL)"
                value={goalRefine.current_body_fat_pct}
                onChange={(v) => updateGoalRefine('current_body_fat_pct', v)}
                min={3}
                max={60}
              />
              <GoalNumberField
                label="TARGET BODY FAT % (OPTIONAL)"
                value={goalRefine.target_body_fat_pct}
                onChange={(v) => updateGoalRefine('target_body_fat_pct', v)}
                min={3}
                max={60}
              />
              <GoalNumberField
                label="TARGET MUSCLE GAIN (KG) (OPTIONAL)"
                value={goalRefine.target_muscle_gain_kg}
                onChange={(v) => updateGoalRefine('target_muscle_gain_kg', v)}
                min={0.5}
                max={20}
              />
              <GoalNumberField
                label="TARGET TIMEFRAME (WEEKS) (OPTIONAL)"
                value={goalRefine.timeframe_weeks}
                onChange={(v) => updateGoalRefine('timeframe_weeks', v)}
                min={8}
                max={52}
              />
            </>
          )}

          {bucket === 'general_fitness' && (
            <GoalPillRow
              label="FOCUS (OPTIONAL)"
              options={ENDURANCE_FOCUS_OPTIONS}
              value={goalRefine.endurance_focus}
              onChange={(v) => updateGoalRefine('endurance_focus', v)}
            />
          )}
        </div>
      )}

      {/* Baseline Strength (optional) */}
      {health && (
        <div className="mb-5">
          <GoalPillRow
            label="BASELINE STRENGTH (OPTIONAL)"
            options={BASELINE_PATH_OPTIONS}
            value={baselinePath}
            onChange={(v) => setBaselinePath(v || 'skipped')}
          />

          {baselinePath === 'self_reported' && (
            <div className="mb-4">
              <SectionLabel label="ADD A KNOWN LIFT" className="mb-2" />
              <div className="flex gap-2 flex-wrap mb-2">
                {KNOWN_LIFT_EXERCISE_OPTIONS.map((opt) => {
                  const active = liftEntryExercise === opt.value
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setLiftEntryExercise(opt.value)}
                      className="flex-1 py-2.5 text-[12px] font-['DM_Sans'] font-medium tracking-[0.3px] transition-all duration-150 active:scale-[0.96]"
                      style={{
                        borderRadius: radius.button,
                        border: `1.5px solid ${active ? colors.accent : colors.border}`,
                        background: active ? colors.accentMuted : colors.surface2,
                        color: active ? colors.accent : colors.muted,
                        cursor: 'pointer',
                      }}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min={0}
                  value={liftEntryWeight}
                  onChange={(e) => setLiftEntryWeight(e.target.value)}
                  placeholder="Weight (kg)"
                  className="flex-1 h-[48px] px-[14px] text-[#f0ede8] text-[14px] font-['DM_Sans'] placeholder:text-[#444444]"
                  style={{
                    background: colors.surface2,
                    border: `1.5px solid ${colors.border}`,
                    borderRadius: radius.input,
                  }}
                />
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={12}
                  value={liftEntryReps}
                  onChange={(e) => setLiftEntryReps(e.target.value)}
                  placeholder="Reps"
                  className="w-[80px] h-[48px] px-[14px] text-[#f0ede8] text-[14px] font-['DM_Sans'] placeholder:text-[#444444]"
                  style={{
                    background: colors.surface2,
                    border: `1.5px solid ${colors.border}`,
                    borderRadius: radius.input,
                  }}
                />
                <button
                  onClick={addKnownLift}
                  disabled={!liftEntryWeight.trim() || !liftEntryReps.trim()}
                  className="h-[48px] px-4 text-[13px] font-['DM_Sans'] font-semibold active:scale-[0.95] transition-transform"
                  style={{
                    borderRadius: radius.input,
                    background:
                      liftEntryWeight.trim() && liftEntryReps.trim()
                        ? colors.accent
                        : colors.surface3,
                    color: liftEntryWeight.trim() && liftEntryReps.trim() ? '#fff' : colors.muted,
                    border: 'none',
                    cursor: liftEntryWeight.trim() && liftEntryReps.trim() ? 'pointer' : 'default',
                  }}
                >
                  Add
                </button>
              </div>

              {knownLifts.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {knownLifts.map((lift, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-['DM_Sans'] font-medium"
                      style={{
                        background: colors.surface2,
                        border: `1px solid ${colors.border}`,
                        borderRadius: radius.chip,
                        color: colors.text,
                      }}
                    >
                      {KNOWN_LIFT_EXERCISE_LABELS[lift.exercise_id]} — {lift.weight_kg}kg ×{' '}
                      {lift.reps}
                      <button
                        onClick={() => removeKnownLift(i)}
                        className="active:opacity-60"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          lineHeight: 1,
                        }}
                        aria-label={`Remove ${KNOWN_LIFT_EXERCISE_LABELS[lift.exercise_id]}`}
                      >
                        <X size={12} color={colors.muted} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <h2 className="font-['Bebas_Neue'] text-[22px] tracking-[2px] text-[#f0ede8] mt-5 mb-1">
        GENERATE PROGRAMME
      </h2>
      <p className="text-[13px] font-['DM_Sans'] mb-5" style={{ color: colors.muted }}>
        We'll build a personalised training plan using your profile.
      </p>

      {/* Start Date */}
      <div className="mb-5">
        <SectionLabel label="PROGRAMME START DATE" className="mb-2" />
        <input
          type="date"
          value={startDate}
          min={todayStr}
          onChange={(e) => setStartDate(e.target.value)}
          className="h-[52px] w-full px-[14px] text-[#f0ede8] text-[16px] font-['DM_Sans']"
          style={{
            background: colors.surface2,
            border: `1.5px solid ${colors.border}`,
            borderRadius: radius.input,
            colorScheme: 'dark',
          }}
        />
      </div>

      {/* Target Weight (only if missing from profile) */}
      {showTargetWeight && (
        <div className="mb-5">
          <SectionLabel label="TARGET WEIGHT KG (OPTIONAL)" className="mb-2" />
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={targetWeightKg}
            onChange={(e) => setTargetWeightKg(e.target.value)}
            placeholder="70"
            className="h-[52px] w-full px-[14px] text-[#f0ede8] text-[16px] font-['DM_Sans'] placeholder:text-[#444444]"
            style={{
              background: colors.surface2,
              border: `1.5px solid ${colors.border}`,
              borderRadius: radius.input,
            }}
          />
        </div>
      )}

      {/* Error card */}
      {error && (
        <div
          className="mb-5 p-4 flex items-start gap-3"
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: `1px solid ${colors.error}`,
            borderRadius: 12,
          }}
        >
          <AlertCircle size={20} color={colors.error} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[13px] font-['DM_Sans']" style={{ color: colors.error }}>
              {error}
            </p>
            <button
              onClick={reset}
              className="text-[13px] font-['DM_Sans'] font-semibold mt-2 active:opacity-60"
              style={{
                color: colors.accent,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* CTA */}
      <div
        className="fixed bottom-[76px] left-0 right-0 px-4 pt-3"
        style={{
          background: `linear-gradient(transparent, ${colors.bg} 20%)`,
          paddingBottom: 16,
        }}
      >
        <button
          onClick={() => void handleGenerate()}
          disabled={generating || !profile || !health || strengthMissingLift}
          className="w-full py-4 font-['Bebas_Neue'] text-[18px] tracking-[2px] transition-all duration-150 active:scale-[0.98]"
          style={{
            borderRadius: radius.button,
            background: profile && health && !strengthMissingLift ? colors.accent : colors.surface3,
            color: profile && health && !strengthMissingLift ? '#fff' : colors.muted,
            border: 'none',
            cursor: profile && health && !strengthMissingLift ? 'pointer' : 'default',
          }}
        >
          GENERATE MY PROGRAMME
        </button>
      </div>
    </div>
  )
}
