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

  let cardStyle, borderCls
  if (allDone) {
    cardStyle = { background: '#0e0e0e', opacity: 0.5 }
    borderCls = 'border border-[#181818] border-l-[3px] border-l-[#22c55e]'
  } else if (completedCount > 0) {
    cardStyle = { background: gradients.cardElevated, boxShadow: shadows.card }
    borderCls = 'border border-[#222222] border-l-[3px] border-l-[#ff4520]'
  } else {
    cardStyle = { background: gradients.card, boxShadow: shadows.card }
    borderCls = 'border border-[#1e1e1e] border-l-[3px] border-l-transparent'
  }

  return (
    <div
      className={`${borderCls} transition-all duration-150`}
      style={cardStyle}
    >
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-4 min-h-[56px] text-left active:bg-[#ffffff05] transition-colors duration-120"
        onClick={onToggleExpand}
        aria-expanded={isExpanded}
        aria-label={`${exercise.n} — ${completedCount} of ${totalSets} sets done`}
      >
        <div className="flex-1 min-w-0 py-3.5">
          <h3 className={`text-[17px] font-semibold tracking-[-0.01em] ${allDone ? 'text-[#555555]' : 'text-white'}`}>
            {exercise.n}
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[12px] text-[#555555]">{exercise.s} · {exercise.r} rest</span>
            {exercise.eq && exercise.eq.map(eq => (
              <Badge key={eq} label={EQ_NAMES[eq] || eq} variant="default" />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-2">
          <span className="text-[12px] text-[#444444] font-medium">
            {completedCount}/{totalSets}
          </span>
          <span className={`text-[14px] transition-colors duration-120 ${
            isExpanded ? 'text-[#555555]' : 'text-[#333333]'
          }`}>
            {isExpanded ? '−' : '+'}
          </span>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-[#1a1a1a]">
          {exercise.note && (
            <div className="px-4 pt-3 pb-2">
              <SectionLabel label="Coaching" className="mb-2" />
              <p className="text-[15px] text-white leading-relaxed tracking-[-0.01em]">
                {exercise.note}
              </p>
            </div>
          )}

          {exercise.warn && (
            <div className="px-4 py-2">
              <p className="text-[13px] text-[#ff4520] leading-relaxed" role="alert">
                ⚠ {exercise.warn}
              </p>
            </div>
          )}

          {previousBest && (
            <div className="px-4 py-2 border-t border-[#1a1a1a] flex items-center gap-1.5">
              <span className="text-[10px] text-[#333333] uppercase tracking-[0.1em] font-semibold">Prev best</span>
              <span className="text-[12px] text-[#555555] font-medium">
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
                  className={`w-full flex items-center justify-between px-4 min-h-[48px] text-left active:bg-[#161616] transition-colors duration-120 ${
                    i > 0 ? 'border-t border-[#0e0e0e]' : ''
                  }`}
                  onClick={() => onTapSet(exercise, setNum, totalSets, previousBest, log, exerciseIndex, restSec)}
                  aria-label={isDone ? `Set ${setNum}: ${log.weight_kg}kg × ${log.reps}` : `Log set ${setNum}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#333333] w-5">
                      S{setNum}
                    </span>
                    {isDone ? (
                      <span className="text-[14px] text-white font-medium">
                        {log.weight_kg}kg × {log.reps}
                        {log.rpe && <span className="text-[#444444]"> @{log.rpe}</span>}
                      </span>
                    ) : (
                      <span className="text-[14px] text-[#444444]">
                        {targetReps} reps
                      </span>
                    )}
                  </div>
                  {isDone ? (
                    <span className="text-[13px] text-[#22c55e] font-bold">✓</span>
                  ) : (
                    <span className="text-[16px] text-[#2a2a2a]">›</span>
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
