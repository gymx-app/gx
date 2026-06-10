import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'

export default function SetLogSheet({
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
    // Focus weight field on open
    setTimeout(() => weightRef.current?.focus(), 100)
  }, [])

  async function handleLog() {
    if (!weight || !reps) return
    setSaving(true)

    try {
      // Ensure workout_session exists
      let sid = sessionId
      if (!sid) {
        const { data: sess, error: sessErr } = await supabase
          .from('workout_sessions')
          .upsert({
            user_id: user.id,
            date: dateStr,
            phase,
            day_of_week: new Date(dateStr + 'T00:00:00')
              .toLocaleDateString('en', { weekday: 'short' })
              .toUpperCase()
              .slice(0, 3),
            workout_title: exercise.n,
          }, { onConflict: 'user_id,date,day_of_week' })
          .select('id')
          .single()

        if (sessErr) throw sessErr
        sid = sess.id
      }

      // Resolve exercise_id
      const exerciseId = exerciseMap[exercise.n]
      if (!exerciseId) throw new Error(`No exercise_id for "${exercise.n}"`)

      // Upsert exercise_log
      await supabase.from('exercise_logs').upsert({
        user_id: user.id,
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
      }, { onConflict: 'user_id,date,exercise_id,set_number,is_mm_set' })

      onLogged(sid)
    } catch (err) {
      console.error('SetLogSheet error:', err)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full max-w-[480px] bg-[#111111] border-t border-[#1a1a1a] px-5 pt-5 pb-8 animate-slide-up">
        {/* Handle */}
        <div className="w-8 h-1 bg-[#2a2a2a] rounded-full mx-auto mb-4" />

        {/* Header */}
        <div className="flex justify-between items-baseline mb-5">
          <h3 className="text-[16px] font-bold text-white">{exercise.n}</h3>
          <span className="text-[12px] text-[#555555]">Set {setNumber} of {totalSets}</span>
        </div>

        {/* Inputs */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="text-[10px] tracking-wider uppercase text-[#444444] mb-1 block">Weight (kg)</label>
            <input
              ref={weightRef}
              type="number"
              inputMode="decimal"
              step="0.5"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] px-3 py-3 text-[18px] font-bold text-white text-center focus:border-[#ff4520] transition-colors"
              placeholder="0"
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] tracking-wider uppercase text-[#444444] mb-1 block">Reps</label>
            <input
              type="number"
              inputMode="numeric"
              value={reps}
              onChange={e => setReps(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] px-3 py-3 text-[18px] font-bold text-white text-center focus:border-[#ff4520] transition-colors"
              placeholder="0"
            />
          </div>
        </div>

        {/* RPE selector */}
        <div className="mb-4">
          <label className="text-[10px] tracking-wider uppercase text-[#444444] mb-2 block">RPE</label>
          <div className="flex gap-2">
            {[6, 7, 8, 9, 10].map(val => (
              <button
                key={val}
                onClick={() => setRpe(rpe === val ? null : val)}
                className={`flex-1 py-2 text-[14px] font-bold transition-colors ${
                  rpe === val
                    ? 'bg-[#ff4520] text-white'
                    : 'bg-[#0a0a0a] border border-[#1a1a1a] text-[#555555]'
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>

        {/* MM toggle */}
        <button
          onClick={() => setIsMM(!isMM)}
          className={`w-full py-2 text-[12px] font-semibold tracking-wider mb-5 border transition-colors ${
            isMM
              ? 'bg-[#ff4520]/10 border-[#ff4520] text-[#ff4520]'
              : 'bg-transparent border-[#1a1a1a] text-[#444444]'
          }`}
        >
          {isMM ? 'MIND-MUSCLE SET ✓' : 'MIND-MUSCLE SET'}
        </button>

        {/* Log button */}
        <button
          onClick={handleLog}
          disabled={!weight || !reps || saving}
          className="w-full bg-[#ff4520] text-white py-4 text-[14px] font-black tracking-wider uppercase rounded-none active:scale-[0.98] transition-transform disabled:opacity-40"
        >
          {saving ? 'SAVING...' : 'LOG SET'}
        </button>
      </div>
    </div>
  )
}
