import { useState, useMemo, useCallback, useEffect, useRef, memo } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useLoading } from '../hooks/useLoading'
import {
  computePhaseAndWeek,
  getDayKey,
  getDayWorkout,
  getWeekDays,
  toDateStr,
} from '../utils/programme'
import { useTodayData } from '../hooks/useTodayData'
import { Text, Button, Badge, SectionLabel, Toggle } from '../components/ui'
import TopBar from '../components/layout/TopBar'

import PhaseCard from '../components/today/PhaseCard'
import WarmupSection from '../components/today/WarmupSection'
import ExerciseCard from '../components/today/ExerciseCard'
import SetLogSheet from '../components/today/SetLogSheet'
import RestTimerHUD from '../components/today/RestTimerHUD'
import LissDay from '../components/today/LissDay'
import WorkoutCompleteSheet from '../components/today/WorkoutCompleteSheet'
import CooldownSection from '../components/today/CooldownSection'
import FinisherBlock from '../components/today/FinisherBlock'
import TodaySkeleton from '../components/today/TodaySkeleton'

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

function SyncIndicator({ syncStatus }) {
  const sync = syncStatus || 'synced'
  const dotColor = sync === 'synced' ? 'bg-[#22c55e]' : sync === 'saving' ? 'bg-[#f59e0b]' : 'bg-[#ef4444]'
  const labelText = sync === 'synced' ? 'synced' : sync === 'saving' ? 'saving' : 'offline'
  return (
    <div className="flex items-center gap-[6px] min-h-[44px] min-w-[44px] justify-end">
      <span className="text-[11px] text-[#666666]">{labelText}</span>
      <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor} ${sync === 'saving' ? 'animate-pulse' : ''}`} style={{ transition: 'background .3s' }} />
    </div>
  )
}

function TodayTopBar({ phase, totalWeek, syncStatus }) {
  const now = new Date()
  return (
    <TopBar
      title={`${DAYS[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]} · W${totalWeek} · P${phase}`}
      rightContent={<SyncIndicator syncStatus={syncStatus} />}
    />
  )
}

const RestDay = memo(function RestDay({ workout }) {
  return (
    <div className="pt-2.5">
      <Text variant="pageTitle" className="text-[#666666]">{workout?.title || 'REST DAY'}</Text>
      <Text variant="bodyMuted" className="mt-2">{workout?.sub || 'Recovery · Sleep · Meal Prep'}</Text>
      <div className="mt-4 p-8 text-center" style={{ background: '#141414', border: '1px solid #2a2a2a', borderRadius: '16px' }}>
        <p className="text-[48px] mb-3">😴</p>
        <h2 className="font-['Bebas_Neue'] text-[26px] tracking-[2px] text-[#f0ede8] mb-2">REST DAY</h2>
        <Text variant="bodyMuted">Nothing to log today.</Text>
        <Text variant="caption" className="mt-1 max-w-[260px] mx-auto leading-[1.6]">Rest is part of the programme.</Text>
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
  const [syncStatus, setSyncStatus] = useState('synced') // 'synced' | 'saving' | 'error'

  // ── Navigation ──
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDayLabel, setSelectedDayLabel] = useState(getDayKey(new Date()))

  // ── Interaction ──
  const [expandedExercise, setExpandedExercise] = useState(null)
  const [activeSheet, setActiveSheet] = useState(null)
  const [restTimer, setRestTimer] = useState(null)
  const [completedSets, setCompletedSets] = useState({})
  const [isTravelMode, setIsTravelMode] = useState(false)

  // ── Swipe navigation ──
  const touchRef = useRef({ startX: 0, startY: 0 })
  const [swipeAnim, setSwipeAnim] = useState(null) // 'left' | 'right' | null
  const contentRef = useRef(null)

  // ── Computed dates ──
  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset])
  const selectedDay = useMemo(
    () => weekDays.find(d => d.dayLabel === selectedDayLabel) || weekDays[0],
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
    phases,
    dayData,
    programmeExercises,
    warmupItems,
    cooldownItems,
    loading,
    hasCachedData,
    error,
    refetch,
  } = useTodayData(dateStr, weekDays[0].dateStr, weekDays[5].dateStr, selectedDayLabel)

  // ── Sync status derived from data hook ──
  useEffect(() => {
    if (error) setSyncStatus('error')
    else if (loading) setSyncStatus('saving')
    else setSyncStatus('synced')
  }, [loading, error])

  // ── Loading bar ──
  useEffect(() => {
    if (loading) {
      startLoading()
      return () => stopLoading()
    }
  }, [loading, startLoading, stopLoading])

  // Wrapped refetch that flashes saving state
  const syncRefetch = useCallback(async () => {
    setSyncStatus('saving')
    await refetch()
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

  // ── Workout for selected day ──
  // Prefer DB dayData; fall back to exercises.json
  const workout = useMemo(() => {
    const jsonWorkout = getDayWorkout(phase, selectedDayLabel)

    if (dayData) {
      // Merge DB dayData with JSON fallback for exercise list
      return {
        ...jsonWorkout,
        title: dayData.title || jsonWorkout?.title,
        sub: dayData.subtitle || jsonWorkout?.sub,
        dur: dayData.duration_min ? String(dayData.duration_min) : jsonWorkout?.dur,
        kcal: dayData.kcal_range || jsonWorkout?.kcal,
        tags: dayData.tags || jsonWorkout?.tags,
        workout_type: dayData.workout_type,
        has_warmup: dayData.has_warmup,
        // Keep JSON exercise data as fallback if no DB exercises yet
        ex: jsonWorkout?.ex,
        fin: jsonWorkout?.fin,
        cd: jsonWorkout?.cd,
        wu: jsonWorkout?.wu,
        isRest: dayData.workout_type === 'rest',
        isLiss: dayData.workout_type === 'liss',
      }
    }

    return jsonWorkout
  }, [phase, selectedDayLabel, dayData])

  // ── Map DB programme exercises → ExerciseCard format ──
  // Falls back to workout.ex (JSON) when no DB exercises seeded yet
  const displayExercises = useMemo(() => {
    if (programmeExercises && programmeExercises.length > 0) {
      return programmeExercises.map(pe => ({
        n: pe.exercises?.name || pe.exercise_name || 'Unknown',
        s: pe.sets_reps || '3×12',
        r: pe.rest || '60s',
        note: pe.notes || null,
        warn: pe.warn || null,
        eq: pe.exercises?.equipment ? [pe.exercises.equipment] : [],
        icon: pe.icon || null,
        // Extra DB fields for future use
        _bodyPart: pe.exercises?.body_part,
        _targetMuscle: pe.exercises?.target_muscle,
        _gifUrl: pe.exercises?.gif_url,
      }))
    }

    if (import.meta.env.DEV && dayData?.workout_type === 'workout' && !programmeExercises) {
      console.warn('[Gx] No programme_exercises for this day — using JSON fallback')
    }

    return workout?.ex || []
  }, [programmeExercises, workout?.ex, dayData?.workout_type])

  // ── Map DB cooldown items → CooldownSection format ──
  // Falls back to workout.cd (JSON strings) when no DB cooldown items
  const displayCooldownItems = useMemo(() => {
    if (cooldownItems && cooldownItems.length > 0) {
      return cooldownItems.map(ci => ci.label || ci.item_key)
    }
    return workout?.cd || []
  }, [cooldownItems, workout?.cd])

  // Determine day type
  const dayType = workout?.isRest
    ? 'rest'
    : workout?.isLiss
    ? 'liss'
    : workout?.ex || (dayData?.workout_type === 'workout')
    ? 'workout'
    : 'none'

  // ── Session for selected date ──
  const sessionForDate = useMemo(
    () => sessions.find(s => s.date === dateStr),
    [sessions, dateStr]
  )
  const sessionId = sessionForDate?.id || null

  // ── Completed days for week strip ──
  const completedDateStrs = useMemo(() => {
    const set = new Set()
    for (const s of sessions) {
      const inWeek = weekDays.some(wd => wd.dateStr === s.date)
      if (inWeek) set.add(s.date)
    }
    return set
  }, [sessions, weekDays])

  // ── Current week active days (for qualifying) ──
  const currentWeekActiveDays = useMemo(() => {
    let count = 0
    for (const s of sessions) {
      if (s.day_of_week === 'SUN') continue
      if (weekDays.some(wd => wd.dateStr === s.date)) count++
    }
    return count
  }, [sessions, weekDays])

  // ── Week navigation bounds ──
  // Navigate back to the programme start week, forward up to current week
  const canGoBack = useMemo(() => {
    if (!config?.start_date) return false
    const sd = new Date(config.start_date + 'T00:00:00')
    const dow = sd.getDay()
    const startMonday = new Date(sd)
    startMonday.setDate(sd.getDate() - (dow === 0 ? 6 : dow - 1))
    startMonday.setHours(0, 0, 0, 0)
    return weekDays[0].date > startMonday
  }, [config, weekDays])

  const canGoForward = weekOffset < 0

  // ── Pre-populate completedSets from exercise_logs ──
  useEffect(() => {
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
    setCompletedSets(map)
  }, [logs])

  // ── Auto-expand first incomplete exercise ──
  useEffect(() => {
    if (dayType !== 'workout' || displayExercises.length === 0) return
    const firstIncomplete = displayExercises.findIndex((ex) => {
      const sets = parseInt(ex.s.split('×')[0])
      const logged = logs.filter(l => l.exercise_name === ex.n && !l.is_mm_set && l.completed)
      return logged.length < sets
    })
    setExpandedExercise(firstIncomplete >= 0 ? firstIncomplete : null)
  }, [logs, displayExercises, dayType])

  // ── Check if all exercises complete ──
  useEffect(() => {
    if (dayType !== 'workout' || displayExercises.length === 0 || screenState === 'complete') return
    const allDone = displayExercises.every((ex) => {
      const sets = parseInt(ex.s.split('×')[0])
      const logged = logs.filter(l => l.exercise_name === ex.n && !l.is_mm_set && l.completed)
      return logged.length >= sets
    })
    if (allDone && logs.length > 0) {
      setScreenState('complete')
    }
  }, [logs, displayExercises, dayType, screenState])

  // ── Today date for comparisons ──
  const todayDateStr = useMemo(() => {
    const d = new Date()
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0')
  }, [])

  // ── Handlers ──
  function handleSelectDay(dayLabel, dateStr, date) {
    setSelectedDayLabel(dayLabel)
    setExpandedExercise(null)
    setActiveSheet(null)
    setScreenState('orientation')
  }

  function handlePrevWeek() {
    const newOffset = weekOffset - 1
    setWeekOffset(newOffset)
    const newWeekDays = getWeekDays(newOffset)
    const sameDay = newWeekDays.find(d => d.dayLabel === selectedDayLabel)
    if (sameDay && sameDay.dateStr > todayDateStr) {
      setSelectedDayLabel('MON')
    }
    setScreenState('orientation')
  }

  function handleNextWeek() {
    const newOffset = weekOffset + 1
    setWeekOffset(newOffset)
    const newWeekDays = getWeekDays(newOffset)
    const sameDay = newWeekDays.find(d => d.dayLabel === selectedDayLabel)
    if (sameDay && sameDay.dateStr > todayDateStr) {
      setSelectedDayLabel('MON')
    }
    setScreenState('orientation')
  }

  function handleGoToToday() {
    setWeekOffset(0)
    setSelectedDayLabel(getDayKey(new Date()))
    setExpandedExercise(null)
    setActiveSheet(null)
    setScreenState('orientation')
  }

  function handleTapSet(exercise, setNumber, totalSets, prevBest, existingLog, exerciseIndex, restSec) {
    setActiveSheet({ exercise, setNumber, totalSets, prevBest, existingLog, exerciseIndex, restSec })
    setScreenState('active')
  }

  // ── Swipe day navigation ──
  const DAY_SEQ = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

  function navigateDay(direction) {
    const idx = DAY_SEQ.indexOf(selectedDayLabel)
    if (idx === -1) return

    if (direction === 'next') {
      if (idx < 5) {
        // Check if next day is in the future
        const nextDay = weekDays[idx + 1]
        if (nextDay && nextDay.dateStr > todayDateStr) return
        setSelectedDayLabel(DAY_SEQ[idx + 1])
      } else {
        // On SAT → next week MON (only past weeks)
        if (weekOffset >= 0) return
        setWeekOffset(prev => prev + 1)
        setSelectedDayLabel('MON')
      }
    } else {
      if (idx > 0) {
        setSelectedDayLabel(DAY_SEQ[idx - 1])
      } else {
        // On MON → previous week SAT
        if (!canGoBack) return
        setWeekOffset(prev => prev - 1)
        setSelectedDayLabel('SAT')
      }
    }

    setExpandedExercise(null)
    setActiveSheet(null)
    setScreenState('orientation')
    setSwipeAnim(direction === 'next' ? 'left' : 'right')
  }

  function handleTouchStart(e) {
    touchRef.current.startX = e.touches[0].clientX
    touchRef.current.startY = e.touches[0].clientY
  }

  function handleTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - touchRef.current.startX
    const dy = e.changedTouches[0].clientY - touchRef.current.startY
    if (Math.abs(dx) > 50 && Math.abs(dy) < 30) {
      navigateDay(dx < 0 ? 'next' : 'prev')
    }
  }

  // Clear swipe animation after transition
  useEffect(() => {
    if (!swipeAnim) return
    const t = setTimeout(() => setSwipeAnim(null), 150)
    return () => clearTimeout(t)
  }, [swipeAnim])

  const handleLogged = useCallback((sid) => {
    const restSec = activeSheet?.restSec || 60
    const exName = activeSheet?.exercise?.n || ''
    const setNum = activeSheet?.setNumber
    const weight = activeSheet ? parseFloat(document.querySelector('input[type="number"]')?.value || '0') : 0

    setActiveSheet(null)
    setRestTimer({ duration: restSec, exerciseName: exName })

    // Update completedSets locally for instant feedback
    if (exName && setNum) {
      setCompletedSets(prev => ({
        ...prev,
        [`${exName}-${setNum}`]: { weight: weight || 0, reps: 0, rpe: null },
      }))
    }

    syncRefetch()
  }, [activeSheet, syncRefetch])

  function handleRestTimerDismiss() {
    setRestTimer(null)
    if (screenState === 'active') setScreenState('orientation')
  }

  // ── Loading — show skeleton only when no cached data ──
  if (loading && !hasCachedData) {
    return <TodaySkeleton />
  }

  // ── Render ──
  return (
    <>
      <TodayTopBar phase={phase} totalWeek={totalWeek} syncStatus={syncStatus} />

      <div
        className="flex-1 overflow-y-auto pb-8"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Phase card + day pills */}
        <PhaseCard
          phase={phase}
          weekInPhase={phaseInfo.weekInPhase}
          totalWeek={totalWeek}
          phaseWeeks={config?.phase_weeks || [4, 4, 5, 4, 999]}
          minActiveDays={config?.min_active_days || 4}
          currentWeekActiveDays={currentWeekActiveDays}
          weekOffset={weekOffset}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
          canGoBack={canGoBack}
          canGoForward={canGoForward}
          programme={programme}
          phases={phases}
          weekDays={weekDays}
          selectedDateStr={dateStr}
          completedDateStrs={completedDateStrs}
          onSelectDay={handleSelectDay}
          onGoToToday={handleGoToToday}
        />

        {/* Content — with swipe slide animation */}
        <div
          ref={contentRef}
          className="px-4 mt-6 transition-transform duration-150 ease-out"
          style={{
            background: 'linear-gradient(180deg, #1a1a1a, #0a0a0a)',
            transform: swipeAnim === 'left'
              ? 'translateX(-8px)'
              : swipeAnim === 'right'
              ? 'translateX(8px)'
              : 'translateX(0)',
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

          {/* Rest day */}
          {dayType === 'rest' && <RestDay workout={workout} />}

          {/* LISS day */}
          {dayType === 'liss' && (
            <LissDay
              workout={workout}
              dayData={dayData}
              dateStr={dateStr}
              phase={phase}
              totalWeek={totalWeek}
              checklistLogs={checklistLogs}
              cooldownItems={cooldownItems}
              isTravelMode={isTravelMode}
              onToggleTravel={() => setIsTravelMode(p => !p)}
              onUpdate={syncRefetch}
            />
          )}

          {/* Workout day */}
          {dayType === 'workout' && (
            <>
              {/* Workout header */}
              <p className="text-[11px] text-[#666666] uppercase tracking-[2px] pt-2.5 mb-1">
                {(() => {
                  const d = new Date(dateStr + 'T00:00:00')
                  return `${d.getDate()} ${MONTHS[d.getMonth()]} · WEEK ${totalWeek} · PHASE ${phase}`
                })()}
              </p>

              <div className="flex items-baseline justify-between">
                <Text variant="pageTitle">{workout.title}</Text>
                {workout.dur && (
                  <span className="font-['Bebas_Neue'] text-[20px] text-[#ff4520] shrink-0 ml-3">
                    {workout.dur}&prime;
                  </span>
                )}
              </div>

              {workout.sub && (
                <Text variant="bodyMuted" className="mt-0.5">{workout.sub}</Text>
              )}

              <div className="flex items-center gap-2 mt-2">
                {workout.kcal && (
                  <span className="text-[11px] text-[#666666]">
                    {workout.kcal} kcal
                  </span>
                )}
                {workout.tags?.map(tag => (
                  <Badge key={tag} label={tag} />
                ))}
              </div>

              {/* Travel toggle */}
              <div
                className="flex items-center justify-between mt-3 py-[14px] px-[14px] cursor-pointer active:scale-[0.98] transition-transform duration-150"
                style={{ background: 'rgba(6,182,212,0.06)', border: '1.5px solid rgba(6,182,212,0.2)', borderRadius: '14px' }}
                onClick={() => setIsTravelMode(p => !p)}
              >
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] font-bold text-[#06b6d4] tracking-[0.3px]">✈ Travel Mode</span>
                  <p className="text-[11px] text-[#666666] mt-0.5">Swap gym gear for bodyweight</p>
                </div>
                <Toggle value={isTravelMode} onChange={() => setIsTravelMode(p => !p)} />
              </div>

              {/* Warmup */}
              {(workout.wu || workout.has_warmup) && (
                <WarmupSection
                  dateStr={dateStr}
                  phase={phase}
                  warmupLogs={warmupLogs}
                  warmupItems={warmupItems}
                  onUpdate={syncRefetch}
                />
              )}

              {/* Exercises */}
              <div className="mt-4">
                <SectionLabel label="Exercises" className="mb-2" />
              </div>
              <div className="flex flex-col gap-3">
                {displayExercises.map((ex, idx) => (
                  <ExerciseCard
                    key={`${ex.n}-${idx}`}
                    exercise={ex}
                    exerciseIndex={idx}
                    exerciseLogs={logs.filter(l => l.exercise_name === ex.n)}
                    previousBest={previousBests[ex.n]}
                    isExpanded={expandedExercise === idx}
                    onToggleExpand={() => setExpandedExercise(expandedExercise === idx ? null : idx)}
                    onTapSet={handleTapSet}
                  />
                ))}
              </div>

              {/* Finisher */}
              {workout.fin && (
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
                />
              )}
            </>
          )}

          {/* No data */}
          {dayType === 'none' && (
            <div className="mt-8">
              <Text variant="pageTitle" className="text-[#2a2a2a]">NO DATA</Text>
              <Text variant="bodyMuted" className="mt-2">
                No workout defined for this day in phase {phase}.
              </Text>
            </div>
          )}
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
          onClose={() => { setActiveSheet(null); setScreenState('orientation') }}
          onLogged={handleLogged}
        />
      )}

      {screenState === 'complete' && (
        <WorkoutCompleteSheet
          workout={workout}
          completedSets={completedSets}
          onDismiss={() => setScreenState('orientation')}
        />
      )}
    </>
  )
}
