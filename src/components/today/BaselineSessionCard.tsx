import { useState, useMemo, useCallback } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { upsertWorkoutSession } from '../../services/workoutService'
import { supabase } from '../../lib/supabase'
import { logger } from '../../lib/logger'
import { getISTTodayStr } from '../../utils/dateUtils'
import { getDayKey } from '../../utils/programme'
import SetLogSheet from './SetLogSheet'
import RestTimerHUD from './RestTimerHUD'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = any

interface BaselineSessionCardProps {
  baselineSession: AnyData
  ctaLabel?: string
  onCta?: () => void
  mode?: 'preview' | 'logging'
  programmeId?: string | null
  onComplete?: () => void
}

const BASELINE_REST_SEC = 90

type SetStatus = 'pending' | 'active' | 'logged'

interface LoggedSet {
  weight_kg: number
  reps: number
}

// Shared "Day 0" baseline strength test card — rendered above the programme
// accordion in ProgrammePreview (post-generation) and in place of today's
// session on the Today tab when the baseline hasn't been logged yet.
export default function BaselineSessionCard({
  baselineSession,
  ctaLabel,
  onCta,
  mode = 'preview',
  programmeId,
  onComplete,
}: BaselineSessionCardProps) {
  const { user } = useAuth()

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loggedSets, setLoggedSets] = useState<Record<string, Record<number, LoggedSet>>>({})
  const [activeSheet, setActiveSheet] = useState<AnyData>(null)
  const [restTimer, setRestTimer] = useState<{ duration: number; exerciseName: string } | null>(
    null
  )
  const [completed, setCompleted] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [baselineSummary, setBaselineSummary] = useState<
    Array<{ exercise_name: string; estimated_1rm_kg: number; working_weight_kg: number }>
  >([])

  const exercises = useMemo(() => baselineSession?.exercises ?? [], [baselineSession])

  const exerciseMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const ex of exercises) {
      if (ex.exercise_id) map[ex.exercise_name] = ex.exercise_id
    }
    return map
  }, [exercises])

  const allSet3Logged = useMemo(() => {
    if (exercises.length === 0) return false
    return exercises.every((ex: AnyData) => Boolean(loggedSets[ex.exercise_name]?.[3]))
  }, [exercises, loggedSets])

  const ensureSession = useCallback(async () => {
    if (sessionId) return sessionId
    if (!user?.id) return null

    const dateStr = getISTTodayStr()
    const { data, error } = await upsertWorkoutSession(user.id, {
      date: dateStr,
      day_of_week: getDayKey(dateStr),
      phase: 0,
      workout_title: 'Day 0 — Strength Baseline',
      session_type: 'baseline_assessment',
      completed_at: null,
    })
    if (error || !data) {
      logger.error('BaselineSessionCard ensureSession:', error)
      return null
    }
    const newSessionId = (data as { id: string }).id
    setSessionId(newSessionId)
    return newSessionId
  }, [sessionId, user])

  const handleTapSet = useCallback(
    async (exercise: AnyData, set: AnyData, exerciseIndex: number) => {
      const sid = await ensureSession()
      setActiveSheet({
        exercise: { n: exercise.exercise_name, s: `3×${set.reps}`, r: `${BASELINE_REST_SEC}s` },
        setNumber: set.set_number,
        totalSets: exercise.sets?.length ?? 3,
        exerciseIndex,
        sessionId: sid,
      })
    },
    [ensureSession]
  )

  const finalizeCompletion = useCallback(async () => {
    if (!user?.id || !sessionId || completing) return
    setCompleting(true)
    try {
      await supabase
        .from('workout_sessions')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', sessionId)

      if (programmeId) {
        try {
          const { calculateAndStoreBaseline } = await import('../../services/baselineService')
          const summary = await calculateAndStoreBaseline(user.id, programmeId, sessionId)
          setBaselineSummary(summary)
        } catch (err) {
          logger.error('calculateAndStoreBaseline:', err)
        }
      }

      setCompleted(true)
    } catch (err) {
      logger.error('BaselineSessionCard finalizeCompletion:', err)
    } finally {
      setCompleting(false)
    }
  }, [user, sessionId, programmeId, completing])

  const handleLogged = useCallback(
    (_sid: string, weight = 0) => {
      const exName = activeSheet?.exercise?.n ?? ''
      const setNum = activeSheet?.setNumber

      setActiveSheet(null)
      setRestTimer({ duration: BASELINE_REST_SEC, exerciseName: exName })

      if (exName && setNum) {
        setLoggedSets((prev) => ({
          ...prev,
          [exName]: {
            ...prev[exName],
            [setNum]: { weight_kg: weight || 0, reps: 0 },
          },
        }))
      }
    },
    [activeSheet]
  )

  const handleRestTimerDismiss = useCallback(() => {
    setRestTimer(null)
    if (allSet3Logged) {
      void finalizeCompletion()
    }
  }, [allSet3Logged, finalizeCompletion])

  if (!baselineSession) return null

  if (completed) {
    return (
      <div className="bg-zinc-900 border border-orange-900 rounded-2xl p-4 mb-4">
        <span className="font-['Bebas_Neue'] text-2xl text-orange-500">BASELINE COMPLETE</span>
        <p className="font-['DM_Sans'] text-sm text-zinc-400 mt-2">
          Your starting weights have been logged. From tomorrow, Odin will prescribe specific
          weights for every session.
        </p>
        <div className="mt-4">
          {exercises.map((ex: AnyData, ei: number) => {
            const set3 = loggedSets[ex.exercise_name]?.[3]
            const calc = baselineSummary.find((s) => s.exercise_name === ex.exercise_name)
            return (
              <p key={ei} className="text-sm text-zinc-300 py-1">
                {calc ? (
                  <>
                    {ex.exercise_name} — Est. 1RM: {calc.estimated_1rm_kg}kg → Day 1 weight:{' '}
                    {calc.working_weight_kg}kg
                  </>
                ) : (
                  <>
                    {ex.exercise_name}
                    {set3 ? ` — ${set3.weight_kg}kg logged` : ''}
                  </>
                )}
              </p>
            )
          })}
        </div>
        <button
          onClick={onComplete}
          className="w-full mt-4 py-3 min-h-[44px] font-['Bebas_Neue'] text-[15px] tracking-[2px] text-white bg-orange-600 rounded-xl active:opacity-80"
        >
          START MY PROGRAMME →
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="bg-zinc-900 border border-orange-900 rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <span className="font-['Bebas_Neue'] text-lg text-orange-500">DAY 0</span>
          <span className="text-xs font-['DM_Sans'] text-zinc-400 uppercase tracking-widest">
            Strength Baseline
          </span>
        </div>
        <p className="font-['DM_Sans'] text-xs text-zinc-400 mt-1 mb-4">
          Complete this session before starting Week 1. Log the weight you use in Set 3 for each
          exercise — Odin uses it to calculate your training weights from Day 2.
        </p>

        {baselineSession.warmup?.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-zinc-500 tracking-widest mb-2">WARMUP</p>
            {baselineSession.warmup.map((w: AnyData, wi: number) => (
              <div
                key={wi}
                className="flex items-center justify-between text-sm text-zinc-300 py-0.5"
              >
                <span>{w.activity_name}</span>
                <span>{w.duration_seconds}s</span>
              </div>
            ))}
          </div>
        )}

        <div>
          <p className="text-xs text-zinc-500 tracking-widest mb-2">EXERCISES</p>
          {exercises.map((ex: AnyData, ei: number) => (
            <div
              key={ei}
              className={ei < exercises.length - 1 ? 'border-b border-zinc-800 my-3 pb-3' : ''}
            >
              <p className="font-['DM_Sans'] text-sm font-medium text-white mb-1">
                {ex.exercise_name}
              </p>
              {(ex.sets ?? []).map((set: AnyData, si: number) => {
                const logged = loggedSets[ex.exercise_name]?.[set.set_number]
                const prevSetNum = set.set_number - 1
                const prevLogged =
                  prevSetNum < 1 || Boolean(loggedSets[ex.exercise_name]?.[prevSetNum])
                const status: SetStatus = logged ? 'logged' : prevLogged ? 'active' : 'pending'

                return (
                  <button
                    key={si}
                    disabled={mode !== 'logging' || status !== 'active'}
                    onClick={() => void handleTapSet(ex, set, ei)}
                    className="w-full flex items-center justify-between mb-2 py-2 px-3 rounded-lg text-left transition-colors"
                    style={{
                      background:
                        status === 'logged'
                          ? 'rgba(34,197,94,0.08)'
                          : status === 'active'
                            ? 'rgba(255,69,32,0.08)'
                            : 'transparent',
                      border: `1px solid ${
                        status === 'logged'
                          ? '#166534'
                          : status === 'active'
                            ? '#7c2d12'
                            : '#27272a'
                      }`,
                    }}
                  >
                    <div>
                      <p className="text-xs text-zinc-400">
                        Set {set.set_number} · {set.reps} reps @ RPE {set.rpe}
                      </p>
                      {set.instruction && (
                        <p className="text-xs text-zinc-600 italic">{set.instruction}</p>
                      )}
                    </div>
                    <span
                      className="text-xs font-semibold"
                      style={{
                        color:
                          status === 'logged'
                            ? '#22c55e'
                            : status === 'active'
                              ? '#ff4520'
                              : '#52525b',
                      }}
                    >
                      {status === 'logged'
                        ? `${logged!.weight_kg}kg × ${set.reps}`
                        : status === 'active'
                          ? 'LOG SET →'
                          : 'LOCKED'}
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <p className="text-xs text-zinc-600 italic mt-2">
          weight_kg for all sets is determined on the day — log what you lift.
        </p>

        {ctaLabel && onCta && mode !== 'logging' && (
          <button
            onClick={onCta}
            className="w-full mt-4 py-3 min-h-[44px] font-['Bebas_Neue'] text-[15px] tracking-[2px] text-white bg-orange-600 rounded-xl active:opacity-80"
          >
            {ctaLabel}
          </button>
        )}
      </div>

      {mode === 'logging' && restTimer && (
        <RestTimerHUD
          durationSec={restTimer.duration}
          exerciseName={restTimer.exerciseName}
          onDismiss={handleRestTimerDismiss}
        />
      )}

      {mode === 'logging' && activeSheet && (
        <SetLogSheet
          exercise={activeSheet.exercise}
          setNumber={activeSheet.setNumber}
          totalSets={activeSheet.totalSets}
          previousBest={null}
          existingLog={null}
          sessionId={activeSheet.sessionId}
          dateStr={getISTTodayStr()}
          phase={0}
          exerciseIndex={activeSheet.exerciseIndex}
          exerciseMap={exerciseMap}
          onClose={() => setActiveSheet(null)}
          onLogged={handleLogged}
        />
      )}
    </>
  )
}
