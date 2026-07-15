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
  getProgrammeDayExercises,
  getConditioningItems,
  getProgrammeConfig,
  upsertProgrammeConfig,
} from '../services/programmeService'
import { rehydrateProgramme, deleteAllUserData } from '../services/programmeManager'
import { findOdinPrescription } from '../services/programmeHydrator'
import {
  findPhaseNarrative,
  findDayPatternNarrative,
  findConditioningNarrative,
} from '../services/narrativeMatching'
import { applyExerciseSwap } from '../services/exerciseSwap'
import { updateExerciseInDay } from '../utils/programmeState'
import { getWeekNumber, toDateStr } from '../utils/programme'
import GenerateProgrammeView, {
  type GenerateResult,
} from '../features/programme/GenerateProgrammeView'
import ProgrammePreview from '../features/programme/ProgrammePreview'
import WhyTab from '../features/programme/WhyTab'
import EvidenceTab from '../features/programme/EvidenceTab'
import { ProfileCard } from '../components/programme/ProfileCard'
import type { UserProfile, UserHealth } from '../components/programme/ProfileCard'
import ProgrammeSkeleton from '../components/programme/ProgrammeSkeleton'
import ConditioningSummaryCard from '../components/programme/ConditioningSummaryCard'
import CitationChip from '../components/programme/CitationChip'
import { ExerciseSwapSheet, type SwapTarget } from '../components/programme/ExerciseSwapSheet'
import BottomSheet from '../components/ui/BottomSheet'
import Skeleton from '../components/ui/Skeleton'
import { useToast } from '../hooks/useToast'
import {
  Loader2,
  ChevronDown,
  RefreshCw,
  AlertTriangle,
  ArrowLeftRight,
  CircleHelp,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react'

type TabState = 'loading' | 'no_programme' | 'has_programme'
type ProgrammeTab = 'programme' | 'why' | 'evidence'
type ConfirmAction = 'choose' | 'refresh' | 'restart' | 'regen' | null

interface WhySheetState {
  title: string
  narrative: string
  citationCodes: string[]
}

function validationScoreColor(score: number): string {
  if (score >= 80) return colors.success
  if (score >= 60) return colors.warning
  return colors.error
}

function validationScoreLabel(score: number): string {
  if (score >= 90) return 'Fully validated — no issues found'
  if (score >= 80) return 'Validated — minor notes'
  if (score >= 60) return 'Validated with flags — see details'
  return 'Needs review — see details'
}

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
  const toast = useToast()

  // OnboardingWizard already saves the generated programme to Supabase
  // (`programmes`/`programme_config`) before navigating here, so the active
  // programme is the source of truth. The `previewResult` handed through
  // router state is only used to render something instantly while the
  // Supabase check below is in flight — it's a fallback for the initial
  // render, not a persistence mechanism.
  const previewFromOnboarding =
    (location.state as { previewResult?: GenerateResult; alreadySaved?: boolean } | null)
      ?.previewResult ?? null
  const alreadySavedFromOnboarding = Boolean(
    (location.state as { alreadySaved?: boolean } | null)?.alreadySaved
  )

  const [tabState, setTabState] = useState<TabState>('loading')
  const [activeProgramme, setActiveProgramme] = useState<AnyData>(null)
  const [phases, setPhases] = useState<AnyData[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [health, setHealth] = useState<UserHealth | null>(null)
  const [currentWeek, setCurrentWeek] = useState<number | null>(null)
  const [hasInbodyScan, setHasInbodyScan] = useState<boolean | null>(null)
  const [previewResult, setPreviewResult] = useState<GenerateResult | null>(previewFromOnboarding)
  const [previewAlreadySaved, setPreviewAlreadySaved] = useState(alreadySavedFromOnboarding)
  const [openPhaseIdx, setOpenPhaseIdx] = useState<number | null>(null)
  const [phaseDays, setPhaseDays] = useState<Record<string, AnyData[]>>({})
  const [dayExercises, setDayExercises] = useState<Record<string, AnyData[]>>({})
  const [dayConditioning, setDayConditioning] = useState<Record<string, AnyData[]>>({})
  const [activeTab, setActiveTab] = useState<ProgrammeTab>('programme')
  const [whySheet, setWhySheet] = useState<WhySheetState | null>(null)
  const [highlightCode, setHighlightCode] = useState<string | null>(null)
  const citationRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [checkKey, setCheckKey] = useState(0)
  const [swapTarget, setSwapTarget] = useState<SwapTarget | null>(null)
  const [justSwappedId, setJustSwappedId] = useState<string | null>(null)

  // Reactively pick up a freshly-generated preview handed off via router state.
  // AppLayout keeps every tab mounted (display:none), so a later navigate() to
  // /program with new state (e.g. re-onboarding while this tab is still
  // mounted) must be picked up here too, not just captured once at first mount.
  useEffect(() => {
    const state = location.state as {
      previewResult?: GenerateResult
      alreadySaved?: boolean
    } | null
    const incoming = state?.previewResult ?? null
    if (incoming) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreviewResult(incoming)
      setPreviewAlreadySaved(Boolean(state?.alreadySaved))
      void navigate(location.pathname, { replace: true, state: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  // When the user navigates back to /program with a stale previewResult
  // (tab stays mounted via display:none), bump checkKey to re-run the check.
  useEffect(() => {
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
      setTabState('loading')

      const { data } = await getActiveProgramme(user.id)
      if (cancelled) return

      if (data) {
        setPreviewResult(null)
        setPreviewAlreadySaved(false)
        setActiveProgramme(data)

        const [phasesRes, profileRes, healthRes, cfgRes, inbodyRes] = await Promise.all([
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
              'current_weight_kg, fitness_level, goal, available_days_per_week, session_duration_min, equipment, injuries, injuries_v2, lifestyle, preferred_workout_time, body_fat_pct, target_body_fat_pct, target_weight_kg, target_timeframe_weeks'
            )
            .eq('user_id', user.id)
            .maybeSingle(),
          getProgrammeConfig(user.id),
          supabase.from('inbody_logs').select('id').eq('user_id', user.id).limit(1),
        ])

        if (cancelled) return

        const phaseData = phasesRes.data ?? []
        setPhases(phaseData)
        setProfile(profileRes.data ?? null)
        setHealth((healthRes.data as unknown as UserHealth) ?? null)
        setHasInbodyScan((inbodyRes.data?.length ?? 0) > 0)

        const startDateForWeek =
          (cfgRes.data as AnyData)?.start_date ?? (data as AnyData).started_at?.slice(0, 10)
        setCurrentWeek(
          startDateForWeek ? getWeekNumber(startDateForWeek, toDateStr(new Date())) : null
        )

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
        // No active programme found in Supabase — it's the source of truth,
        // so drop any stale preview rather than trusting router state.
        setPreviewResult(null)
        setPreviewAlreadySaved(false)
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
        const days = data ?? []
        setPhaseDays((prev) => ({ ...prev, [phase.id]: days }))

        // getProgrammeDays only selects day columns — it never joins exercises,
        // so each day needs a separate fetch to populate the accordion's leaf level.
        const workoutDays = days.filter((d: AnyData) => d.workout_type !== 'rest')
        const [exResults, condResults] = await Promise.all([
          Promise.all(workoutDays.map((d: AnyData) => getProgrammeDayExercises(d.id))),
          Promise.all(workoutDays.map((d: AnyData) => getConditioningItems(d.id))),
        ])
        setDayExercises((prev) => {
          const next = { ...prev }
          workoutDays.forEach((d: AnyData, i: number) => {
            next[d.id] = exResults[i]?.data ?? []
          })
          return next
        })
        setDayConditioning((prev) => {
          const next = { ...prev }
          workoutDays.forEach((d: AnyData, i: number) => {
            next[d.id] = condResults[i]?.data ?? []
          })
          return next
        })
      }
    },
    [openPhaseIdx, phaseDays]
  )

  const openSwap = useCallback(
    (phaseIndex: number, day: AnyData, ex: AnyData) => {
      const lookup = findOdinPrescription(
        activeProgramme?.programme_data,
        phaseIndex,
        day.day_of_week,
        ex.display_order
      )
      if (!lookup) {
        toast.show({ message: "Couldn't find this exercise in your plan.", type: 'error' })
        return
      }
      setSwapTarget({
        exerciseId: lookup.exercise_id,
        exerciseName: ex.exercises?.name ?? 'Exercise',
        substitutionOptions: lookup.substitution_options,
        dayExerciseId: ex.id,
        dayId: day.id,
      })
    },
    [activeProgramme, toast]
  )

  const handleSwapConfirmed = useCallback(
    async (chosen: { exercise_id: string; name: string }) => {
      if (!user || !swapTarget) {
        return { success: false, error: 'Missing swap context.' }
      }

      const result = await applyExerciseSwap(
        user.id,
        swapTarget.dayId,
        swapTarget.dayExerciseId,
        chosen
      )
      if (!result.success) {
        return { success: false, error: result.error }
      }

      setDayExercises((prev) =>
        updateExerciseInDay(prev, swapTarget.dayId, swapTarget.dayExerciseId, result.updatedRow)
      )
      setJustSwappedId(swapTarget.dayExerciseId)
      toast.show({ message: `Swapped to ${chosen.name}`, type: 'success' })
      return { success: true }
    },
    [user, swapTarget, toast]
  )

  // Brief highlight on the swapped row, then clear — no list reload needed
  // to show it changed.
  useEffect(() => {
    if (!justSwappedId) return
    const timer = setTimeout(() => setJustSwappedId(null), 1600)
    return () => clearTimeout(timer)
  }, [justSwappedId])

  // Odin's full response — narratives/citations/validation — is stored as-is
  // in programmes.programme_data (see useSaveProgramme), no separate columns.
  const programmeData: AnyData = activeProgramme?.programme_data ?? null
  const narrativesUnavailable = programmeData?.narratives_unavailable === true
  const narratives: AnyData = narrativesUnavailable ? null : (programmeData?.narratives ?? null)
  const citations: AnyData[] = programmeData?.citations ?? []
  const validationScore: number | null = programmeData?.validation?.overall_score ?? null
  const validationFindings: AnyData[] = programmeData?.validation?.findings ?? []

  const goToCitation = useCallback((code: string) => {
    setWhySheet(null)
    setActiveTab('evidence')
    setHighlightCode(code)
  }, [])

  // Citation cards only mount once the Evidence tab is active, so the scroll
  // has to wait a frame after the tab switch before the ref exists.
  useEffect(() => {
    if (activeTab !== 'evidence' || !highlightCode) return
    const raf = requestAnimationFrame(() => {
      citationRefs.current[highlightCode]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    const timer = setTimeout(() => setHighlightCode(null), 2000)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [activeTab, highlightCode])

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

  // Shared by both Refresh (fix structure, keep progress) and Restart
  // (fix structure AND reset start_date back to today / Week 1) — they're
  // the same rebuild with one flag, not two flows worth duplicating.
  const handleRehydrate = useCallback(
    async (resetStartDate: boolean) => {
      if (!user || !activeProgramme) return
      setActionLoading(true)
      setActionError(null)

      const result = await rehydrateProgramme(activeProgramme.id, user.id, resetStartDate)

      if (!result.success) {
        setActionError(result.error ?? (resetStartDate ? 'Restart failed' : 'Refresh failed'))
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
    },
    [user, activeProgramme, bustCaches]
  )

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
    // Render the just-generated preview instantly instead of a spinner while
    // the Supabase active-programme check above confirms it — Supabase (not
    // this router-state value) is what decides the final tabState.
    if (previewResult) {
      return (
        <>
          <TopBar title="PROGRAMME" />
          <ProgrammePreview
            result={previewResult}
            alreadySaved={previewAlreadySaved}
            onRegenerate={() => setPreviewResult(null)}
          />
        </>
      )
    }
    return (
      <>
        <TopBar title="PROGRAMME" />
        <ProgrammeSkeleton />
      </>
    )
  }

  // ── No programme: generate or preview ──
  if (tabState === 'no_programme') {
    if (previewResult) {
      return (
        <>
          <TopBar title="PROGRAMME" />
          <ProgrammePreview
            result={previewResult}
            alreadySaved={previewAlreadySaved}
            onRegenerate={() => setPreviewResult(null)}
          />
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

  const tabs: { key: ProgrammeTab; label: string }[] = [
    { key: 'programme', label: 'Programme' },
    { key: 'why', label: 'Why' },
    { key: 'evidence', label: 'Evidence' },
  ]

  return (
    <>
      <TopBar title="PROGRAMME" />

      {/* Profile card: always visible above the tabs, same data for all three */}
      {profile && health && (
        <div className="flex-shrink-0 px-4 pt-4">
          <ProfileCard
            profile={profile}
            health={health}
            totalWeeks={totalWeeks}
            currentWeek={currentWeek}
            injuries={health.injuries ?? []}
            hasInbodyScan={hasInbodyScan}
          />
        </div>
      )}

      {/* Tab shell: underline indicator so tabs read as attached to the panel
        below rather than as standalone pill buttons */}
      <div
        className="flex-shrink-0 flex px-4 pt-3"
        style={{ borderBottom: `1px solid ${colors.border}` }}
      >
        {tabs.map((t) => {
          const isActive = activeTab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className="flex-1 pb-2.5 text-[12px] font-['DM_Sans'] font-bold uppercase tracking-[0.5px]"
              style={{
                marginBottom: '-1px',
                background: 'none',
                color: isActive ? colors.text : colors.muted,
                border: 'none',
                borderBottom: `2px solid ${isActive ? colors.accent : 'transparent'}`,
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'why' && (
        <WhyTab
          narratives={narratives}
          narrativesUnavailable={narrativesUnavailable}
          citations={citations}
          phases={phases}
          onCitationTap={goToCitation}
        />
      )}

      {activeTab === 'evidence' && (
        <EvidenceTab
          validationScore={validationScore}
          findings={validationFindings}
          citations={citations}
          narratives={narratives}
          phases={phases}
          highlightCode={highlightCode}
          citationRefs={citationRefs}
        />
      )}

      {activeTab === 'programme' && (
        <div className="flex-1 overflow-y-auto pb-8 px-4 pt-4 space-y-4">
          {/* Programme header: name left, refresh icon right */}
          <div>
            <div className="flex items-center justify-between">
              <h1
                className="font-['Bebas_Neue'] text-[26px] tracking-[2px] leading-none"
                style={{ color: colors.text }}
              >
                {activeProgramme?.name ?? 'My Programme'}
              </h1>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setConfirmAction('choose')
                    setActionError(null)
                  }}
                  disabled={actionLoading}
                  className="p-2 -mr-1 active:opacity-50"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                  title="Refresh or restart programme"
                >
                  <RefreshCw size={17} color={colors.muted} />
                </button>
              </div>
            </div>
          </div>

          {/* Confidence score: plain-language line, not just a number, so it's
            clear what it means without opening Evidence first */}
          {validationScore != null && (
            <button
              onClick={() => setActiveTab('evidence')}
              className="w-full flex items-center gap-3 p-3 active:opacity-70"
              style={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.card,
                cursor: 'pointer',
              }}
            >
              <div
                className="w-9 h-9 flex-shrink-0 flex items-center justify-center"
                style={{
                  background: `${validationScoreColor(validationScore)}1a`,
                  borderRadius: '50%',
                }}
              >
                <ShieldCheck size={17} color={validationScoreColor(validationScore)} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p
                  className="text-[13px] font-['DM_Sans'] font-bold"
                  style={{ color: colors.text }}
                >
                  Confidence Score: {validationScore}/100
                </p>
                <p
                  className="text-[11px] font-['DM_Sans'] mt-0.5 truncate"
                  style={{ color: colors.muted }}
                >
                  {validationScoreLabel(validationScore)}
                </p>
              </div>
              <ChevronRight size={16} color={colors.muted} className="flex-shrink-0" />
            </button>
          )}

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
                      <div className="flex items-center gap-1.5">
                        <p
                          className="font-['Bebas_Neue'] text-[16px] tracking-[1px] leading-none"
                          style={{ color: colors.text }}
                        >
                          {phase.name ?? `Phase ${pi + 1}`}
                        </p>
                        {!narrativesUnavailable &&
                          (() => {
                            const n = findPhaseNarrative(narratives, programmeData, pi)
                            if (!n?.narrative?.text) return null
                            return (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setWhySheet({
                                    title: phase.name ?? `Phase ${pi + 1}`,
                                    narrative: n.narrative.text,
                                    citationCodes: n.narrative.citation_codes ?? [],
                                  })
                                }}
                                className="flex-shrink-0"
                              >
                                <CircleHelp size={14} color={colors.muted} />
                              </span>
                            )
                          })()}
                      </div>
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
                        <div>
                          {[0, 1, 2].map((i) => (
                            <div
                              key={i}
                              className="flex items-center gap-3 px-4 py-3"
                              style={{
                                borderBottom: i < 2 ? `1px solid ${colors.borderSubtle}` : 'none',
                              }}
                            >
                              <Skeleton width={32} height={16} />
                              <Skeleton width={140} height={13} className="flex-1" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        days.map((day: AnyData, di: number) => {
                          const isRest = day.workout_type === 'rest'
                          const dotColor =
                            DAY_TYPE_COLOR[day.workout_type as string] ?? colors.muted
                          const exercises: AnyData[] = dayExercises[day.id] ?? []
                          const conditioning: AnyData[] = dayConditioning[day.id] ?? []
                          const dayNarrativeRaw =
                            !isRest && !narrativesUnavailable
                              ? findDayPatternNarrative(
                                  narratives,
                                  programmeData,
                                  pi,
                                  day.day_of_week
                                )
                              : null
                          const finisherNarrativeRaw =
                            !isRest && !narrativesUnavailable
                              ? findConditioningNarrative(
                                  narratives,
                                  programmeData,
                                  pi,
                                  day.day_of_week
                                )
                              : null
                          const dayNarrative = dayNarrativeRaw?.narrative?.text
                            ? dayNarrativeRaw
                            : null
                          const finisherNarrative = finisherNarrativeRaw?.narrative?.text
                            ? finisherNarrativeRaw
                            : null
                          return (
                            <div
                              key={di}
                              style={{
                                borderBottom:
                                  di < days.length - 1
                                    ? `1px solid ${colors.borderSubtle}`
                                    : 'none',
                              }}
                            >
                              <div className="flex items-center gap-3 px-4 py-3">
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
                                {(dayNarrative ?? finisherNarrative) && (
                                  <span
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      const n = dayNarrative ?? finisherNarrative
                                      setWhySheet({
                                        title: day.title ?? 'This day',
                                        narrative: n.narrative.text,
                                        citationCodes: n.narrative.citation_codes ?? [],
                                      })
                                    }}
                                    className="flex-shrink-0"
                                  >
                                    <CircleHelp size={14} color={colors.muted} />
                                  </span>
                                )}
                                <div
                                  className="flex-shrink-0 w-2 h-2 rounded-full"
                                  style={{ background: dotColor }}
                                />
                              </div>
                              {!isRest && exercises.length === 0 && conditioning.length > 0 && (
                                <div style={{ background: colors.surface2 }}>
                                  {conditioning.map((item: AnyData) => (
                                    <ConditioningSummaryCard key={item.id} item={item} />
                                  ))}
                                </div>
                              )}
                              {!isRest && exercises.length > 0 && (
                                <div style={{ background: colors.surface2 }}>
                                  {exercises.map((ex: AnyData, ei: number) => (
                                    <div
                                      key={ex.id}
                                      className="w-full flex items-center gap-3 pl-8 pr-4 py-3"
                                      style={{
                                        borderTop:
                                          ei > 0 ? `1px solid ${colors.borderSubtle}` : 'none',
                                        background:
                                          ex.id === justSwappedId
                                            ? `color-mix(in srgb, ${colors.accent} 13%, transparent)`
                                            : 'transparent',
                                        transition: 'background-color 1.4s ease-out',
                                      }}
                                    >
                                      <p
                                        className="flex-1 text-[12px] font-['DM_Sans']"
                                        style={{ color: colors.textSecondary }}
                                      >
                                        {ex.exercises?.name ?? 'Exercise'}
                                      </p>
                                      {ex.sets_reps && (
                                        <span
                                          className="flex-shrink-0 text-[11px] font-['DM_Sans']"
                                          style={{ color: colors.muted }}
                                        >
                                          {ex.sets_reps}
                                        </span>
                                      )}
                                      <button
                                        onClick={() => openSwap(pi, day, ex)}
                                        className="flex-shrink-0 -mr-2 flex items-center justify-center gap-1 active:opacity-60"
                                        style={{
                                          minWidth: 44,
                                          minHeight: 44,
                                          padding: '0 10px',
                                          background: colors.surface3,
                                          border: 'none',
                                          borderRadius: radius.chip,
                                          cursor: 'pointer',
                                        }}
                                        title="Swap exercise"
                                        aria-label={`Swap ${ex.exercises?.name ?? 'exercise'}`}
                                      >
                                        <ArrowLeftRight size={13} color={colors.textSecondary} />
                                        <span
                                          className="text-[10px] font-['DM_Sans'] font-bold uppercase tracking-[0.5px]"
                                          style={{ color: colors.textSecondary }}
                                        >
                                          Swap
                                        </span>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
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
      )}

      {/* ── Why bottom sheet ── */}
      <BottomSheet isOpen={whySheet !== null} onClose={() => setWhySheet(null)}>
        {whySheet && (
          <div className="px-5 pb-8 pt-2">
            <p
              className="font-['Bebas_Neue'] text-[18px] tracking-[1px] leading-none mb-3"
              style={{ color: colors.text }}
            >
              {whySheet.title}
            </p>
            <p
              className="text-[13px] font-['DM_Sans'] leading-relaxed"
              style={{ color: colors.textSecondary }}
            >
              {whySheet.narrative}
            </p>
            {whySheet.citationCodes.length > 0 && (
              <div className="flex flex-wrap mt-3">
                {whySheet.citationCodes.map((code) => {
                  const c = citations.find((cit: AnyData) => cit.code === code)
                  if (!c) return null
                  return (
                    <CitationChip
                      key={code}
                      author={c.author}
                      year={c.year}
                      onTap={() => goToCitation(code)}
                    />
                  )
                })}
              </div>
            )}
          </div>
        )}
      </BottomSheet>

      {/* ── Confirm bottom sheet ── */}
      <BottomSheet isOpen={confirmAction !== null} onClose={closeSheet}>
        {confirmAction === 'choose' && (
          <div className="px-5 pb-8 pt-2">
            <p
              className="font-['Bebas_Neue'] text-[20px] tracking-[1px] leading-none mb-4"
              style={{ color: colors.text }}
            >
              Programme Structure
            </p>

            <button
              onClick={() => setConfirmAction('refresh')}
              className="w-full flex items-center gap-3 mb-3 p-3 active:opacity-70"
              style={{
                background: colors.surface2,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.card,
                cursor: 'pointer',
              }}
            >
              <div
                className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                style={{
                  background: `color-mix(in srgb, ${colors.blue} 9%, transparent)`,
                  borderRadius: 12,
                }}
              >
                <RefreshCw size={18} color={colors.blue} />
              </div>
              <div className="text-left">
                <p
                  className="font-['Bebas_Neue'] text-[16px] tracking-[1px] leading-none"
                  style={{ color: colors.text }}
                >
                  Refresh
                </p>
                <p className="text-[12px] font-['DM_Sans'] mt-0.5" style={{ color: colors.muted }}>
                  Re-seeds structure, keeps your progress
                </p>
              </div>
            </button>

            <button
              onClick={() => setConfirmAction('restart')}
              className="w-full flex items-center gap-3 p-3 active:opacity-70"
              style={{
                background: colors.surface2,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.card,
                cursor: 'pointer',
              }}
            >
              <div
                className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                style={{
                  background: `color-mix(in srgb, ${colors.orange} 9%, transparent)`,
                  borderRadius: 12,
                }}
              >
                <RefreshCw size={18} color={colors.orange} />
              </div>
              <div className="text-left">
                <p
                  className="font-['Bebas_Neue'] text-[16px] tracking-[1px] leading-none"
                  style={{ color: colors.text }}
                >
                  Restart
                </p>
                <p className="text-[12px] font-['DM_Sans'] mt-0.5" style={{ color: colors.muted }}>
                  Resets your progress back to Week 1
                </p>
              </div>
            </button>
          </div>
        )}

        {confirmAction === 'refresh' && (
          <div className="px-5 pb-8 pt-2">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                style={{
                  background: `color-mix(in srgb, ${colors.blue} 9%, transparent)`,
                  borderRadius: 12,
                }}
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
              This will re-build your workout days from the original AI plan. Your progress and
              exercise history are untouched.
            </p>

            {actionError && (
              <p
                className="text-[12px] font-['DM_Sans'] mb-4 px-3 py-2"
                style={{
                  background: `color-mix(in srgb, ${colors.error} 9%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${colors.error} 27%, transparent)`,
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
                onClick={() => void handleRehydrate(false)}
                disabled={actionLoading}
                className="flex-1 py-3.5 text-[14px] font-['Bebas_Neue'] tracking-[1px] active:scale-[0.98] transition-transform"
                style={{
                  background: colors.blue,
                  border: 'none',
                  borderRadius: radius.button,
                  color: colors.white,
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

        {confirmAction === 'restart' && (
          <div className="px-5 pb-8 pt-2">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                style={{
                  background: `color-mix(in srgb, ${colors.orange} 9%, transparent)`,
                  borderRadius: 12,
                }}
              >
                <RefreshCw size={18} color={colors.orange} />
              </div>
              <div>
                <p
                  className="font-['Bebas_Neue'] text-[20px] tracking-[1px] leading-none"
                  style={{ color: colors.text }}
                >
                  Restart Programme
                </p>
                <p className="text-[12px] font-['DM_Sans'] mt-0.5" style={{ color: colors.muted }}>
                  Resets your progress back to Week 1
                </p>
              </div>
            </div>

            <p
              className="text-[13px] font-['DM_Sans'] leading-relaxed mb-5"
              style={{ color: colors.textSecondary }}
            >
              This will rebuild your workout days from the original AI plan and set your start date
              to today, restarting from Week 1. Your exercise history is kept.
            </p>

            {actionError && (
              <p
                className="text-[12px] font-['DM_Sans'] mb-4 px-3 py-2"
                style={{
                  background: `color-mix(in srgb, ${colors.error} 9%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${colors.error} 27%, transparent)`,
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
                onClick={() => void handleRehydrate(true)}
                disabled={actionLoading}
                className="flex-1 py-3.5 text-[14px] font-['Bebas_Neue'] tracking-[1px] active:scale-[0.98] transition-transform"
                style={{
                  background: colors.orange,
                  border: 'none',
                  borderRadius: radius.button,
                  color: colors.white,
                  cursor: actionLoading ? 'default' : 'pointer',
                  opacity: actionLoading ? 0.6 : 1,
                }}
              >
                {actionLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Restarting…
                  </span>
                ) : (
                  'Restart'
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
                style={{
                  background: `color-mix(in srgb, ${colors.error} 9%, transparent)`,
                  borderRadius: 12,
                }}
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
                  background: `color-mix(in srgb, ${colors.error} 9%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${colors.error} 27%, transparent)`,
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
                  color: colors.white,
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

      <ExerciseSwapSheet
        target={swapTarget}
        onClose={() => setSwapTarget(null)}
        onConfirmed={handleSwapConfirmed}
      />
    </>
  )
}
