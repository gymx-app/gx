import { memo } from 'react'
import { Card, ProgressBar, Text } from '../ui'

const PhaseCard = memo(function PhaseCard({
  phase,
  weekInPhase,
  totalWeek,
  phaseWeeks,
  minActiveDays,
  currentWeekActiveDays,
  weekOffset,
  onPrevWeek,
  onNextWeek,
  canGoBack,
  programme,
  phases,
}) {
  // Use DB phase data if available, fall back to phaseWeeks array
  const currentPhase = phases?.find(p => p.phase_number === phase)
  const totalWeeksInPhase = currentPhase?.weeks_count || phaseWeeks[phase - 1] || 4
  const isOngoing = totalWeeksInPhase === 999
  const progressPct = isOngoing
    ? 100
    : Math.min(100, (weekInPhase / totalWeeksInPhase) * 100)

  const daysNeeded = Math.max(0, minActiveDays - currentWeekActiveDays)
  const weekQualified = daysNeeded === 0

  const phaseName = currentPhase?.name

  return (
    <Card variant="default" padding="p-4" className="mx-4 mt-3">
      {/* Phase + progress */}
      <div className="flex items-baseline justify-between">
        <Text variant="sectionTitle">
          PHASE {phase}{phaseName ? ` · ${phaseName}` : ''}
        </Text>
        <span className="text-[12px] text-[#555555]">
          {isOngoing ? 'Ongoing' : `${weekInPhase} of ${totalWeeksInPhase} wks`}
        </span>
      </div>

      {!isOngoing && (
        <div className="mt-2">
          <ProgressBar progress={progressPct} animated />
        </div>
      )}

      {/* Week navigation */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1a1a1a]">
        <button
          onClick={onPrevWeek}
          disabled={!canGoBack}
          aria-label="Previous week"
          className={`w-8 h-8 flex items-center justify-center text-[16px] ${
            canGoBack ? 'text-[#555555] active:text-white' : 'text-[#1a1a1a]'
          }`}
        >
          ‹
        </button>
        <span className="text-[12px] tracking-wide text-[#555555] font-medium">
          Week {totalWeek + weekOffset}
        </span>
        <button
          onClick={onNextWeek}
          aria-label="Next week"
          className="w-8 h-8 flex items-center justify-center text-[16px] text-[#555555] active:text-white"
        >
          ›
        </button>
      </div>

      {/* Qualifying status */}
      <div className="mt-2 flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full ${weekQualified ? 'bg-[#22c55e]' : 'bg-[#333333]'}`} />
        <Text variant="caption">
          {currentWeekActiveDays}/{minActiveDays} days
          {weekQualified ? ' — qualified' : ` — need ${daysNeeded} more`}
        </Text>
      </div>
    </Card>
  )
})

export default PhaseCard
