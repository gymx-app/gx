import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'
import { useOdinGenerate } from '../../hooks/useOdinGenerate'
import { colors, radius } from '../../styles/tokens'
import { SectionLabel } from '../../components/ui'
import { getISTTodayStr } from '../../utils/dateUtils'
import { AlertCircle, Loader2, WifiOff } from 'lucide-react'
import { ProfileCard } from '../../components/programme/ProfileCard'
import type { UserProfile, UserHealth } from '../../components/programme/ProfileCard'
import {
  buildReturningUserOdinPayload,
  type ReturningUserHealth,
  type ReturningUserProfile,
} from './buildReturningUserOdinPayload'
import type { InBodySourceData } from '../../utils/odinMappers'

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

  useEffect(() => {
    const interval = setInterval(() => {
      setLineIdx((i) => (i + 1) % lines.length)
    }, 1800)
    return () => clearInterval(interval)
  }, [isBuilding, lines.length])

  return (
    <div
      className="flex-1 flex flex-col items-center justify-between px-6"
      style={{ background: colors.bg, paddingTop: 64, paddingBottom: 56 }}
    >
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

      <div className="flex flex-col items-center">
        <div className="relative w-[160px] h-[160px] mb-10">
          <div
            className="absolute inset-0 rounded-full"
            style={{ border: `1px solid ${colors.accent}33`, animation: 'spin 8s linear infinite' }}
          />
          <div
            className="absolute inset-[16px] rounded-full"
            style={{
              border: `1px dashed ${colors.accent}55`,
              animation: 'spin 5s linear infinite reverse',
            }}
          />
          <div
            className="absolute inset-[32px] rounded-full"
            style={{
              border: `1.5px solid ${colors.accent}99`,
              animation: 'spin 3s linear infinite',
            }}
          />
          <div
            className="absolute inset-[44px] rounded-full animate-ping"
            style={{ background: colors.accentMuted, animationDuration: '2.4s' }}
          />
          <div
            className="absolute inset-[44px] rounded-full flex items-center justify-center"
            style={{ background: colors.surface, border: `2px solid ${colors.accent}` }}
          >
            <span
              className="font-['Bebas_Neue'] text-[22px] tracking-[3px]"
              style={{ color: colors.accent }}
            >
              AI
            </span>
          </div>
        </div>

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

// Returning-user generate view (Programme tab, no_programme state). InBody
// upload, goal precision, and baseline strength are all collected once at
// onboarding and persisted to user_health — this view only ever reads them.
export default function GenerateProgrammeView({ onSuccess }: GenerateProgrammeViewProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { generate, loading: generating, status: genStatus, errorType, reset } = useOdinGenerate()
  const [error, setError] = useState<string | null>(null)

  const [profile, setProfile] = useState<(UserProfile & ReturningUserProfile) | null>(null)
  const [health, setHealth] = useState<(UserHealth & ReturningUserHealth) | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [startDate, setStartDate] = useState(getISTTodayStr())

  const [inbody, setInbody] = useState<InBodySourceData | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    const load = async () => {
      const [profileRes, healthRes, inbodyRes] = await Promise.all([
        supabase
          .from('user_profiles')
          .select(
            'full_name, date_of_birth, gender, height_cm, current_weight_kg, target_weight_kg, nationality'
          )
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('user_health')
          .select(
            'fitness_level, goal, available_days_per_week, session_duration_min, equipment, injuries, injuries_v2, preferred_workout_time, lifestyle, occupation, medical_conditions, goal_sub_fields, baseline_path, known_lifts, target_body_fat_pct, target_timeframe_weeks, body_fat_pct'
          )
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('inbody_logs')
          .select(
            'body_fat_pct, skeletal_muscle_mass, body_fat_mass, bmr, visceral_fat_area, total_body_water'
          )
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      if (cancelled) return
      setProfile(profileRes.data ?? null)
      setHealth((healthRes.data as unknown as (UserHealth & ReturningUserHealth) | null) ?? null)
      setInbody(inbodyRes.data ?? null)
      setLoadingData(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [user])

  const handleGenerate = async () => {
    if (!profile || !health) return
    setError(null)
    const payload = buildReturningUserOdinPayload(profile, health, profile.target_weight_kg, inbody)
    const outcome = await generate(payload)
    if (outcome.success) {
      onSuccess({
        odinResult: outcome.result,
        goal: health.goal ?? 'general_fitness',
        equipment: health.equipment ?? 'full_gym',
        startDate,
      })
    } else {
      setError(outcome.error ?? 'Generation failed.')
    }
  }

  if (generating) {
    return <AiGeneratingScreen genStatus={genStatus} />
  }

  if (loadingData) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={32} color={colors.accent} className="animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-32">
      {profile && health && (
        <ProfileCard
          profile={profile}
          health={health}
          onEdit={() => void navigate('/onboarding?step=1')}
        />
      )}

      <h2 className="font-['Bebas_Neue'] text-[22px] tracking-[2px] text-[#f0ede8] mt-5 mb-1">
        GENERATE PROGRAMME
      </h2>
      <p className="text-[13px] font-['DM_Sans'] mb-5" style={{ color: colors.muted }}>
        We'll build a personalised training plan using your profile.
      </p>

      <div className="mb-5">
        <SectionLabel label="PROGRAMME START DATE" className="mb-2" />
        <input
          type="date"
          value={startDate}
          min={getISTTodayStr()}
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

      {errorType === 'API_ERROR' && (
        <div
          className="mb-5 p-4 flex items-start gap-3"
          style={{
            background: colors.surface2,
            border: `1px solid ${colors.border}`,
            borderRadius: 12,
          }}
        >
          <WifiOff size={20} color={colors.muted} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[13px] font-['DM_Sans'] font-medium" style={{ color: colors.text }}>
              Generation failed
            </p>
            <p className="text-[12px] font-['DM_Sans'] mt-0.5" style={{ color: colors.muted }}>
              Something went wrong on our end. Your profile is saved — tap to try again.
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

      {errorType === 'VALIDATION_ERROR' && (
        <div
          className="mb-5 p-4 flex items-start gap-3"
          style={{ background: colors.surface2, border: `1px solid #7f1d1d`, borderRadius: 12 }}
        >
          <AlertCircle size={20} color={colors.error} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[13px] font-['DM_Sans'] font-medium" style={{ color: colors.text }}>
              We need one more thing
            </p>
            <p className="text-[12px] font-['DM_Sans'] mt-0.5" style={{ color: colors.muted }}>
              {error}
            </p>
            <button
              onClick={() => void navigate('/account')}
              className="text-[13px] font-['DM_Sans'] font-semibold mt-2 active:opacity-60"
              style={{
                color: colors.accent,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Fix this →
            </button>
          </div>
        </div>
      )}

      <div
        className="fixed bottom-[76px] left-0 right-0 px-4 pt-3"
        style={{ background: `linear-gradient(transparent, ${colors.bg} 20%)`, paddingBottom: 16 }}
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
