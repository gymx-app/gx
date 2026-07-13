import { memo, useState } from 'react'
import { Button, StatBlock, Text, SectionLabel } from '../ui'
import { colors, radius } from '../../styles/tokens'

interface CompletedSet {
  weight?: number
  reps?: number
}

interface Workout {
  title?: string
}

interface WorkoutCompleteSheetProps {
  workout: Workout
  completedSets: Record<string, CompletedSet>
  exerciseCount: number
  onDismiss: () => void
  onRate?: (sessionRpe: number) => void
}

const SESSION_RPE_COLORS: Record<number, string> = {
  10: colors.accent,
  9: colors.orange,
  8: colors.yellow,
  7: colors.success,
  6: colors.cyan,
  5: colors.muted,
}

const WorkoutCompleteSheet = memo(function WorkoutCompleteSheet({
  workout,
  completedSets,
  exerciseCount,
  onDismiss,
  onRate,
}: WorkoutCompleteSheetProps) {
  const [sessionRpe, setSessionRpe] = useState<number | null>(null)

  let totalSetsLogged = 0
  let totalVolume = 0
  for (const [, set] of Object.entries(completedSets)) {
    if (set.weight && set.reps) {
      totalSetsLogged++
      totalVolume += set.weight * set.reps
    }
  }

  function handleDone() {
    if (sessionRpe != null) onRate?.(sessionRpe)
    onDismiss()
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onDismiss} />

      <div
        className="relative w-[calc(100%-32px)] max-w-[380px] p-6"
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.card,
        }}
      >
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-success"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <Text variant="sectionTitle" className="text-center">
          WORKOUT COMPLETE
        </Text>
        <Text variant="bodyMuted" className="text-center mt-1">
          {workout?.title}
        </Text>

        <div className="flex justify-center gap-6 mt-5 pt-4 border-t border-border">
          <StatBlock value={totalSetsLogged} label="Sets" />
          <StatBlock
            value={totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : totalVolume}
            label="Volume kg"
          />
          <StatBlock value={exerciseCount} label="Exercises" />
        </div>

        <div className="mt-6">
          <SectionLabel label="How would you rate today's workout?" className="mb-2" />
          <p className="text-[11px] text-muted mb-2">
            5 = as hard as expected, 10 = toughest possible
          </p>
          <div
            className="grid grid-cols-6 gap-[6px]"
            role="radiogroup"
            aria-label="Session difficulty rating"
          >
            {[5, 6, 7, 8, 9, 10].map((val) => {
              const rpeColor = SESSION_RPE_COLORS[val]
              const isActive = sessionRpe === val
              return (
                <button
                  key={val}
                  onClick={() => setSessionRpe(sessionRpe === val ? null : val)}
                  role="radio"
                  aria-checked={isActive}
                  className="flex flex-col items-center py-[10px] transition-all duration-150 active:scale-[0.93]"
                  style={{
                    borderRadius: radius.button,
                    border: `1.5px solid ${isActive ? rpeColor : colors.border}`,
                    background: isActive ? `${rpeColor}20` : colors.surface2,
                  }}
                >
                  <span
                    className="font-['Bebas_Neue'] text-[18px] tracking-[0.5px] leading-none"
                    style={{ color: rpeColor }}
                  >
                    {val}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-5">
          <Button variant="primary" label="DONE" onPress={handleDone} />
        </div>
      </div>
    </div>
  )
})

export default WorkoutCompleteSheet
