import { useState, useMemo, useCallback, useEffect, useRef, memo } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useLoading } from '../hooks/useLoading'
import { supabase } from '../lib/supabase'
import { logger } from '../lib/logger'
import {
  computePhaseAndWeek,
  getDayKey,
  getDayWorkout,
  getWeekDays,
  toDateStr,
} from '../utils/programme'
import { useTodayData } from '../hooks/useTodayData'
import { Text, Button, Badge, SectionLabel, Toggle } from '../components/ui'

import PhaseCard from '../components/today/PhaseCard'
import WarmupSection from '../components/today/WarmupSection'
import ExerciseCard from '../components/today/ExerciseCard'
import SetLogSheet from '../components/today/SetLogSheet'
import RestTimerHUD from '../components/today/RestTimerHUD'
import LissDay from '../components/today/LissDay'
import WorkoutCompleteSheet from '../components/today/WorkoutCompleteSheet'
import TodaySkeleton from '../components/today/TodaySkeleton'

// ───────────────────────────────────────────
// Top Bar (inline — small component)
// ───────────────────────────────────────────
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

const TopBar = memo(function TopBar({ phase, totalWeek, syncStatus }) {
  const now = new Date()
  const sync = syncStatus || 'synced'
  const dotColor = sync === 'synced' ? 'bg-[#22c55e]' : sync === 'saving' ? 'bg-[#f59e0b]' : 'bg-[#ef4444]'
  const labelText = sync === 'synced' ? 'SYNCED' : sync === 'saving' ? 'SAVING' : 'OFFLINE'

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-[#111111] safe-area-top">
      <div className="h-14 px-4 flex items-center justify-between">
        <span className="text-xl font-black text-[#ff4520] w-10">Gx</span>
        <Text variant="label" className="tracking-widest">
          {DAYS[now.getDay()]} {now.getDate()} {MONTHS[now.getMonth()]} · W{totalWeek} · P{phase}
        </Text>
        <div className="flex items-center justify-end gap-1.5 min-h-[44px] min-w-[44px]">
          <div className={`w-1.5 h-1.5 rounded-full ${dotColor} ${sync === 'saving' ? 'animate-pulse' : ''}`} />
          <span className="text-[10px] tracking-widest uppercase text-[#444444]">
            {labelText}
          </span>
        </div>
      </div>
    </div>
  )
})

// ───────────────────────────────────────────
// Rest Day (inline — tiny)
// ───────────────────────────────────────────
const RestDay = memo(function RestDay({ workout }) {
  return (
    <div className="mt-4">
      <Text variant="pageTitle" className="text-[#222222]">{workout?.title || 'REST DAY'}</Text>
      <Text variant="bodyMuted" className="mt-2">{workout?.sub || 'Recovery · Sleep · Meal Prep'}</Text>
      <div className="mt-8 bg-[#111111] border border-[#1a1a1a] p-5 text-center">
        <p className="text-[40px]">😴</p>
        <Text variant="body" className="text-[#444444] mt-2">Nothing to log today.</Text>
        <Text variant="caption" className="mt-1">Rest is part of the programme.</Text>
      </div>
    </div>
  )
})

// ───────────────────────────────────────────
// Finisher block
// ───────────────────────────────────────────
function FinisherBlock({ fin, dateStr, checklistLogs, onUpdate }) {
  const { user } = useAuth()
  const existing = checklistLogs.find(l => l.item_key === 'fin-main' && l.item_type === 'finisher')
  const isLogged = existing?.completed || false

  const [finInputs, setFinInputs] = useState(() => {
    if (isLogged && existing?.notes) {
      try { return JSON.parse(existing.notes) } catch { return {} }
    }
    return {}
  })

  const isCardio = fin.type === 'cardio'
  const hasDuration = !!finInputs.duration

  async function handleLogFinisher() {
    if (isCardio && !hasDuration) return
    if (navigator.vibrate) navigator.vibrate(50)

    const notes = {}
    if (isCardio) {
      if (finInputs.incline) notes.incline = parseFloat(finInputs.incline)
      if (finInputs.speed) notes.speed = parseFloat(finInputs.speed)
      if (finInputs.duration) notes.duration = parseFloat(finInputs.duration)
    }

    await supabase.from('checklist_logs').upsert({
      user_id: user.id,
      date: dateStr,
      item_type: 'finisher',
      item_key: 'fin-main',
      completed: true,
      notes: JSON.stringify(notes),
    }, { onConflict: 'user_id,date,item_key' })
    onUpdate()
  }

  return (
    <div className="mt-6">
      <SectionLabel label="Finisher" className="mb-3" />

      <h4 className="text-[16px] font-semibold text-white">{fin.title}</h4>
      {fin.desc && <p className="text-[15px] text-white leading-[1.9] mt-1">{fin.desc}</p>}

      {fin.rounds && fin.rounds.length > 0 && (
        <div className="mt-2">
          {fin.rounds.map((round, i) => (
            <p key={i} className="text-[15px] text-white leading-[1.9]">{round}</p>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mt-2">
        {fin.dur && <span className="text-[12px] text-[#555555]">{fin.dur}</span>}
        {fin.kcal && <><span className="text-[12px] text-[#333333]">·</span><span className="text-[12px] text-[#555555]">{fin.kcal}</span></>}
      </div>

      {/* Cardio finisher: 3-input layout */}
      {isCardio && (
        <div className="flex gap-2 mt-4">
          {[
            { name: 'incline', unit: '%', placeholder: '7' },
            { name: 'speed', unit: 'km/h', placeholder: '5.5' },
            { name: 'duration', unit: 'min', placeholder: '20' },
          ].map(({ name, unit, placeholder }) => (
            <div
              key={name}
              className="flex-1 bg-[#111111] border border-[#2a2a2a] focus-within:border-[#ff4520] p-4 flex flex-col items-center transition-colors"
            >
              <label className="text-[9px] font-bold tracking-[0.1em] uppercase text-[#555555] mb-2">
                {name.charAt(0).toUpperCase() + name.slice(1)}
              </label>
              <input
                type="number"
                inputMode="decimal"
                step={name === 'speed' ? '0.1' : '1'}
                value={finInputs[name] || ''}
                onChange={e => setFinInputs(prev => ({ ...prev, [name]: e.target.value }))}
                readOnly={isLogged}
                className="w-full bg-transparent text-center text-[24px] font-black text-white placeholder-[#555555] focus:outline-none"
                placeholder={placeholder}
              />
              <span className="text-[10px] text-[#444444] mt-1">{unit}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <Button
          variant={isLogged ? 'success' : 'primary'}
          label={isLogged ? '✓ FINISHER LOGGED' : 'LOG FINISHER'}
          onPress={handleLogFinisher}
          disabled={isLogged || (isCardio && !hasDuration)}
        />
      </div>

      {isLogged && isCardio && (
        <Text variant="caption" className="text-center mt-2 font-medium">
          {finInputs.incline && `${finInputs.incline}%`}
          {finInputs.speed && ` · ${finInputs.speed} km/h`}
          {finInputs.duration && ` · ${finInputs.duration} min`}
        </Text>
      )}
    </div>
  )
}

// ───────────────────────────────────────────
// Cooldown section
// ───────────────────────────────────────────
function CooldownSection({ items, dateStr, checklistLogs, onUpdate }) {
  const { user } = useAuth()
  const completedKeys = new Set(checklistLogs.filter(l => l.completed).map(l => l.item_key))

  async function toggle(key) {
    const done = completedKeys.has(key)
    await supabase.from('checklist_logs').upsert({
      user_id: user.id,
      date: dateStr,
      item_type: 'cooldown',
      item_key: key,
      completed: !done,
    }, { onConflict: 'user_id,date,item_key' })
    onUpdate()
  }

  return (
    <div className="mt-6 mb-4">
      <SectionLabel label="Cooldown" className="mb-2" />
      <div className="border border-[#1a1a1a]">
        {items.map((item, idx) => {
          const key = `cd-${idx}`
          const done = completedKeys.has(key)
          return (
            <button
              key={key}
              className={`w-full flex items-center gap-3 px-3 py-3 text-left active:bg-[#1a1a1a] transition-colors ${
                idx > 0 ? 'border-t border-[#111111]' : ''
              }`}
              onClick={() => toggle(key)}
              aria-label={`${item} — ${done ? 'completed' : 'not completed'}`}
            >
              <div className={`w-5 h-5 flex items-center justify-center shrink-0 transition-colors ${
                done ? 'bg-[#22c55e] text-white' : 'border border-[#2a2a2a] text-transparent'
              }`}>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className={`text-[13px] ${done ? 'text-[#555555] line-through' : 'text-[#999999]'}`}>
                {item}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

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
    if (loading) startLoading()
    else stopLoading()
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

  // ── Can go back ──
  const canGoBack = useMemo(() => {
    if (!config?.start_date) return false
    const startDate = new Date(config.start_date + 'T00:00:00')
    return weekDays[0].date > startDate
  }, [config, weekDays])

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
    <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col">
      <TopBar phase={phase} totalWeek={totalWeek} syncStatus={syncStatus} />

      <div
        className="flex-1 overflow-y-auto scroll-offset pb-32"
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
          className="px-4 pt-4 transition-transform duration-150 ease-out"
          style={{
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
              {/* Workout header — LISS style, no card */}
              <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#444444]">
                {(() => {
                  const d = new Date(dateStr + 'T00:00:00')
                  return `${d.getDate()} ${MONTHS[d.getMonth()]} · WEEK ${totalWeek} · PHASE ${phase}`
                })()}
              </p>

              <div className="flex items-baseline justify-between mt-2">
                <Text variant="pageTitle">{workout.title}</Text>
                {workout.dur && (
                  <span className="text-[22px] font-black text-[#ff4520] tracking-tight shrink-0 ml-3">
                    {workout.dur}&prime;
                  </span>
                )}
              </div>

              {workout.sub && (
                <Text variant="bodyMuted" className="mt-1.5">{workout.sub}</Text>
              )}

              <div className="flex items-center gap-2 mt-3">
                {workout.kcal && <Badge label={`${workout.kcal} KCAL`} variant="accent" />}
                {workout.tags?.map(tag => (
                  <Badge key={tag} label={tag} variant="accent" />
                ))}
              </div>

              {/* Travel toggle */}
              <div className="flex items-center justify-between mt-4 py-3 border-t border-b border-[#111111]">
                <div className="flex items-center gap-2">
                  <span className="text-[14px]">✈</span>
                  <Text variant="body" className="text-[#666666]">Travelling?</Text>
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
              <div className="mt-5">
                <SectionLabel label="Exercises" className="mb-2" />
              </div>
              <div className="flex flex-col gap-2">
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
              <Text variant="pageTitle" className="text-[#222222]">NO DATA</Text>
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
    </div>
  )
}
