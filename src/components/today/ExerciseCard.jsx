import { useMemo } from 'react'
import exerciseData from '../../data/exercises.json'

const EQ_NAMES = exerciseData.EQ_NAMES

export default function ExerciseCard({
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

  // Build set completion map from logs
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

  // Border state
  const borderColor = allDone
    ? 'border-l-[#22c55e]'
    : completedCount > 0
    ? 'border-l-[#ff4520]'
    : 'border-l-transparent'

  return (
    <div className={`bg-[#111111] border border-[#1a1a1a] border-l-2 ${borderColor} transition-colors`}>
      {/* Header — always visible */}
      <button
        className="w-full flex items-center justify-between px-3 py-3 text-left active:bg-[#0d0d0d]"
        onClick={onToggleExpand}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`text-[14px] font-bold ${allDone ? 'text-[#555555]' : 'text-white'}`}>
              {exercise.n}
            </h3>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-[#555555]">{exercise.s}</span>
            <span className="text-[11px] text-[#333333]">·</span>
            <span className="text-[11px] text-[#555555]">{exercise.r} rest</span>
            {exercise.eq && exercise.eq.map(eq => (
              <span key={eq} className="text-[9px] tracking-wider uppercase text-[#444444] bg-[#1a1a1a] px-1.5 py-0.5">
                {EQ_NAMES[eq] || eq}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className="text-[12px] font-bold text-[#444444]">
            {completedCount}/{totalSets}
          </span>
          <span className={`text-[10px] text-[#333333] transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}>
            ▾
          </span>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-[#1a1a1a]">
          {/* Notes / warnings */}
          {exercise.note && (
            <p className="px-3 py-2 text-[11px] text-[#555555] leading-relaxed border-b border-[#1a1a1a]">
              {exercise.note}
            </p>
          )}
          {exercise.warn && (
            <p className="px-3 py-2 text-[11px] text-[#ff4520] leading-relaxed border-b border-[#1a1a1a]">
              {exercise.warn}
            </p>
          )}

          {/* Previous best */}
          {previousBest && (
            <div className="px-3 py-2 border-b border-[#1a1a1a] flex items-center gap-1">
              <span className="text-[10px] text-[#333333] uppercase tracking-wider">Prev best</span>
              <span className="text-[11px] text-[#555555] font-medium">
                {previousBest.weight_kg}kg × {previousBest.reps}
              </span>
            </div>
          )}

          {/* Set rows */}
          <div>
            {Array.from({ length: totalSets }, (_, i) => {
              const setNum = i + 1
              const log = setMap[setNum]
              const isDone = !!log

              return (
                <button
                  key={setNum}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-left active:bg-[#0d0d0d] transition-colors ${
                    i > 0 ? 'border-t border-[#0d0d0d]' : ''
                  }`}
                  onClick={() => onTapSet(exercise, setNum, totalSets, previousBest, log, exerciseIndex, restSec)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 flex items-center justify-center text-[11px] font-bold ${
                      isDone ? 'bg-[#ff4520] text-white' : 'bg-[#1a1a1a] text-[#555555]'
                    }`}>
                      {setNum}
                    </div>
                    {isDone ? (
                      <span className="text-[13px] text-[#888888] font-medium">
                        {log.weight_kg}kg × {log.reps}
                        {log.rpe && <span className="text-[#555555]"> @{log.rpe}</span>}
                      </span>
                    ) : (
                      <span className="text-[13px] text-[#333333]">
                        {targetReps} reps
                      </span>
                    )}
                  </div>
                  {!isDone && (
                    <span className="text-[10px] text-[#333333] font-semibold tracking-wider uppercase">
                      Log
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
