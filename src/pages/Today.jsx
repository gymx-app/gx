import { useState, useMemo, useCallback, useEffect } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useLoading } from '../hooks/useLoading'
import { supabase } from '../lib/supabase'
import {
  computePhaseAndWeek,
  getDayKey,
  getDayWorkout,
  getWeekDays,
  getWeekNumber,
  toDateStr,
} from '../utils/programme'
import { useTodayData } from '../hooks/useTodayData'

import WeekStrip from '../components/today/WeekStrip'
import PhaseCard from '../components/today/PhaseCard'
import WarmupSection from '../components/today/WarmupSection'
import ExerciseCard from '../components/today/ExerciseCard'
import SetLogSheet from '../components/today/SetLogSheet'
import RestTimerHUD from '../components/today/RestTimerHUD'
import LissDay from '../components/today/LissDay'
import WorkoutCompleteSheet from '../components/today/WorkoutCompleteSheet'

// ───────────────────────────────────────────
// Top Bar (inline — small component)
// ───────────────────────────────────────────
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

function TopBar({ phase, totalWeek, syncStatus }) {
  const now = new Date()
  const sync = syncStatus || 'synced'
  const dotColor = sync === 'synced' ? 'bg-[#22c55e]' : sync === 'saving' ? 'bg-[#f59e0b]' : 'bg-[#ef4444]'
  const labelText = sync === 'synced' ? 'SYNCED' : sync === 'saving' ? 'SAVING' : 'OFFLINE'

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-[#111111] safe-area-top">
      <div className="h-14 px-4 flex items-center justify-between">
        <span className="text-xl font-black text-[#ff4520] w-10">Gx</span>
        <span className="text-[11px] tracking-widest uppercase text-[#555555]">
          {DAYS[now.getDay()]} {now.getDate()} {MONTHS[now.getMonth()]} · W{totalWeek} · P{phase}
        </span>
        <div className="flex items-center justify-end gap-1.5 min-h-[44px] min-w-[44px]">
          <div className={`w-1.5 h-1.5 rounded-full ${dotColor} ${sync === 'saving' ? 'animate-pulse' : ''}`} />
          <span className="text-[10px] tracking-widest uppercase text-[#444444]">
            {labelText}
          </span>
        </div>
      </div>
    </div>
  )
}

// ───────────────────────────────────────────
// Rest Day (inline — tiny)
// ───────────────────────────────────────────
function RestDay({ workout }) {
  return (
    <div className="mt-4">
      <h1 className="text-3xl font-black tracking-[-0.04em] text-[#222222]">{workout?.title || 'REST DAY'}</h1>
      <p className="text-[13px] text-[#333333] mt-2">{workout?.sub || 'Recovery · Sleep · Meal Prep'}</p>
      <div className="mt-8 bg-[#111111] border border-[#1a1a1a] p-5 text-center">
        <p className="text-[40px]">😴</p>
        <p className="text-[14px] text-[#444444] mt-2">Nothing to log today.</p>
        <p className="text-[12px] text-[#333333] mt-1">Rest is part of the programme.</p>
      </div>
    </div>
  )
}

// ───────────────────────────────────────────
// Finisher block
// ───────────────────────────────────────────
function FinisherBlock({ fin, dateStr, checklistLogs, onUpdate }) {
  const { user } = useAuth()
  const completedKeys = new Set(checklistLogs.filter(l => l.completed).map(l => l.item_key))
  const finKey = 'fin-main'
  const done = completedKeys.has(finKey)

  async function toggle() {
    await supabase.from('checklist_logs').upsert({
      user_id: user.id,
      date: dateStr,
      item_type: 'finisher',
      item_key: finKey,
      completed: !done,
    }, { onConflict: 'user_id,date,item_key' })
    onUpdate()
  }

  return (
    <div className="mt-5">
      <span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-[#444444] block mb-2">
        Finisher
      </span>
      <div className="bg-[#111111] border border-[#1a1a1a] p-4">
        <h4 className="text-[14px] font-bold text-white">{fin.title}</h4>
        {fin.desc && <p className="text-[12px] text-[#555555] mt-1">{fin.desc}</p>}
        <div className="flex gap-3 mt-2">
          {fin.dur && <span className="text-[11px] text-[#444444]">{fin.dur}</span>}
          {fin.kcal && <span className="text-[11px] text-[#444444]">{fin.kcal}</span>}
        </div>
        {fin.rounds && fin.rounds.length > 0 && (
          <div className="mt-3 border-t border-[#1a1a1a] pt-3">
            {fin.rounds.map((round, i) => (
              <p key={i} className="text-[12px] text-[#666666] mt-1">{round}</p>
            ))}
          </div>
        )}
        <button
          onClick={toggle}
          className={`mt-3 w-full py-2.5 text-[12px] font-bold tracking-wider uppercase transition-colors ${
            done
              ? 'bg-[#22c55e]/10 border border-[#22c55e] text-[#22c55e]'
              : 'bg-[#1a1a1a] border border-[#2a2a2a] text-[#888888] active:bg-[#222222]'
          }`}
        >
          {done ? 'DONE ✓' : 'MARK DONE'}
        </button>
      </div>
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
    <div className="mt-5 mb-4">
      <span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-[#444444] block mb-2">
        Cooldown
      </span>
      <div className="border border-[#1a1a1a]">
        {items.map((item, idx) => {
          const key = `cd-${idx}`
          const done = completedKeys.has(key)
          return (
            <button
              key={key}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left active:bg-[#1a1a1a] ${
                idx > 0 ? 'border-t border-[#111111]' : ''
              }`}
              onClick={() => toggle(key)}
            >
              <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                done ? 'bg-[#22c55e]' : 'border border-[#2a2a2a]'
              }`}>
                {done && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={`text-[13px] ${done ? 'text-[#444444]' : 'text-[#888888]'}`}>
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
    loading,
    error,
    refetch,
  } = useTodayData(dateStr, weekDays[0].dateStr, weekDays[5].dateStr)

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
  const workout = useMemo(() => getDayWorkout(phase, selectedDayLabel), [phase, selectedDayLabel])

  // Determine day type
  const dayType = workout?.isRest
    ? 'rest'
    : workout?.isLiss
    ? 'liss'
    : workout?.ex
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
    if (dayType !== 'workout' || !workout?.ex) return
    const exercises = workout.ex
    const firstIncomplete = exercises.findIndex((ex) => {
      const sets = parseInt(ex.s.split('×')[0])
      const logged = logs.filter(l => l.exercise_name === ex.n && !l.is_mm_set && l.completed)
      return logged.length < sets
    })
    setExpandedExercise(firstIncomplete >= 0 ? firstIncomplete : null)
  }, [logs, workout, dayType])

  // ── Check if all exercises complete ──
  useEffect(() => {
    if (dayType !== 'workout' || !workout?.ex || screenState === 'complete') return
    const allDone = workout.ex.every((ex) => {
      const sets = parseInt(ex.s.split('×')[0])
      const logged = logs.filter(l => l.exercise_name === ex.n && !l.is_mm_set && l.completed)
      return logged.length >= sets
    })
    if (allDone && logs.length > 0) {
      setScreenState('complete')
    }
  }, [logs, workout, dayType, screenState])

  // ── Handlers ──
  function handleSelectDay(dayLabel, dateStr, date) {
    setSelectedDayLabel(dayLabel)
    setExpandedExercise(null)
    setActiveSheet(null)
    setScreenState('orientation')
  }

  function handlePrevWeek() {
    setWeekOffset(prev => prev - 1)
    setSelectedDayLabel('MON')
    setScreenState('orientation')
  }

  function handleNextWeek() {
    setWeekOffset(prev => prev + 1)
    setSelectedDayLabel('MON')
    setScreenState('orientation')
  }

  function handleTapSet(exercise, setNumber, totalSets, prevBest, existingLog, exerciseIndex, restSec) {
    setActiveSheet({ exercise, setNumber, totalSets, prevBest, existingLog, exerciseIndex, restSec })
    setScreenState('active')
  }

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

  // ── Loading ──
  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center">
        <span className="text-4xl font-black text-[#1a1a1a]">GX</span>
      </div>
    )
  }

  // ── Render ──
  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col">
      <TopBar phase={phase} totalWeek={totalWeek} syncStatus={syncStatus} />

      <div className="flex-1 overflow-y-auto scroll-offset pb-32">
        {/* Phase card */}
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
        />

        {/* Week strip */}
        <WeekStrip
          weekDays={weekDays}
          selectedDateStr={dateStr}
          completedDateStrs={completedDateStrs}
          onSelectDay={handleSelectDay}
        />

        {/* Content */}
        <div className="px-4 pt-4">
          {/* Error */}
          {error && (
            <button
              onClick={syncRefetch}
              className="w-full bg-[#1a1a1a] border border-[#ef4444] text-[#ef4444] text-[13px] px-4 py-2 mb-4 text-left"
            >
              Failed to load — tap to retry
            </button>
          )}

          {/* Rest day */}
          {dayType === 'rest' && <RestDay workout={workout} />}

          {/* LISS day */}
          {dayType === 'liss' && (
            <LissDay
              workout={workout}
              dateStr={dateStr}
              phase={phase}
              totalWeek={totalWeek}
              checklistLogs={checklistLogs}
              isTravelMode={isTravelMode}
              onToggleTravel={() => setIsTravelMode(p => !p)}
              onUpdate={syncRefetch}
            />
          )}

          {/* Workout day */}
          {dayType === 'workout' && (
            <>
              {/* Workout header */}
              <div className="bg-[#111111] border border-[#1a1a1a] p-4">
                <h1 className="text-3xl font-black tracking-[-0.04em]">{workout.title}</h1>
                {workout.sub && (
                  <p className="text-[13px] text-[#555555] mt-1">{workout.sub}</p>
                )}
                <div className="flex gap-2 mt-3">
                  {workout.dur && (
                    <span className="bg-[#0a0a0a] border border-[#1a1a1a] px-2.5 py-1 text-[10px] tracking-widest uppercase text-[#666666]">
                      {workout.dur} MIN
                    </span>
                  )}
                  {workout.kcal && (
                    <span className="bg-[#0a0a0a] border border-[#1a1a1a] px-2.5 py-1 text-[10px] tracking-widest uppercase text-[#666666]">
                      {workout.kcal} KCAL
                    </span>
                  )}
                  {workout.tags?.map(tag => (
                    <span key={tag} className="bg-[#0a0a0a] border border-[#1a1a1a] px-2.5 py-1 text-[10px] tracking-widest uppercase text-[#555555]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Warmup */}
              {workout.wu && (
                <WarmupSection
                  dateStr={dateStr}
                  phase={phase}
                  warmupLogs={warmupLogs}
                  onUpdate={syncRefetch}
                />
              )}

              {/* Exercises */}
              <div className="mt-4 flex flex-col gap-2">
                {(workout.ex || []).map((ex, idx) => (
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
              {workout.cd && workout.cd.length > 0 && (
                <CooldownSection
                  items={workout.cd}
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
              <h1 className="text-3xl font-black tracking-[-0.04em] text-[#222222]">NO DATA</h1>
              <p className="text-[#333333] text-[13px] mt-2">
                No workout defined for this day in phase {phase}.
              </p>
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
