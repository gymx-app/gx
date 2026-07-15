import { useMemo, memo } from 'react'
import { Dumbbell, ChevronDown } from 'lucide-react'
import { colors, radius } from '../../styles/tokens'

const EQ_NAMES: Record<string, string> = {
  bb: 'Barbell',
  db: 'Dumbbell',
  kb: 'Kettlebell',
  bw: 'Bodyweight',
  rope: 'Battle Rope',
  tyre: 'Tyre',
  cable: 'Cable',
  mach: 'Machine',
}

const EQ_COLORS: Record<string, { bg: string; color: string }> = {
  BB: { bg: colors.yellowMuted, color: colors.yellow },
  DB: { bg: colors.cyanMuted, color: colors.cyan },
  KB: { bg: colors.purpleMuted, color: colors.purple },
  BW: { bg: colors.mutedBorder, color: colors.textSecondary },
  CABLE: { bg: colors.blueMuted, color: colors.blue },
  MACH: { bg: colors.mutedBorder, color: colors.textSecondary },
}

interface Exercise {
  n: string
  s: string
  r: string
  eq?: string[]
  icon?: string
  note?: string
  warn?: string
}

interface ExerciseLog {
  set_number: number
  is_mm_set: boolean
  completed: boolean
  weight_kg: number
  reps: number
  rpe?: number
}

interface PreviousBest {
  weight_kg: number
  reps: number
}

interface ExerciseCardProps {
  exercise: Exercise
  exerciseIndex: number
  exerciseLogs: ExerciseLog[]
  previousBest: PreviousBest | null
  isExpanded: boolean
  onToggleExpand: () => void
  onTapSet: (
    exercise: Exercise,
    setNum: number,
    totalSets: number,
    previousBest: PreviousBest | null,
    log: ExerciseLog | undefined,
    exerciseIndex: number,
    restSec: number
  ) => void
}

const ExerciseCard = memo(function ExerciseCard({
  exercise,
  exerciseIndex,
  exerciseLogs,
  previousBest,
  isExpanded,
  onToggleExpand,
  onTapSet,
}: ExerciseCardProps) {
  const totalSets = parseInt(exercise.s.split('×')[0] ?? '0')
  const targetReps = exercise.s.split('×')[1] ?? ''
  const restSec = parseInt(exercise.r) || 60

  const setMap = useMemo(() => {
    const map: Record<number, ExerciseLog> = {}
    for (const log of exerciseLogs) {
      if (!log.is_mm_set && log.completed) {
        map[log.set_number] = log
      }
    }
    return map
  }, [exerciseLogs])

  const completedCount = Object.keys(setMap).length
  const allDone = completedCount >= totalSets

  const cardStyle = {
    background: allDone ? colors.bg : colors.surface,
    border: allDone ? `1px solid rgba(34, 197, 94, 0.15)` : `1px solid ${colors.border}`,
    borderRadius: radius.card,
  }

  return (
    <div className="overflow-hidden transition-all duration-150" style={cardStyle}>
      <button
        className="w-full flex items-center gap-[10px] px-4 py-[11px] text-left active:bg-surface-2 transition-colors duration-150"
        onClick={onToggleExpand}
        aria-expanded={isExpanded}
        aria-label={`${exercise.n} — ${completedCount} of ${totalSets} sets done`}
      >
        <div className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center shrink-0 bg-surface-2">
          <Dumbbell size={16} strokeWidth={1.5} color={colors.muted} />
        </div>

        <div className="flex-1 min-w-0">
          <h3
            className={`text-[14px] font-semibold truncate ${allDone ? 'text-muted line-through' : 'text-text'}`}
          >
            {exercise.n}
          </h3>
          <div className="flex items-center gap-1 mt-[1px]">
            <span className="text-[12px] text-muted">
              {exercise.s} · {exercise.r} rest
            </span>
          </div>
          {exercise.eq && exercise.eq.length > 0 && (
            <div className="flex gap-[3px] mt-1 flex-wrap">
              {exercise.eq.map((eq) => {
                const eqColor = EQ_COLORS[eq?.toUpperCase()] ??
                  EQ_COLORS.BW ?? { bg: 'transparent', color: colors.textSecondary }
                return (
                  <span
                    key={eq}
                    className="text-[9px] font-bold tracking-[0.3px] uppercase px-[5px] py-[2px] rounded-[4px]"
                    style={{ background: eqColor.bg, color: eqColor.color }}
                  >
                    {EQ_NAMES[eq] ?? eq}
                  </span>
                )
              })}
            </div>
          )}
        </div>

        <ChevronDown
          size={16}
          strokeWidth={1.5}
          className={`shrink-0 transition-transform duration-200
            ${isExpanded ? 'rotate-180' : ''}
            ${allDone ? 'text-muted opacity-40' : 'text-muted'}`}
          color={allDone ? colors.muted : colors.disabled}
        />
      </button>

      {isExpanded && (
        <div className="border-t border-border">
          {exercise.note && (
            <div className="px-4 pt-3 pb-2">
              <p className="text-[13px] leading-[1.6]" style={{ color: colors.textSecondary }}>
                {exercise.note}
              </p>
            </div>
          )}

          {exercise.warn && (
            <div className="px-4 py-2">
              <p
                className="text-[12px] text-orange leading-relaxed bg-[rgba(255,140,0,0.08)] border-l-[3px] border-l-orange px-[10px] py-[6px] rounded-r-[6px]"
                role="alert"
              >
                {exercise.warn}
              </p>
            </div>
          )}

          {previousBest && (
            <div className="px-4 py-2 border-t border-border flex items-center gap-1.5">
              <span className="text-[10px] text-muted uppercase tracking-[1px] font-bold">
                Prev best
              </span>
              <span className="text-[12px] text-muted font-semibold">
                {previousBest.weight_kg}kg × {previousBest.reps}
              </span>
            </div>
          )}

          <div className="px-4 pb-3 pt-[6px]">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(68px,1fr))] gap-[6px]">
              {Array.from({ length: totalSets }, (_, i) => {
                const setNum = i + 1
                const log = setMap[setNum]
                const isDone = !!log

                return (
                  <button
                    key={setNum}
                    className={`text-center py-[9px] px-1 rounded-[10px] transition-all duration-150 active:scale-[0.93] ${
                      isDone
                        ? 'bg-[rgba(34,197,94,0.15)] border border-success'
                        : 'bg-surface-3 border border-border'
                    }`}
                    onClick={() =>
                      onTapSet(
                        exercise,
                        setNum,
                        totalSets,
                        previousBest,
                        log,
                        exerciseIndex,
                        restSec
                      )
                    }
                    aria-label={
                      isDone
                        ? `Set ${setNum}: ${log.weight_kg}kg × ${log.reps}`
                        : `Log set ${setNum}`
                    }
                  >
                    <span
                      className={`font-['Bebas_Neue'] text-[15px] leading-none ${
                        isDone ? 'text-success' : 'text-muted'
                      }`}
                    >
                      S{setNum}
                    </span>
                    <span
                      className={`block text-[10px] mt-[1px] ${
                        isDone ? 'text-success opacity-70' : 'text-muted'
                      }`}
                    >
                      {isDone ? `${log.weight_kg}×${log.reps}` : `${targetReps}`}
                    </span>
                    {isDone && log.rpe && (
                      <span className="block text-[8px] text-cyan font-bold tracking-[0.3px] mt-[1px] leading-none opacity-90">
                        RPE {log.rpe}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

export default ExerciseCard
