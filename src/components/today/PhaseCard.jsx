export default function PhaseCard({
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
}) {
  const totalWeeksInPhase = phaseWeeks[phase - 1] || 4
  const isOngoing = totalWeeksInPhase === 999
  const progressPct = isOngoing
    ? 100
    : Math.min(100, (weekInPhase / totalWeeksInPhase) * 100)

  const daysNeeded = Math.max(0, minActiveDays - currentWeekActiveDays)
  const weekQualified = daysNeeded === 0

  return (
    <div className="mx-4 mt-3 bg-[#111111] border border-[#1a1a1a] p-4">
      {/* Phase + progress */}
      <div className="flex items-baseline justify-between">
        <h2 className="text-[22px] font-black tracking-[-0.03em] text-white">
          PHASE {phase}
        </h2>
        <span className="text-[12px] text-[#555555]">
          {isOngoing ? 'Ongoing' : `${weekInPhase} of ${totalWeeksInPhase} wks`}
        </span>
      </div>

      {!isOngoing && (
        <div className="h-[3px] bg-[#1a1a1a] w-full mt-2 overflow-hidden">
          <div
            className="h-full bg-[#ff4520] transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {/* Week navigation */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1a1a1a]">
        <button
          onClick={onPrevWeek}
          disabled={!canGoBack}
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
          className="w-8 h-8 flex items-center justify-center text-[16px] text-[#555555] active:text-white"
        >
          ›
        </button>
      </div>

      {/* Qualifying status */}
      <div className="mt-2 flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full ${weekQualified ? 'bg-[#22c55e]' : 'bg-[#333333]'}`} />
        <span className="text-[11px] text-[#444444]">
          {currentWeekActiveDays}/{minActiveDays} days
          {weekQualified ? ' — qualified' : ` — need ${daysNeeded} more`}
        </span>
      </div>
    </div>
  )
}
