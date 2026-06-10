import { memo } from 'react'
import { Button, StatBlock, Text } from '../ui'

const WorkoutCompleteSheet = memo(function WorkoutCompleteSheet({ workout, completedSets, onDismiss }) {
  const exercises = workout?.ex || []

  let totalSetsLogged = 0
  let totalVolume = 0
  for (const key of Object.keys(completedSets)) {
    const set = completedSets[key]
    if (set.weight && set.reps) {
      totalSetsLogged++
      totalVolume += set.weight * set.reps
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onDismiss} />

      <div className="relative w-[calc(100%-32px)] max-w-[380px] bg-[#111111] border border-[#1a1a1a] p-6">
        {/* Big check */}
        <div className="w-16 h-16 rounded-full bg-[#22c55e]/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <Text variant="sectionTitle" className="text-center">WORKOUT COMPLETE</Text>
        <Text variant="bodyMuted" className="text-center mt-1">{workout?.title}</Text>

        {/* Stats */}
        <div className="flex justify-center gap-6 mt-5 pt-4 border-t border-[#1a1a1a]">
          <StatBlock
            value={totalSetsLogged}
            label="Sets"
          />
          <StatBlock
            value={totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : totalVolume}
            label="Volume kg"
          />
          <StatBlock
            value={exercises.length}
            label="Exercises"
          />
        </div>

        <div className="mt-6">
          <Button variant="primary" label="DONE" onPress={onDismiss} />
        </div>
      </div>
    </div>
  )
})

export default WorkoutCompleteSheet
