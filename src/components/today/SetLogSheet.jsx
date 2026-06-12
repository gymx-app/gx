import { useState, useEffect, useRef, memo } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { upsertExerciseLog, upsertWorkoutSession } from '../../services/workoutService'
import { logger } from '../../lib/logger'
import { Button, SectionLabel } from '../ui'
import { colors, radius } from '../../styles/tokens'

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

  const RPE_COLORS = {
    10: '#ff4520',
    9: '#ff8c00',
    8: '#fbbf24',
    7: '#22c55e',
    6: '#06b6d4',
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/85" onClick={onClose} aria-hidden="true" />

      <div
        className="relative w-full max-w-[480px] px-5 pt-5 animate-slide-up"
        style={{
          background: colors.surface,
          borderRadius: radius.sheet,
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 40px)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={`Log set ${setNumber} for ${exercise.n}`}
      >
        <div className="w-10 h-1 rounded-[2px] mx-auto mb-4" style={{ background: colors.border }} />

        {/* Header */}
        <div className="flex justify-between items-baseline mb-5">
          <h3 className="font-['Bebas_Neue'] text-[22px] tracking-[1.5px] text-[#f0ede8]">{exercise.n}</h3>
          <span className="text-[12px] text-[#666666]">Set {setNumber} of {totalSets}</span>
        </div>

        {/* Previous best */}
        {previousBest && (
          <div className="mb-4 text-[11px] text-[#666666] text-center min-h-[16px]">
            Previous: <span className="text-[#22c55e] font-semibold">{previousBest.weight_kg}kg × {previousBest.reps}</span>
          </div>
        )}

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <SectionLabel label="Weight (kg)" className="mb-[6px]" />
            <input
              ref={weightRef}
              type="number"
              inputMode="decimal"
              step="0.5"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              className="w-full px-[14px] py-3 text-[18px] font-['Bebas_Neue'] tracking-[1px] text-[#f0ede8] text-center transition-all duration-150"
              style={{
                background: colors.surface2,
                border: `1.5px solid ${colors.border}`,
                borderRadius: radius.input,
              }}
              placeholder="0"
              aria-label="Weight in kilograms"
            />
          </div>
          <div>
            <SectionLabel label="Reps" className="mb-[6px]" />
            <input
              type="number"
              inputMode="numeric"
              value={reps}
              onChange={e => setReps(e.target.value)}
              className="w-full px-[14px] py-3 text-[18px] font-['Bebas_Neue'] tracking-[1px] text-[#f0ede8] text-center transition-all duration-150"
              style={{
                background: colors.surface2,
                border: `1.5px solid ${colors.border}`,
                borderRadius: radius.input,
              }}
              placeholder="0"
              aria-label="Number of reps"
            />
          </div>
        </div>

        {/* RPE selector */}
        <div className="mb-4">
          <SectionLabel label="RPE" className="mb-2" />
          <div className="grid grid-cols-5 gap-[7px]" role="radiogroup" aria-label="Rate of perceived exertion">
            {[6, 7, 8, 9, 10].map(val => {
              const rpeColor = RPE_COLORS[val]
              const isActive = rpe === val
              return (
                <button
                  key={val}
                  onClick={() => setRpe(rpe === val ? null : val)}
                  role="radio"
                  aria-checked={isActive}
                  className="flex flex-col items-center gap-1 py-[14px] px-1 transition-all duration-150 active:scale-[0.93]"
                  style={{
                    borderRadius: radius.button,
                    border: `1.5px solid ${isActive ? rpeColor : colors.border}`,
                    background: isActive ? `${rpeColor}20` : colors.surface2,
                  }}
                >
                  <span className="font-['Bebas_Neue'] text-[22px] tracking-[0.5px] leading-none" style={{ color: rpeColor }}>
                    {val}
                  </span>
                  <span className="text-[9px] font-bold tracking-[0.5px] leading-none" style={{ color: rpeColor }}>
                    RPE
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* MM toggle */}
        <button
          onClick={() => setIsMM(!isMM)}
          aria-pressed={isMM}
          className="w-full py-2 text-[12px] font-semibold tracking-wider mb-5 transition-colors"
          style={{
            borderRadius: radius.buttonSm,
            border: `1.5px solid ${isMM ? colors.accent : colors.border}`,
            background: isMM ? 'rgba(255,69,32,0.1)' : 'transparent',
            color: isMM ? colors.accent : '#666666',
          }}
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
