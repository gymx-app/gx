import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/layout/TopBar'
import { colors, radius } from '../styles/tokens'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../lib/supabase'
import {
  getActiveProgramme,
  getProgrammePhases,
  getProgrammeDays,
  getProgrammeConfig,
  upsertProgrammeConfig,
} from '../services/programmeService'
import GenerateProgrammeView, {
  type GenerateResult,
} from '../features/programme/GenerateProgrammeView'
import ProgrammePreview from '../features/programme/ProgrammePreview'
import { ProfileCard } from '../components/programme/ProfileCard'
import type { UserProfile, UserHealth } from '../components/programme/ProfileCard'
import { Loader2, ChevronDown } from 'lucide-react'

type TabState = 'loading' | 'no_programme' | 'has_programme'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = any

const PHASE_ACCENT: Record<string, string> = {
  foundation: colors.blue,
  accumulation: colors.orange,
  intensification: colors.accent,
  realization: colors.purple,
  recovery: colors.success,
  maintenance: colors.muted,
}

function phaseColor(phase: AnyData): string {
  const t = (phase.name ?? '').toLowerCase()
  for (const [key, val] of Object.entries(PHASE_ACCENT)) {
    if (t.includes(key)) return val
  }
  return colors.accent
}

const DAY_TYPE_COLOR: Record<string, string> = {
  workout: colors.accent,
  liss: colors.blue,
  rest: colors.muted,
}

export default function Program() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [tabState, setTabState] = useState<TabState>('loading')
  const [activeProgramme, setActiveProgramme] = useState<AnyData>(null)
  const [phases, setPhases] = useState<AnyData[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [health, setHealth] = useState<UserHealth | null>(null)
  const [previewResult, setPreviewResult] = useState<GenerateResult | null>(null)
  const [openPhaseIdx, setOpenPhaseIdx] = useState<number | null>(null)
  const [phaseDays, setPhaseDays] = useState<Record<string, AnyData[]>>({})

  useEffect(() => {
    if (!user) return
    let cancelled = false

    const check = async () => {
      const { data } = await getActiveProgramme(user.id)
      if (cancelled) return

      if (data) {
        setActiveProgramme(data)

        const [phasesRes, profileRes, healthRes, cfgRes] = await Promise.all([
          getProgrammePhases((data as AnyData).id),
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
          getProgrammeConfig(user.id),
        ])

        if (cancelled) return

        const phaseData = phasesRes.data ?? []
        setPhases(phaseData)
        setProfile(profileRes.data ?? null)
        setHealth(healthRes.data ?? null)

        // Auto-repair programme_config if start_date is missing
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!(cfgRes.data as any)?.start_date && phaseData.length > 0) {
          const startDate =
            (data as AnyData).started_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)
          const phaseWeeks = phaseData.map((p: AnyData) => p.weeks_count ?? 4)
          await upsertProgrammeConfig(user.id, {
            start_date: startDate,
            phase_weeks: phaseWeeks.length ? phaseWeeks : [4],
          })
          // Bust caches so Today picks up the fix immediately
          const [idbCache, weekCache] = await Promise.all([
            import('../services/idbCache'),
            import('../services/weekCache'),
          ])
          void idbCache.invalidate('programme-config', user.id)
          void idbCache.invalidate('programme-context', user.id)
          weekCache.clearUserWeekCache(user.id)
        }

        setTabState('has_programme')
      } else {
        setTabState('no_programme')
      }
    }

    void check()
    return () => {
      cancelled = true
    }
  }, [user])

  const togglePhase = useCallback(
    async (idx: number, phase: AnyData) => {
      if (openPhaseIdx === idx) {
        setOpenPhaseIdx(null)
        return
      }
      setOpenPhaseIdx(idx)
      if (!phaseDays[phase.id]) {
        const { data } = await getProgrammeDays(phase.id)
        setPhaseDays((prev) => ({ ...prev, [phase.id]: data ?? [] }))
      }
    },
    [openPhaseIdx, phaseDays]
  )

  // ── Loading ──
  if (tabState === 'loading') {
    return (
      <>
        <TopBar title="PROGRAMME" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={32} color={colors.accent} className="animate-spin" />
        </div>
      </>
    )
  }

  // ── No programme: generate or preview ──
  if (tabState === 'no_programme') {
    if (previewResult) {
      return (
        <>
          <TopBar title="PROGRAMME" />
          <ProgrammePreview result={previewResult} onRegenerate={() => setPreviewResult(null)} />
        </>
      )
    }
    return (
      <>
        <TopBar title="PROGRAMME" />
        <GenerateProgrammeView onSuccess={(result) => setPreviewResult(result)} />
      </>
    )
  }

  // ── Has programme ──
  const totalWeeks = phases.reduce((s: number, p: AnyData) => s + (p.weeks_count ?? 0), 0)

  return (
    <>
      <TopBar title="PROGRAMME" />
      <div className="flex-1 overflow-y-auto pb-8 px-4 pt-4 space-y-4">
        {/* Profile card */}
        {profile && health && (
          <ProfileCard
            profile={profile}
            health={health}
            onEdit={() => void navigate('/onboarding?step=1')}
          />
        )}

        {/* Programme header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-[10px] font-['DM_Sans'] font-bold tracking-[2px] uppercase px-2 py-1"
              style={{
                background: colors.accentMuted,
                color: colors.accent,
                borderRadius: radius.pill,
              }}
            >
              Active
            </span>
            {totalWeeks > 0 && (
              <span
                className="text-[10px] font-['DM_Sans'] font-bold tracking-[2px] uppercase px-2 py-1"
                style={{
                  background: colors.surface2,
                  color: colors.textSecondary,
                  borderRadius: radius.pill,
                }}
              >
                {totalWeeks} weeks
              </span>
            )}
          </div>
          <h1
            className="font-['Bebas_Neue'] text-[26px] tracking-[2px] leading-none"
            style={{ color: colors.text }}
          >
            {activeProgramme?.name ?? 'My Programme'}
          </h1>
        </div>

        {/* Phase accordion */}
        <div className="space-y-2">
          {phases.map((phase: AnyData, pi: number) => {
            const accent = phaseColor(phase)
            const isOpen = openPhaseIdx === pi
            const days: AnyData[] = phaseDays[phase.id] ?? []

            return (
              <div
                key={pi}
                style={{
                  background: colors.surface,
                  border: `1px solid ${isOpen ? accent : colors.border}`,
                  borderRadius: radius.card,
                  overflow: 'hidden',
                  transition: 'border-color 0.2s',
                }}
              >
                {/* Phase header */}
                <button
                  onClick={() => void togglePhase(pi, phase)}
                  className="w-full flex items-center gap-3 p-4 active:opacity-70"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <div
                    className="flex-shrink-0 w-9 h-9 flex items-center justify-center"
                    style={{ background: `${accent}22`, borderRadius: '50%' }}
                  >
                    <span className="font-['Bebas_Neue'] text-[15px]" style={{ color: accent }}>
                      {pi + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p
                      className="font-['Bebas_Neue'] text-[16px] tracking-[1px] leading-none"
                      style={{ color: colors.text }}
                    >
                      {phase.name ?? `Phase ${pi + 1}`}
                    </p>
                    {phase.goal && (
                      <p
                        className="text-[12px] font-['DM_Sans'] mt-0.5 truncate"
                        style={{ color: colors.muted }}
                      >
                        {phase.goal}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {phase.weeks_count != null && (
                      <span
                        className="text-[11px] font-['DM_Sans'] font-medium px-2 py-0.5"
                        style={{
                          background: colors.surface3,
                          color: colors.textSecondary,
                          borderRadius: radius.chip,
                        }}
                      >
                        {phase.weeks_count}w
                      </span>
                    )}
                    <ChevronDown
                      size={16}
                      color={colors.muted}
                      style={{
                        transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                        transition: 'transform 0.2s',
                      }}
                    />
                  </div>
                </button>

                {/* Days list */}
                {isOpen && (
                  <div style={{ borderTop: `1px solid ${colors.border}` }}>
                    {days.length === 0 ? (
                      <p
                        className="px-4 py-3 text-[12px] font-['DM_Sans']"
                        style={{ color: colors.muted }}
                      >
                        Loading…
                      </p>
                    ) : (
                      days.map((day: AnyData, di: number) => {
                        const isRest = day.workout_type === 'rest'
                        const dotColor = DAY_TYPE_COLOR[day.workout_type as string] ?? colors.muted
                        return (
                          <div
                            key={di}
                            className="flex items-center gap-3 px-4 py-3"
                            style={{
                              borderBottom:
                                di < days.length - 1 ? `1px solid ${colors.borderSubtle}` : 'none',
                            }}
                          >
                            {/* Day-of-week tag */}
                            <span
                              className="flex-shrink-0 text-[10px] font-['DM_Sans'] font-bold tracking-[1px] w-8 text-center py-0.5"
                              style={{
                                background: isRest ? colors.surface3 : `${accent}22`,
                                color: isRest ? colors.muted : accent,
                                borderRadius: 4,
                              }}
                            >
                              {day.day_of_week?.slice(0, 3) ?? `D${di + 1}`}
                            </span>
                            {/* Title */}
                            <p
                              className="flex-1 text-[13px] font-['DM_Sans']"
                              style={{ color: isRest ? colors.muted : colors.text }}
                            >
                              {day.title ?? (isRest ? 'Rest' : `Day ${di + 1}`)}
                            </p>
                            {/* Type dot */}
                            <div
                              className="flex-shrink-0 w-2 h-2 rounded-full"
                              style={{ background: dotColor }}
                            />
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
