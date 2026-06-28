import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'
import { useOdinGenerate } from '../../hooks/useOdinGenerate'
import { colors, radius } from '../../styles/tokens'
import { SectionLabel } from '../../components/ui'
import { toDateStr } from '../../utils/programme'
import { AlertCircle, Loader2, Pencil } from 'lucide-react'

// ── Display label maps ──
const GOAL_LABELS: Record<string, string> = {
  fat_loss: 'Fat Loss',
  muscle_gain: 'Muscle Gain',
  strength: 'Strength',
  general_fitness: 'General Fitness',
}

const EQUIPMENT_LABELS: Record<string, string> = {
  full_gym: 'Full Gym',
  dumbbells_only: 'Dumbbells Only',
  bodyweight_only: 'Bodyweight Only',
  home_gym: 'Home Gym',
}

const STATUS_MESSAGES = [
  'Analysing your profile…',
  'Building your training strategy…',
  'Sequencing phases and sessions…',
  'Validating your programme…',
]

interface UserProfile {
  full_name: string | null
  age: number | null
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
  const { generate, loading: generating, result, error, reset } = useOdinGenerate()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [health, setHealth] = useState<UserHealth | null>(null)
  const [loadingData, setLoadingData] = useState(true)

  const [startDate, setStartDate] = useState(() => toDateStr(new Date()))
  const [targetWeightKg, setTargetWeightKg] = useState('')

  const [statusIndex, setStatusIndex] = useState(0)

  // ── Load profile + health on mount ──
  useEffect(() => {
    if (!user) return
    let cancelled = false

    const load = async () => {
      const [profileRes, healthRes] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('full_name, age, gender, height_cm, current_weight_kg, target_weight_kg')
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

  // ── Rotate status messages while generating ──
  useEffect(() => {
    if (!generating) return
    const interval = setInterval(() => {
      setStatusIndex((prev) => Math.min(prev + 1, STATUS_MESSAGES.length - 1))
    }, 10000)
    return () => clearInterval(interval)
  }, [generating])

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
    setStatusIndex(0)

    const payload = {
      athlete: {
        name: profile.full_name ?? 'Athlete',
        age: profile.age ?? 25,
        sex: profile.gender === 'female' ? 'female' : 'male',
        current_weight_kg: profile.current_weight_kg ?? 70,
        target_weight_kg:
          profile.target_weight_kg ?? (targetWeightKg ? parseFloat(targetWeightKg) : null),
        height_cm: profile.height_cm ?? 170,
        goal: health.goal ?? 'general_fitness',
        available_days_per_week: health.available_days_per_week ?? 4,
        session_duration_min: health.session_duration_min ?? 60,
        equipment: health.equipment ?? 'full_gym',
        fitness_level: health.fitness_level ?? 'beginner',
        injuries: health.injuries ?? [],
        inbody: null,
      },
      planner_version: 'ai_agent_v1',
      start_date: startDate,
    }

    await generate(payload)
  }, [profile, health, targetWeightKg, startDate, generate])

  // ════════════════════════════════════════
  // B — Generating state
  // ════════════════════════════════════════
  if (generating) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center px-8"
        style={{ background: colors.bg }}
      >
        <div className="relative w-16 h-16 mb-8">
          <div
            className="absolute inset-0 rounded-full animate-ping"
            style={{ background: colors.accentMuted, animationDuration: '2s' }}
          />
          <div
            className="absolute inset-0 rounded-full flex items-center justify-center"
            style={{ background: colors.surface, border: `2px solid ${colors.accent}` }}
          >
            <span
              className="font-['Bebas_Neue'] text-[18px] tracking-[2px]"
              style={{ color: colors.accent }}
            >
              Gx
            </span>
          </div>
        </div>
        <h2 className="font-['Bebas_Neue'] text-[22px] tracking-[2px] text-[#f0ede8] mb-3 text-center">
          GENERATING YOUR PROGRAMME
        </h2>
        <p
          className="text-[14px] font-['DM_Sans'] text-center transition-opacity duration-500"
          style={{ color: colors.muted }}
          key={statusIndex}
        >
          {STATUS_MESSAGES[statusIndex]}
        </p>
      </div>
    )
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
            {profile.full_name ?? 'Athlete'} · {profile.age}y ·{' '}
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
