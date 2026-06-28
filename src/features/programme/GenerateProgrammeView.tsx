import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'
import { useOdinGenerate } from '../../hooks/useOdinGenerate'
import { colors, radius } from '../../styles/tokens'
import { SectionLabel } from '../../components/ui'
import { toDateStr } from '../../utils/programme'
import { AlertCircle, Loader2, Pencil } from 'lucide-react'

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

// ── Display label maps ──
const GOAL_LABELS: Record<string, string> = {
  fat_loss: 'Fat Loss',
  muscle_gain: 'Muscle Gain',
  recomposition: 'Body Recomposition',
  strength: 'Strength',
  endurance: 'Endurance',
  general_fitness: 'General Fitness',
  body_recomposition: 'Body Recomposition',
}

const EQUIPMENT_LABELS: Record<string, string> = {
  full_gym: 'Full Gym',
  dumbbells_only: 'Dumbbells Only',
  bodyweight: 'Bodyweight Only',
  bodyweight_only: 'Bodyweight Only',
  home_gym: 'Home Gym',
}

// Map onboarding values → Odin enum values
const GOAL_MAP: Record<string, string> = {
  body_recomposition: 'recomposition',
  general_fitness: 'fat_loss',
  maintenance: 'fat_loss',
}

const EQUIPMENT_MAP: Record<string, string> = {
  bodyweight_only: 'bodyweight',
}

interface UserProfile {
  full_name: string | null
  date_of_birth: string | null
  gender: string | null
  height_cm: number | null
  current_weight_kg: number | null
  target_weight_kg: number | null
}

interface UserHealth {
  fitness_level: string | null
  goal: string | null
  available_days_per_week: number | null
  session_duration_min: number | null
  equipment: string | null
  injuries: string[] | null
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
  const [loadingData, setLoadingData] = useState(true)

  const [startDate, setStartDate] = useState(() => toDateStr(new Date()))
  const [targetWeightKg, setTargetWeightKg] = useState('')

  // ── Load profile + health on mount ──
  useEffect(() => {
    if (!user) return
    let cancelled = false

    const load = async () => {
      const [profileRes, healthRes] = await Promise.all([
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
            'fitness_level, goal, available_days_per_week, session_duration_min, equipment, injuries'
          )
          .eq('user_id', user.id)
          .maybeSingle(),
      ])

      if (cancelled) return

      setProfile(profileRes.data ?? null)
      setHealth(healthRes.data ?? null)
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
    if (!profile || !health) return

    const rawGoal = health.goal ?? 'fat_loss'
    const odinGoal = GOAL_MAP[rawGoal] ?? rawGoal

    const rawEquip = health.equipment ?? 'full_gym'
    const odinEquip = EQUIPMENT_MAP[rawEquip] ?? rawEquip

    const currentWeight = profile.current_weight_kg ?? 70
    const targetWeight =
      profile.target_weight_kg ??
      (targetWeightKg ? parseFloat(targetWeightKg) : null) ??
      currentWeight

    const injuries = (health.injuries ?? []).map((area) => ({
      area,
      severity: 'modify' as const,
      notes: '',
    }))

    const athlete = {
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
      inbody: null,
    }

    await generate(athlete)
  }, [profile, health, targetWeightKg, generate])

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

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-32">
      {/* Summary card */}
      {profile && health && (
        <div
          className="mt-3 p-4"
          style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 14,
          }}
        >
          <p
            className="text-[13px] font-['DM_Sans'] leading-relaxed"
            style={{ color: colors.textSecondary }}
          >
            {profile.full_name ?? 'Athlete'} · {calcAge(profile.date_of_birth)}y ·{' '}
            {profile.gender === 'female' ? 'Female' : 'Male'} ·{' '}
            {GOAL_LABELS[health.goal ?? ''] ?? health.goal} · {health.available_days_per_week}{' '}
            days/wk · {EQUIPMENT_LABELS[health.equipment ?? ''] ?? health.equipment}
          </p>
          <a
            href="/gx/onboarding?step=1"
            className="inline-flex items-center gap-1 mt-2 active:opacity-60"
            style={{ color: colors.accent, textDecoration: 'none' }}
          >
            <Pencil size={12} />
            <span className="text-[12px] font-['DM_Sans'] font-semibold">Edit Profile</span>
          </a>
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
          disabled={generating || !profile || !health}
          className="w-full py-4 font-['Bebas_Neue'] text-[18px] tracking-[2px] transition-all duration-150 active:scale-[0.98]"
          style={{
            borderRadius: radius.button,
            background: profile && health ? colors.accent : colors.surface3,
            color: profile && health ? '#fff' : colors.muted,
            border: 'none',
            cursor: profile && health ? 'pointer' : 'default',
          }}
        >
          GENERATE MY PROGRAMME
        </button>
      </div>
    </div>
  )
}
