import { useState, useMemo, useCallback, useEffect, useRef, memo } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useLoading } from '../hooks/useLoading'
import { computePhaseAndWeek, getDayKey, getWeekDays, getMinWeekOffset } from '../utils/programme'
import { useTodayData } from '../hooks/useTodayData'
import { getSyncState, subscribe as subscribeSyncState } from '../services/syncState'
import { rateSession } from '../services/workoutService'
import { Text, Button, Badge, SectionLabel } from '../components/ui'
import TopBar from '../components/layout/TopBar'

import PhaseCard from '../components/today/PhaseCard'
import WarmupSection from '../components/today/WarmupSection'
import ExerciseCard from '../components/today/ExerciseCard'
import SetLogSheet from '../components/today/SetLogSheet'
import RestTimerHUD from '../components/today/RestTimerHUD'
import LissDay from '../components/today/LissDay'
import ConditioningDay from '../components/today/ConditioningDay'
import RecoveryDay from '../components/today/RecoveryDay'
import CollapsibleConditioningBlock from '../components/today/CollapsibleConditioningBlock'
import WorkoutCompleteSheet from '../components/today/WorkoutCompleteSheet'
import CooldownSection from '../components/today/CooldownSection'
import FinisherBlock from '../components/today/FinisherBlock'
import TodaySkeleton, { DayContentSkeleton } from '../components/today/TodaySkeleton'
import PullToRefreshIndicator from '../components/today/PullToRefreshIndicator'
import BaselineSessionCard from '../components/today/BaselineSessionCard'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import useBaselineStatus from '../hooks/useBaselineStatus'
import { Moon } from 'lucide-react'

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

function SyncIndicator() {
  const [syncState, setSyncState] = useState(getSyncState)

  useEffect(() => {
    return subscribeSyncState(setSyncState)
  }, [])

  const { activeWrites, pendingQueue, isOnline } = syncState

  let dotColor, labelText, shouldPulse
  if (!isOnline) {
    dotColor = 'bg-muted'
    labelText = 'offline'
    shouldPulse = false
  } else if (activeWrites > 0) {
    dotColor = 'bg-warning'
    labelText = 'saving'
    shouldPulse = true
  } else if (pendingQueue > 0) {
    dotColor = 'bg-warning'
    labelText = `${pendingQueue} pending`
    shouldPulse = true
  } else {
    dotColor = 'bg-success'
    labelText = 'synced'
    shouldPulse = false
  }

  return (
    <div className="flex items-center gap-[6px] min-h-[44px] min-w-[44px] justify-end">
      <span className="text-[11px] text-muted">{labelText}</span>
      <div
        className={`w-2 h-2 rounded-full shrink-0 ${dotColor} ${shouldPulse ? 'animate-pulse' : ''}`}
        style={{ transition: 'background .3s' }}
      />
    </div>
  )
}

const TodayTopBar = memo(function TodayTopBar({ phase, totalWeek }) {
  const now = useMemo(() => new Date(), [])
  const title = useMemo(
    () =>
      `${DAYS[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]} · W${totalWeek} · P${phase}`,
    [now, phase, totalWeek]
  )
  return <TopBar title={title} rightContent={<SyncIndicator />} />
})

const RestDay = memo(function RestDay({ workout }) {
  return (
    <div className="pt-2.5">
      <Text variant="pageTitle" className="text-muted">
        {workout?.title ?? 'REST DAY'}
      </Text>
      <Text variant="bodyMuted" className="mt-2">
        {workout?.sub ?? 'Recovery · Sleep · Meal Prep'}
      </Text>
      <div
        className="mt-4 p-8 text-center"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
        }}
      >
        <div className="mb-3 flex justify-center">
          <Moon size={44} strokeWidth={1} color="var(--border)" />
        </div>
        <h2 className="font-['Bebas_Neue'] text-[26px] tracking-[2px] text-text mb-2">REST DAY</h2>
        <Text variant="bodyMuted">Nothing to log today.</Text>
        <Text variant="caption" className="mt-1 max-w-[260px] mx-auto leading-[1.6]">
          Rest is part of the programme.
        </Text>
      </div>
    </div>
  )
})

// ═══════════════════════════════════════════
// TODAY — Main Controller
// ═══════════════════════════════════════════
export default function Today() {
  const { user } = useAuth()
  const { startLoading, stopLoading } = useLoading()

  // ── Screen state ──
  const [screenState, setScreenState] = useState('orientation')

  // ── Navigation ──
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDayLabel, setSelectedDayLabel] = useState(getDayKey(new Date()))

  // ── Interaction ──
  const [expandedExercise, setExpandedExercise] = useState(null)
  const [activeSheet, setActiveSheet] = useState(null)
  const [restTimer, setRestTimer] = useState(null)
  const [localCompletedSets, setLocalCompletedSets] = useState({})
  const dismissedCompleteRef = useRef(false)

  // ── Swipe navigation ──
  const touchRef = useRef({ startX: 0, startY: 0, startTime: 0, tracking: false, locked: false })
  const [swipeX, setSwipeX] = useState(0)
  const [swipePhase, setSwipePhase] = useState('idle') // 'idle' | 'tracking' | 'animating'
  const contentRef = useRef(null)

  // ── Computed dates ──
  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset])
  const selectedDay = useMemo(
    () => weekDays.find((d) => d.dayLabel === selectedDayLabel) ?? weekDays[0],
    [weekDays, selectedDayLabel]
  )
  const dateStr = selectedDay.dateStr

  // ── Data hook ──
  const {
    config,
    sessions,
    logs,
    warmupLogs,
    checklistLogs,
    exerciseMap,
    previousBests,
    programme,
    dayData,
    programmeExercises,
    warmupItems,
    cooldownItems,
    conditioningItems,
    loading,
    dayLoading,
    hasCachedData,
    revalidating,
    error,
    refetch,
  } = useTodayData(dateStr, weekDays[0].dateStr, weekDays[6].dateStr, selectedDayLabel)

  // ── Loading bar ──
  useEffect(() => {
    if (loading) {
      startLoading()
      return () => stopLoading()
    }
  }, [loading, startLoading, stopLoading])

  const syncRefetch = useCallback(() => {
    void refetch()
  }, [refetch])

  // ── Phase computation ──
  const phaseInfo = useMemo(() => {
    if (!config) return { phase: 1, weekInPhase: 1, totalWeek: 1, qualifyingWeeks: 0 }
    return computePhaseAndWeek(sessions, {
      start_date: config.start_date,
      phase_weeks: config.phase_weeks,
      min_active_days: config.min_active_days,
    })
  }, [config, sessions])

  const phase = phaseInfo.phase
  const totalWeek = phaseInfo.totalWeek

  // ── Day 0 baseline strength test (Odin v2 day_one_test path) ──
  const {
    baselinePending,
    baselineSession,
    programmeId: baselineProgrammeId,
    loading: baselineLoading,
    refetch: refetchBaselineStatus,
  } = useBaselineStatus()

  const handleBaselineComplete = useCallback(() => {
    void refetchBaselineStatus()
    void syncRefetch()
  }, [refetchBaselineStatus, syncRefetch])

  // ── Workout for selected day (DB only) ──
  const workout = useMemo(() => {
    if (!dayData) return null
    return {
      title: dayData.title ?? '',
      sub: dayData.subtitle ?? '',
      dur: dayData.duration_min ? String(dayData.duration_min) : null,
      kcal: dayData.kcal_range ?? null,
      tags: dayData.tags ?? [],
      workout_type: dayData.workout_type,
      has_warmup: dayData.has_warmup,
      fin: dayData.finisher ?? null,
      isRest: dayData.workout_type === 'rest',
      isLiss: dayData.workout_type === 'liss',
    }
  }, [dayData])

  // ── Map DB programme exercises → ExerciseCard format ──
  const displayExercises = useMemo(() => {
    if (programmeExercises && programmeExercises.length > 0) {
      return programmeExercises.map((pe) => ({
        n: pe.exercises?.name ?? 'Unknown',
        s: pe.sets_reps ?? '3×12',
        r: pe.rest ?? '60s',
        note: pe.notes ?? null,
        warn: pe.warn ?? null,
        eq: pe.exercises?.equipment ?? [],
        icon: pe.icon ?? null,
        _bodyPart: pe.exercises?.body_part,
        _targetMuscle: pe.exercises?.target_muscle,
        _gifUrl: pe.exercises?.gif_url,
      }))
    }

    if (dayData?.workout_type === 'workout' && !loading) {
      console.warn(
        '[GX] programme_exercises empty for day',
        dayData?.id,
        '— seed programme_exercises table'
      )
    }

    return []
  }, [programmeExercises, dayData, loading])

  const displayCooldownItems = useMemo(() => {
    if (cooldownItems && cooldownItems.length > 0) {
      return cooldownItems.map((ci) => ci.label ?? ci.item_key)
    }
    return []
  }, [cooldownItems])

  const logsByExercise = useMemo(() => {
    const map = {}
    for (const log of logs) {
      const name = log.exercise_name
      map[name] ??= []
      map[name].push(log)
    }
    return map
  }, [logs])

  // ── Odin V2 conditioning items for the selected day ──
  const hasConditioningItems = conditioningItems && conditioningItems.length > 0
  const isRecoveryConditioning = useMemo(() => {
    if (!hasConditioningItems) return false
    return conditioningItems.every(
      (ci) =>
        ci.conditioning_type === 'active_recovery' || ci.conditioning_type === 'movement_target'
    )
  }, [conditioningItems, hasConditioningItems])

  // Determine day type. workout_type === 'workout' covers V2 'resistance' and
  // 'combined' days (combined also renders a conditioning finisher below).
  // 'conditioning'/'sport'/'recovery' V2 days store workout_type as the 'liss'
  // DB fallback (see mapWorkoutTypeForDb) — conditioningItems presence is what
  // actually distinguishes them from legacy V1 liss days.
  const dayType = workout?.isRest
    ? 'rest'
    : dayData?.workout_type === 'workout'
      ? displayExercises.length > 0
        ? 'workout'
        : 'none'
      : hasConditioningItems
        ? isRecoveryConditioning
          ? 'recovery'
          : 'conditioning'
        : workout?.isLiss
          ? 'liss'
          : 'none'

  // ── Session for selected date ──
  const sessionForDate = useMemo(
    () => sessions.find((s) => s.date === dateStr),
    [sessions, dateStr]
  )
  const sessionId = sessionForDate?.id ?? null

  // ── Completed days for week strip ──
  const completedDateStrs = useMemo(() => {
    const set = new Set()
    for (const s of sessions) {
      const inWeek = weekDays.some((wd) => wd.dateStr === s.date)
      if (inWeek) set.add(s.date)
    }
    return set
  }, [sessions, weekDays])

  // ── Rest day indices (0=Mon … 6=Sun) ──
  const restDayIndices = useMemo(() => new Set([6]), [])

  // ── Week navigation bounds ──
  const programmeStartDate = config?.start_date ?? null
  const minWeekOffset = useMemo(() => getMinWeekOffset(programmeStartDate), [programmeStartDate])
  const canGoBack = weekOffset > minWeekOffset
  const canGoForward = true

  // ── Pre-populate completedSets from exercise_logs ──
  const derivedCompletedSets = useMemo(() => {
    const map = {}
    for (const log of logs) {
      if (log.completed && !log.is_mm_set) {
        const key = `${log.exercise_name}-${log.set_number}`
        map[key] = {
          weight: log.weight_kg,
          reps: log.reps,
          rpe: log.rpe,
        }
      }
    }
    return map
  }, [logs])

  const completedSets = useMemo(
    () => ({ ...derivedCompletedSets, ...localCompletedSets }),
    [derivedCompletedSets, localCompletedSets]
  )

  /* eslint-disable react-hooks/set-state-in-effect -- sync derived defaults with user-interactive state */
  useEffect(() => {
    if (dayType !== 'workout' || displayExercises.length === 0) return
    const firstIncomplete = displayExercises.findIndex((ex) => {
      const sets = parseInt(ex.s.split('×')[0])
      const logged = logs.filter((l) => l.exercise_name === ex.n && !l.is_mm_set && l.completed)
      return logged.length < sets
    })
    setExpandedExercise(firstIncomplete >= 0 ? firstIncomplete : null)
  }, [logs, displayExercises, dayType])

  useEffect(() => {
    dismissedCompleteRef.current = false
  }, [dateStr])

  useEffect(() => {
    if (
      dayType !== 'workout' ||
      displayExercises.length === 0 ||
      screenState === 'complete' ||
      dismissedCompleteRef.current
    )
      return
    const allDone = displayExercises.every((ex) => {
      const sets = parseInt(ex.s.split('×')[0])
      const logged = logs.filter((l) => l.exercise_name === ex.n && !l.is_mm_set && l.completed)
      return logged.length >= sets
    })
    if (allDone && logs.length > 0) {
      setScreenState('complete')
    }
  }, [logs, displayExercises, dayType, screenState, dateStr])
  /* eslint-enable react-hooks/set-state-in-effect */

  // ── Today date for comparisons ──
  const todayDateStr = useMemo(() => {
    const d = new Date()
    return (
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0')
    )
  }, [])

  const isFutureDate = dateStr > todayDateStr

  // ── Handlers ──
  const handleSelectDay = useCallback((dayLabel) => {
    setSelectedDayLabel(dayLabel)
    setExpandedExercise(null)
    setActiveSheet(null)
    setScreenState('orientation')
  }, [])

  const handlePrevWeek = useCallback(() => {
    setWeekOffset((prev) => prev - 1)
    setScreenState('orientation')
  }, [])

  const handleNextWeek = useCallback(() => {
    setWeekOffset((prev) => {
      return prev + 1
    })
    setScreenState('orientation')
  }, [])

  const handleGoToToday = useCallback(() => {
    setWeekOffset(0)
    setSelectedDayLabel(getDayKey(new Date()))
    setExpandedExercise(null)
    setActiveSheet(null)
    setScreenState('orientation')
  }, [])

  const handleTapSet = useCallback(
    (exercise, setNumber, totalSets, prevBest, existingLog, exerciseIndex, restSec) => {
      setActiveSheet({
        exercise,
        setNumber,
        totalSets,
        prevBest,
        existingLog,
        exerciseIndex,
        restSec,
      })
      setScreenState('active')
    },
    []
  )

  // ── Swipe day navigation ──
  const DAY_SEQ = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

  function navigateDay(direction) {
    const idx = DAY_SEQ.indexOf(selectedDayLabel)
    if (idx === -1) return

    if (direction === 'next') {
      if (idx < 6) {
        setSelectedDayLabel(DAY_SEQ[idx + 1])
      } else {
        setWeekOffset((prev) => prev + 1)
        setSelectedDayLabel('MON')
      }
    } else {
      if (idx > 0) {
        setSelectedDayLabel(DAY_SEQ[idx - 1])
      } else {
        if (!canGoBack) return
        setWeekOffset((prev) => prev - 1)
        setSelectedDayLabel('SUN')
      }
    }

    setExpandedExercise(null)
    setActiveSheet(null)
    setScreenState('orientation')
    // swipe animation is driven by touch handlers
  }

  const scrollRef = useRef(null)
  const { pullProgress, pullDistance, ptrState, transitioning } = usePullToRefresh(
    scrollRef,
    syncRefetch
  )
  const navigateDayRef = useRef(navigateDay)
  const activeSheetRef = useRef(activeSheet)
  const screenStateRef = useRef(screenState)

  useEffect(() => {
    navigateDayRef.current = navigateDay
    activeSheetRef.current = activeSheet
    screenStateRef.current = screenState
  })

  useEffect(() => {
    function onTouchStart(e) {
      if (activeSheetRef.current || screenStateRef.current === 'complete') return
      const t = e.touches[0]
      touchRef.current = {
        startX: t.clientX,
        startY: t.clientY,
        startTime: Date.now(),
        locked: false,
        tracking: false,
      }
    }

    function onTouchMove(e) {
      const ref = touchRef.current
      if (!ref.startTime) return
      const t = e.touches[0]
      const dx = t.clientX - ref.startX
      const dy = t.clientY - ref.startY

      if (!ref.locked) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
        ref.locked = true
        ref.tracking = Math.abs(dx) > Math.abs(dy) * 1.1
      }

      if (!ref.tracking) return

      setSwipeX(dx)
      setSwipePhase('tracking')
    }

    function onTouchEnd(e) {
      const ref = touchRef.current
      if (!ref.locked || !ref.tracking) {
        setSwipeX(0)
        setSwipePhase('idle')
        return
      }

      const dx = e.changedTouches[0].clientX - ref.startX
      const elapsed = Date.now() - ref.startTime
      const velocity = Math.abs(dx) / Math.max(elapsed, 1)
      const triggered = Math.abs(dx) > 48 || (Math.abs(dx) > 20 && velocity > 0.35)
      const direction = dx < 0 ? 'next' : 'prev'

      touchRef.current = {
        startX: 0,
        startY: 0,
        startTime: 0,
        locked: false,
        tracking: false,
      }

      if (triggered) {
        setSwipeX(dx < 0 ? -20 : 20)
        setSwipePhase('animating')
        setTimeout(() => {
          navigateDayRef.current(direction)
          setSwipeX(0)
          setSwipePhase('idle')
        }, 100)
      } else {
        setSwipeX(0)
        setSwipePhase('idle')
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  const handleLogged = useCallback(
    (sid, weight = 0, reps = 0) => {
      const restSec = activeSheet?.restSec ?? 60
      const exName = activeSheet?.exercise?.n ?? ''
      const setNum = activeSheet?.setNumber

      setActiveSheet(null)
      setRestTimer({ duration: restSec, exerciseName: exName })

      // Update completedSets locally for instant feedback
      if (exName && setNum) {
        setLocalCompletedSets((prev) => ({
          ...prev,
          [`${exName}-${setNum}`]: { weight: weight || 0, reps: reps || 0, rpe: null },
        }))
      }

      void syncRefetch()
    },
    [activeSheet, syncRefetch]
  )

  function handleRestTimerDismiss() {
    setRestTimer(null)
    if (screenState === 'active') setScreenState('orientation')
  }

  // ── Loading — show skeleton only when no cached data ──
  if ((loading || baselineLoading) && !hasCachedData) {
    return <TodaySkeleton />
  }

  // A stale "no programme" snapshot is being revalidated in the background —
  // prefer skeleton over confidently showing an empty state that may be wrong.
  if (revalidating && !programme) {
    return <TodaySkeleton />
  }

  // ── Render ──
  return (
    <>
      <TodayTopBar phase={phase} totalWeek={totalWeek} />

      <div className="flex-1 relative overflow-hidden">
        <PullToRefreshIndicator
          pullProgress={pullProgress}
          pullDistance={pullDistance}
          ptrState={ptrState}
        />
        <div
          ref={scrollRef}
          className="w-full h-full overflow-y-auto pb-8"
          style={{
            touchAction: 'pan-y',
            transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : 'translateY(0)',
            transition: transitioning
              ? 'transform 320ms cubic-bezier(0.25, 1, 0.5, 1)'
              : pullDistance > 0
                ? 'none'
                : undefined,
          }}
        >
          {/* Week strip / day pills */}
          <PhaseCard
            totalWeek={totalWeek}
            weekOffset={weekOffset}
            onPrevWeek={handlePrevWeek}
            onNextWeek={handleNextWeek}
            canGoBack={canGoBack}
            canGoForward={canGoForward}
            weekDays={weekDays}
            selectedDateStr={dateStr}
            completedDateStrs={completedDateStrs}
            restDayIndices={restDayIndices}
            onSelectDay={handleSelectDay}
            onGoToToday={handleGoToToday}
            programmeStartDate={programmeStartDate}
          />

          {/* Content — with swipe slide animation */}
          <div
            ref={contentRef}
            className="px-4 mt-6"
            style={{
              background: 'linear-gradient(180deg, var(--surface), var(--bg))',
              transform:
                swipePhase === 'tracking'
                  ? `translateX(${Math.sign(swipeX) * Math.min(Math.abs(swipeX) * 0.3, 40)}px)`
                  : swipePhase === 'animating'
                    ? `translateX(${swipeX}px)`
                    : 'translateX(0)',
              opacity: dayLoading ? 0.4 : 1,
              transition:
                swipePhase === 'tracking' ? 'none' : 'transform 80ms ease-out, opacity 150ms ease',
            }}
          >
            {/* Error */}
            {error && (
              <Button
                variant="danger"
                label="Failed to load — tap to retry"
                onPress={syncRefetch}
                className="mb-4 h-auto py-2 text-[13px]"
              />
            )}

            {dayLoading ? (
              <DayContentSkeleton />
            ) : baselinePending ? (
              <div className="pt-2.5">
                <BaselineSessionCard
                  baselineSession={baselineSession}
                  mode="logging"
                  programmeId={baselineProgrammeId}
                  onComplete={handleBaselineComplete}
                />
              </div>
            ) : (
              <>
                {/* Rest day */}
                {dayType === 'rest' && <RestDay workout={workout} />}

                {/* LISS day (legacy V1) */}
                {dayType === 'liss' && (
                  <LissDay
                    workout={workout}
                    dayData={dayData}
                    dateStr={dateStr}
                    phase={phase}
                    totalWeek={totalWeek}
                    checklistLogs={checklistLogs}
                    cooldownItems={cooldownItems}
                    onUpdate={syncRefetch}
                    readOnly={isFutureDate}
                  />
                )}

                {/* Conditioning / sport day (V2) */}
                {dayType === 'conditioning' && (
                  <ConditioningDay
                    dayData={dayData}
                    conditioningItems={conditioningItems}
                    date={dateStr}
                    userId={user.id}
                    isFuture={isFutureDate}
                  />
                )}

                {/* Recovery day (V2) */}
                {dayType === 'recovery' && (
                  <RecoveryDay
                    dayData={dayData}
                    conditioningItems={conditioningItems}
                    date={dateStr}
                    userId={user.id}
                    isFuture={isFutureDate}
                  />
                )}

                {/* Workout day */}
                {dayType === 'workout' && (
                  <>
                    <p className="text-[11px] text-muted uppercase tracking-[2px] pt-2.5 mb-1">
                      {(() => {
                        const d = new Date(dateStr + 'T00:00:00')
                        return `${d.getDate()} ${MONTHS[d.getMonth()]}`
                      })()}{' '}
                      · WEEK {totalWeek} · PHASE {phase}
                    </p>

                    {isFutureDate && (
                      <span
                        className="text-[11px] tracking-[0.08em] uppercase text-disabled px-3 py-1 inline-flex mb-2"
                        style={{
                          background: 'var(--bg-subtle)',
                          border: '1px solid var(--surface)',
                        }}
                      >
                        UPCOMING ·{' '}
                        {(() => {
                          const d = new Date(dateStr + 'T00:00:00')
                          return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
                        })()}
                      </span>
                    )}

                    <div className="flex items-baseline justify-between">
                      <Text variant="pageTitle">{workout.title}</Text>
                      {workout.dur && (
                        <span className="font-['Bebas_Neue'] text-[20px] text-accent shrink-0 ml-3">
                          {workout.dur}&prime;
                        </span>
                      )}
                    </div>

                    {workout.sub && (
                      <Text variant="bodyMuted" className="mt-0.5">
                        {workout.sub}
                      </Text>
                    )}

                    <div className="flex items-center gap-2 mt-2">
                      {workout.kcal && (
                        <span className="text-[11px] text-muted">{workout.kcal} kcal</span>
                      )}
                      {workout.tags?.map((tag) => (
                        <Badge key={tag} label={tag} />
                      ))}
                    </div>

                    {/* Warmup */}
                    {workout.has_warmup && (
                      <WarmupSection
                        dateStr={dateStr}
                        phase={phase}
                        warmupLogs={warmupLogs}
                        warmupItems={warmupItems}
                        onUpdate={syncRefetch}
                        readOnly={isFutureDate}
                      />
                    )}

                    {/* Exercises */}
                    <div className="mt-4">
                      <SectionLabel label="Exercises" className="mb-2" />
                    </div>
                    {displayExercises.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        {displayExercises.map((ex, idx) => (
                          <ExerciseCard
                            key={`${ex.n}-${idx}`}
                            exercise={ex}
                            exerciseIndex={idx}
                            exerciseLogs={logsByExercise[ex.n] ?? []}
                            previousBest={previousBests[ex.n]}
                            isExpanded={expandedExercise === idx}
                            onToggleExpand={() =>
                              setExpandedExercise(expandedExercise === idx ? null : idx)
                            }
                            onTapSet={isFutureDate ? () => {} : handleTapSet}
                          />
                        ))}
                      </div>
                    ) : (
                      <div
                        className="py-6 text-center"
                        style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: '16px',
                        }}
                      >
                        <Text variant="bodyMuted">No exercises configured for this day.</Text>
                        <Text variant="caption" className="mt-1">
                          Seed the programme_exercises table to populate.
                        </Text>
                      </div>
                    )}

                    {/* Combined day — conditioning finisher */}
                    {hasConditioningItems && (
                      <CollapsibleConditioningBlock
                        conditioningItems={conditioningItems}
                        date={dateStr}
                        userId={user.id}
                        isFuture={isFutureDate}
                      />
                    )}

                    {/* Finisher */}
                    {workout.fin && !isFutureDate && (
                      <FinisherBlock
                        fin={workout.fin}
                        dateStr={dateStr}
                        checklistLogs={checklistLogs}
                        onUpdate={syncRefetch}
                      />
                    )}

                    {/* Cooldown */}
                    {displayCooldownItems.length > 0 && (
                      <CooldownSection
                        items={displayCooldownItems}
                        dateStr={dateStr}
                        checklistLogs={checklistLogs}
                        onUpdate={syncRefetch}
                        readOnly={isFutureDate}
                      />
                    )}
                  </>
                )}

                {/* No data */}
                {dayType === 'none' && (
                  <div className="mt-8 pt-2.5">
                    <Text variant="pageTitle" className="text-border">
                      NO DATA
                    </Text>
                    <Text variant="bodyMuted" className="mt-2">
                      No workout defined for this day in phase {phase}.
                    </Text>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Overlays */}
      {restTimer && (
        <RestTimerHUD
          durationSec={restTimer.duration}
          exerciseName={restTimer.exerciseName}
          onDismiss={handleRestTimerDismiss}
        />
      )}

      {activeSheet && (
        <SetLogSheet
          exercise={activeSheet.exercise}
          setNumber={activeSheet.setNumber}
          totalSets={activeSheet.totalSets}
          previousBest={activeSheet.prevBest}
          existingLog={activeSheet.existingLog}
          sessionId={sessionId}
          dateStr={dateStr}
          phase={phase}
          exerciseIndex={activeSheet.exerciseIndex}
          exerciseMap={exerciseMap}
          onClose={() => {
            setActiveSheet(null)
            setScreenState('orientation')
          }}
          onLogged={handleLogged}
        />
      )}

      {screenState === 'complete' && (
        <WorkoutCompleteSheet
          workout={workout}
          completedSets={completedSets}
          exerciseCount={displayExercises.length}
          onDismiss={() => {
            dismissedCompleteRef.current = true
            setScreenState('orientation')
          }}
          onRate={(sessionRpe) => {
            if (sessionId && user?.id) void rateSession(user.id, sessionId, sessionRpe)
          }}
        />
      )}
    </>
  )
}
