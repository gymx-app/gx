import { useMemo, memo } from 'react'
import exerciseData from '../../data/exercises.json'
import { SectionLabel, Badge } from '../ui'
import { shadows, gradients } from '../../styles/tokens'

const EQ_NAMES = exerciseData.EQ_NAMES

const ExerciseCard = memo(function ExerciseCard({
  exercise,
  exerciseIndex,
  exerciseLogs,
  previousBest,
  isExpanded,
  onToggleExpand,
  onTapSet,
}) {
  const totalSets = parseInt(exercise.s.split('×')[0])
  const targetReps = exercise.s.split('×')[1]
  const restSec = parseInt(exercise.r) || 60

  const setMap = useMemo(() => {
    const map = {}
    for (const log of exerciseLogs) {
      if (!log.is_mm_set && log.completed) {
        map[log.set_number] = log
      }
    }
    return map
  }, [exerciseLogs])

  const completedCount = Object.keys(setMap).length
  const allDone = completedCount >= totalSets

  const borderColor = allDone
    ? 'border-l-[#22c55e]'
    : completedCount > 0
    ? 'border-l-[#ff4520]'
    : 'border-l-[#2a2a2a]'

  return (
    <div
      className={`border border-[#1a1a1a] border-l-2 ${borderColor} transition-all duration-150`}
      style={allDone
        ? { background: '#0d0d0d', opacity: 0.6 }
        : completedCount > 0
        ? { background: gradients.cardElevated, boxShadow: shadows.card }
        : { background: gradients.card, boxShadow: shadows.card }
      }
    >
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-3 min-h-[52px] text-left active:bg-[#ffffff05]"
        onClick={onToggleExpand}
        aria-expanded={isExpanded}
        aria-label={`${exercise.n} — ${completedCount} of ${totalSets} sets done`}
      >
        <div className="flex-1 min-w-0 py-3">
          <h3 className={`text-[16px] font-semibold ${allDone ? 'text-[#555555]' : 'text-white'}`}>
            {exercise.n}
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[13px] text-[#555555]">{exercise.s} · {exercise.r} rest</span>
            {exercise.eq && exercise.eq.map(eq => (
              <Badge key={eq} label={EQ_NAMES[eq] || eq} variant="default" />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className="text-[13px] text-[#555555]">
            {completedCount}/{totalSets}
          </span>
          <span className={`text-[14px] text-[#444444] transition-transform duration-200 ${
            isExpanded ? 'rotate-90' : ''
          }`}>
            ›
          </span>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-[#1a1a1a]">
          {exercise.note && (
            <div className="px-3 pt-3 pb-2">
              <SectionLabel label="Coaching" className="mb-2" />
              <p className="text-[15px] text-white leading-relaxed">
                {exercise.note}
              </p>
            </div>
          )}

          {exercise.warn && (
            <div className="px-3 py-2">
              <p className="text-[13px] text-[#ff4520] leading-relaxed" role="alert">
                ⚠ {exercise.warn}
              </p>
            </div>
          )}

          {previousBest && (
            <div className="px-3 py-2 border-t border-[#1a1a1a] flex items-center gap-1.5">
              <span className="text-[11px] text-[#444444] uppercase tracking-wider">Prev best</span>
              <span className="text-[13px] text-[#666666] font-medium">
                {previousBest.weight_kg}kg × {previousBest.reps}
              </span>
            </div>
          )}

          {/* Set rows */}
          <div className="border-t border-[#1a1a1a]">
            {Array.from({ length: totalSets }, (_, i) => {
              const setNum = i + 1
              const log = setMap[setNum]
              const isDone = !!log

              return (
                <button
                  key={setNum}
                  className={`w-full flex items-center justify-between px-3 min-h-[52px] text-left active:bg-[#1c1c1c] transition-colors duration-100 ${
                    i > 0 ? 'border-t border-[#0d0d0d]' : ''
                  }`}
                  onClick={() => onTapSet(exercise, setNum, totalSets, previousBest, log, exerciseIndex, restSec)}
                  aria-label={isDone ? `Set ${setNum}: ${log.weight_kg}kg × ${log.reps}` : `Log set ${setNum}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 flex items-center justify-center text-[12px] font-bold ${
                      isDone ? 'bg-[#ff4520] text-white' : 'bg-[#1a1a1a] text-[#888888]'
                    }`}>
                      {setNum}
                    </div>
                    {isDone ? (
                      <span className="text-[14px] text-white font-medium">
                        {log.weight_kg}kg × {log.reps}
                        {log.rpe && <span className="text-[#555555]"> @{log.rpe}</span>}
                      </span>
                    ) : (
                      <span className="text-[14px] text-[#444444]">
                        {targetReps} reps
                      </span>
                    )}
                  </div>
                  {!isDone && (
                    <span className="text-[18px] text-[#444444]">›</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
})

export default ExerciseCard
