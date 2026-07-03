import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
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
import { rehydrateProgramme, deleteAllUserData } from '../services/programmeManager'
import GenerateProgrammeView, {
  type GenerateResult,
} from '../features/programme/GenerateProgrammeView'
import ProgrammePreview from '../features/programme/ProgrammePreview'
import { ProfileCard } from '../components/programme/ProfileCard'
import type { UserProfile, UserHealth } from '../components/programme/ProfileCard'
import BottomSheet from '../components/ui/BottomSheet'
import { Loader2, ChevronDown, RefreshCw, AlertTriangle } from 'lucide-react'

type TabState = 'loading' | 'no_programme' | 'has_programme'
type ConfirmAction = 'refresh' | 'regen' | null

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
  const location = useLocation()

  // OnboardingWizard navigates here with a freshly-generated result in router
  // state (Screen 10's "user must confirm first" requirement) so it can reuse
  // this tab's existing ProgrammePreview/save flow instead of duplicating it.
  const previewFromOnboarding =
    (location.state as { previewResult?: GenerateResult } | null)?.previewResult ?? null

  const [tabState, setTabState] = useState<TabState>('loading')
  const [activeProgramme, setActiveProgramme] = useState<AnyData>(null)
  const [phases, setPhases] = useState<AnyData[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [health, setHealth] = useState<UserHealth | null>(null)
  const [previewResult, setPreviewResult] = useState<GenerateResult | null>(previewFromOnboarding)
  const [openPhaseIdx, setOpenPhaseIdx] = useState<number | null>(null)
  const [phaseDays, setPhaseDays] = useState<Record<string, AnyData[]>>({})
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [checkKey, setCheckKey] = useState(0)
  const skipInitialCheckRef = useRef(previewFromOnboarding !== null)

  // Reactively pick up a freshly-generated preview handed off via router state.
  // AppLayout keeps every tab mounted (display:none), so a later navigate() to
  // /program with new state (e.g. re-onboarding while this tab is still
  // mounted) must be picked up here too, not just captured once at first mount.
  useEffect(() => {
    const incoming =
      (location.state as { previewResult?: GenerateResult } | null)?.previewResult ?? null
    if (incoming) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreviewResult(incoming)
      void navigate(location.pathname, { replace: true, state: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  // When the user navigates back to /program with a stale previewResult
  // (tab stays mounted via display:none), bump checkKey to re-run the check.
  useEffect(() => {
    if (skipInitialCheckRef.current) return
    if (location.pathname === '/program' && previewResult !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCheckKey((k) => k + 1)
    }
    // previewResult intentionally omitted — we only want this on pathname change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  useEffect(() => {
    if (!user) return
    let cancelled = false

    const check = async () => {
      if (skipInitialCheckRef.current) {
        skipInitialCheckRef.current = false
        setTabState('no_programme')
        return
      }
      // Clear any stale preview state before checking (handles navigation-back case)
      setPreviewResult(null)
      setTabState('loading')

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
              'fitness_level, goal, available_days_per_week, session_duration_min, equipment, injuries, preferred_workout_time'
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
  }, [user, checkKey])

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

  const bustCaches = useCallback(async () => {
    if (!user) return
    const [idbCache, weekCache] = await Promise.all([
      import('../services/idbCache'),
      import('../services/weekCache'),
    ])
    void idbCache.invalidate('programme-config', user.id)
    void idbCache.invalidate('programme-context', user.id)
    weekCache.clearUserWeekCache(user.id)
  }, [user])

  const handleRefresh = useCallback(async () => {
    if (!user || !activeProgramme) return
    setActionLoading(true)
    setActionError(null)

    const result = await rehydrateProgramme(activeProgramme.id, user.id)

    if (!result.success) {
      setActionError(result.error ?? 'Refresh failed')
      setActionLoading(false)
      return
    }

    await bustCaches()

    // Reload phases + reset accordion
    const { data: freshPhases } = await getProgrammePhases(activeProgramme.id)
    setPhases(freshPhases ?? [])
    setPhaseDays({})
    setOpenPhaseIdx(null)
    setConfirmAction(null)
    setActionLoading(false)
  }, [user, activeProgramme, bustCaches])

  const closeSheet = useCallback(() => {
    if (actionLoading) return
    setConfirmAction(null)
    setActionError(null)
  }, [actionLoading])

  const handleRegen = useCallback(async () => {
    if (!user) return
    setActionLoading(true)
    setActionError(null)

    const result = await deleteAllUserData(user.id)
    if (!result.success) {
      setActionError(result.error ?? 'Delete failed')
      setActionLoading(false)
      return
    }

    await bustCaches()

    setActiveProgramme(null)
    setPhases([])
    setPhaseDays({})
    setOpenPhaseIdx(null)
    setConfirmAction(null)
    setActionLoading(false)
    setTabState('no_programme')
  }, [user, bustCaches])

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
            totalWeeks={totalWeeks}
            injuries={health.injuries ?? []}
          />
        )}

        {/* Programme header: name left, refresh icon right */}
        <div>
          <div className="flex items-center justify-between">
            <h1
              className="font-['Bebas_Neue'] text-[26px] tracking-[2px] leading-none"
              style={{ color: colors.text }}
            >
              {activeProgramme?.name ?? 'My Programme'}
            </h1>
            <button
              onClick={() => {
                setConfirmAction('refresh')
                setActionError(null)
              }}
              disabled={actionLoading}
              className="p-2 -mr-1 active:opacity-50"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              title="Refresh programme"
            >
              <RefreshCw size={17} color={colors.muted} />
            </button>
          </div>
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
                            <p
                              className="flex-1 text-[13px] font-['DM_Sans']"
                              style={{ color: isRest ? colors.muted : colors.text }}
                            >
                              {day.title ?? (isRest ? 'Rest' : `Day ${di + 1}`)}
                            </p>
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

        {/* Generate New Programme button */}
        <button
          onClick={() => {
            setConfirmAction('regen')
            setActionError(null)
          }}
          disabled={actionLoading}
          className="w-full py-3.5 text-[13px] font-['DM_Sans'] font-medium active:opacity-60"
          style={{
            background: 'none',
            border: `1px solid ${colors.border}`,
            borderRadius: radius.button,
            color: colors.textSecondary,
            cursor: actionLoading ? 'default' : 'pointer',
          }}
        >
          Generate New Programme
        </button>
      </div>

      {/* ── Confirm bottom sheet ── */}
      <BottomSheet isOpen={confirmAction !== null} onClose={closeSheet}>
        {confirmAction === 'refresh' && (
          <div className="px-5 pb-8 pt-2">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                style={{ background: `${colors.blue}18`, borderRadius: 12 }}
              >
                <RefreshCw size={18} color={colors.blue} />
              </div>
              <div>
                <p
                  className="font-['Bebas_Neue'] text-[20px] tracking-[1px] leading-none"
                  style={{ color: colors.text }}
                >
                  Refresh Programme
                </p>
                <p className="text-[12px] font-['DM_Sans'] mt-0.5" style={{ color: colors.muted }}>
                  Re-seeds structure from stored AI plan
                </p>
              </div>
            </div>

            <p
              className="text-[13px] font-['DM_Sans'] leading-relaxed mb-5"
              style={{ color: colors.textSecondary }}
            >
              This will re-build your workout days from the original AI plan and reset your start
              date to today. Your exercise history is kept.
            </p>

            {actionError && (
              <p
                className="text-[12px] font-['DM_Sans'] mb-4 px-3 py-2"
                style={{
                  background: `${colors.error}18`,
                  border: `1px solid ${colors.error}44`,
                  borderRadius: 8,
                  color: colors.error,
                }}
              >
                {actionError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={closeSheet}
                disabled={actionLoading}
                className="flex-1 py-3.5 text-[14px] font-['DM_Sans'] font-medium active:opacity-60"
                style={{
                  background: 'none',
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.button,
                  color: colors.textSecondary,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => void handleRefresh()}
                disabled={actionLoading}
                className="flex-1 py-3.5 text-[14px] font-['Bebas_Neue'] tracking-[1px] active:scale-[0.98] transition-transform"
                style={{
                  background: colors.blue,
                  border: 'none',
                  borderRadius: radius.button,
                  color: '#fff',
                  cursor: actionLoading ? 'default' : 'pointer',
                  opacity: actionLoading ? 0.6 : 1,
                }}
              >
                {actionLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Refreshing…
                  </span>
                ) : (
                  'Refresh'
                )}
              </button>
            </div>
          </div>
        )}

        {confirmAction === 'regen' && (
          <div className="px-5 pb-8 pt-2">
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-10 h-10 flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: `${colors.error}18`, borderRadius: 12 }}
              >
                <AlertTriangle size={18} color={colors.error} />
              </div>
              <div>
                <p
                  className="font-['Bebas_Neue'] text-[20px] tracking-[1px] leading-none"
                  style={{ color: colors.text }}
                >
                  Generate New Programme
                </p>
                <p className="text-[12px] font-['DM_Sans'] mt-0.5" style={{ color: colors.error }}>
                  This cannot be undone
                </p>
              </div>
            </div>

            <p
              className="text-[13px] font-['DM_Sans'] leading-relaxed mb-5"
              style={{ color: colors.textSecondary }}
            >
              This will permanently delete your current programme, all workout sessions, and your
              full exercise history.
            </p>

            {actionError && (
              <p
                className="text-[12px] font-['DM_Sans'] mb-4 px-3 py-2"
                style={{
                  background: `${colors.error}18`,
                  border: `1px solid ${colors.error}44`,
                  borderRadius: 8,
                  color: colors.error,
                }}
              >
                {actionError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={closeSheet}
                disabled={actionLoading}
                className="flex-1 py-3.5 text-[14px] font-['DM_Sans'] font-medium active:opacity-60"
                style={{
                  background: 'none',
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.button,
                  color: colors.textSecondary,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => void handleRegen()}
                disabled={actionLoading}
                className="flex-1 py-3.5 text-[14px] font-['Bebas_Neue'] tracking-[1px] active:scale-[0.98] transition-transform"
                style={{
                  background: colors.error,
                  border: 'none',
                  borderRadius: radius.button,
                  color: '#fff',
                  cursor: actionLoading ? 'default' : 'pointer',
                  opacity: actionLoading ? 0.6 : 1,
                }}
              >
                {actionLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Deleting…
                  </span>
                ) : (
                  'Delete & Regenerate'
                )}
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </>
  )
}
