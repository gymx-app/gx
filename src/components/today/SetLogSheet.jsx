import { useState, useEffect, useRef, memo } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { upsertExerciseLog, upsertWorkoutSession } from '../../services/workoutService'
import { logger } from '../../lib/logger'
import { Button, SectionLabel } from '../ui'
import { shadows, gradients } from '../../styles/tokens'

const SetLogSheet = memo(function SetLogSheet({
  exercise,
  setNumber,
  totalSets,
  previousBest,
  existingLog,
  sessionId,
  dateStr,
  phase,
  exerciseIndex,
  exerciseMap,
  onClose,
  onLogged,
}) {
  const { user } = useAuth()
  const weightRef = useRef(null)

  const [weight, setWeight] = useState(existingLog?.weight_kg?.toString() || previousBest?.weight_kg?.toString() || '')
  const [reps, setReps] = useState(existingLog?.reps?.toString() || '')
  const [rpe, setRpe] = useState(existingLog?.rpe || null)
  const [isMM, setIsMM] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setTimeout(() => weightRef.current?.focus(), 100)
  }, [])

  async function handleLog() {
    if (!weight || !reps) return
    setSaving(true)

    try {
      let sid = sessionId
      if (!sid) {
        const dayOfWeek = new Date(dateStr + 'T00:00:00')
          .toLocaleDateString('en', { weekday: 'short' })
          .toUpperCase()
          .slice(0, 3)

        const { data: sess, error: sessErr } = await upsertWorkoutSession(user.id, {
          date: dateStr,
          phase,
          day_of_week: dayOfWeek,
          workout_title: exercise.n,
        })
        if (sessErr) throw new Error(sessErr)
        sid = sess.id
      }

      const exerciseId = exerciseMap[exercise.n]
      if (!exerciseId) throw new Error(`No exercise_id for "${exercise.n}"`)

      const { error: logErr } = await upsertExerciseLog(user.id, {
        session_id: sid,
        exercise_id: exerciseId,
        exercise_name: exercise.n,
        date: dateStr,
        phase,
        exercise_index: exerciseIndex,
        set_number: setNumber,
        is_mm_set: isMM,
        weight_kg: parseFloat(weight),
        reps: parseInt(reps),
        rpe: rpe || null,
        completed: true,
      })
      if (logErr) throw new Error(logErr)

      onLogged(sid)
    } catch (err) {
      logger.error('SetLogSheet error:', err)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden="true" />

      <div
        className="relative w-full max-w-[480px] border-t border-[#222222] px-5 pt-5 animate-slide-up"
        style={{ background: gradients.sheet, boxShadow: shadows.sheet, paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
        role="dialog"
        aria-modal="true"
        aria-label={`Log set ${setNumber} for ${exercise.n}`}
      >
        <div
          className="w-8 h-1 rounded-full mx-auto mb-4"
          style={{ background: 'linear-gradient(90deg, transparent, #333333, transparent)' }}
        />

        {/* Header */}
        <div className="flex justify-between items-baseline mb-5">
          <h3 className="text-[16px] font-bold text-white">{exercise.n}</h3>
          <span className="text-[12px] text-[#555555]">Set {setNumber} of {totalSets}</span>
        </div>

        {/* Inputs */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <SectionLabel label="Weight (kg)" className="mb-1" />
            <input
              ref={weightRef}
              type="number"
              inputMode="decimal"
              step="0.5"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              className="w-full border border-[#222222] px-3 py-3 text-[18px] font-bold text-white text-center focus:border-[#ff4520] transition-all duration-150"
              style={{ background: gradients.input, boxShadow: shadows.input }}
              placeholder="0"
              aria-label="Weight in kilograms"
            />
          </div>
          <div className="flex-1">
            <SectionLabel label="Reps" className="mb-1" />
            <input
              type="number"
              inputMode="numeric"
              value={reps}
              onChange={e => setReps(e.target.value)}
              className="w-full border border-[#222222] px-3 py-3 text-[18px] font-bold text-white text-center focus:border-[#ff4520] transition-all duration-150"
              style={{ background: gradients.input, boxShadow: shadows.input }}
              placeholder="0"
              aria-label="Number of reps"
            />
          </div>
        </div>

        {/* RPE selector */}
        <div className="mb-4">
          <SectionLabel label="RPE" className="mb-2" />
          <div className="flex gap-2" role="radiogroup" aria-label="Rate of perceived exertion">
            {[6, 7, 8, 9, 10].map(val => (
              <button
                key={val}
                onClick={() => setRpe(rpe === val ? null : val)}
                role="radio"
                aria-checked={rpe === val}
                className={`flex-1 py-2 text-[14px] font-bold transition-all duration-150 ${
                  rpe === val
                    ? 'text-white'
                    : 'border border-[#2a2a2a] text-[#555555]'
                }`}
                style={rpe === val
                  ? { background: gradients.buttonAccent, boxShadow: shadows.buttonAccent }
                  : { background: gradients.buttonSecondary, boxShadow: shadows.button }
                }
              >
                {val}
              </button>
            ))}
          </div>
        </div>

        {/* MM toggle */}
        <button
          onClick={() => setIsMM(!isMM)}
          aria-pressed={isMM}
          className={`w-full py-2 text-[12px] font-semibold tracking-wider mb-5 border transition-colors ${
            isMM
              ? 'bg-[#ff4520]/10 border-[#ff4520] text-[#ff4520]'
              : 'bg-transparent border-[#1a1a1a] text-[#444444]'
          }`}
        >
          {isMM ? 'MIND-MUSCLE SET ✓' : 'MIND-MUSCLE SET'}
        </button>

        {/* Log button */}
        <Button
          variant="primary"
          label={saving ? 'SAVING...' : 'LOG SET'}
          onPress={handleLog}
          disabled={!weight || !reps}
          loading={saving}
        />
      </div>
    </div>
  )
})

export default SetLogSheet
