import { useMemo, memo } from 'react'
import { getDayWorkout } from '../../utils/programme'

const LISS_TYPES = new Set(['liss'])

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
  programme,
  phases,
  // Day pills props (moved from WeekStrip)
  weekDays,
  selectedDateStr,
  completedDateStrs,
  onSelectDay,
  onGoToToday,
}) {
  // Use DB phase data if available, fall back to phaseWeeks array
  const currentPhase = phases?.find(p => p.phase_number === phase)
  const totalWeeksInPhase = currentPhase?.weeks_count || phaseWeeks[phase - 1] || 4
  const isOngoing = totalWeeksInPhase === 999
  const totalPhases = phases?.length || phaseWeeks?.length || 5

  const phaseName = currentPhase?.name || ''
  const phaseGoal = currentPhase?.description || ''

  const daysNeeded = Math.max(0, minActiveDays - currentWeekActiveDays)
  const weekQualified = daysNeeded === 0
  const qualifyPct = Math.min(100, (currentWeekActiveDays / minActiveDays) * 100)

  // Today's date string for comparison
  const todayDateStr = useMemo(() => {
    const d = new Date()
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0')
  }, [])

  // Determine LISS days from workout schedule
  const lissLabels = useMemo(() => {
    const set = new Set()
    const labels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
    for (const label of labels) {
      const w = getDayWorkout(phase, label)
      if (w?.isLiss) set.add(label)
    }
    return set
  }, [phase])

  const showTodayPill = weekOffset !== 0

  return (
    <>
      {/* ── Row 1 + Row 2: Phase card ── */}
      <div className="bg-[#111111] border border-[#1a1a1a] mx-4 mt-3 px-4 py-3">
        {/* Row 1 — Phase identity */}
        <div className="flex justify-between items-start">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] tracking-[0.08em] uppercase text-[#ff4520] font-semibold">
              PHASE {phase} OF {totalPhases}
            </p>
            <p className="text-[17px] font-black tracking-[-0.03em] text-white mt-0.5">
              {phaseName.toUpperCase() || `PHASE ${phase}`}
            </p>
            {phaseGoal && (
              <p className="text-[12px] text-[#555555] mt-0.5 truncate">
                {phaseGoal}
              </p>
            )}
          </div>
        </div>

        {/* Row 2 — Phase week progress */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-[#555555] tracking-wide">
              {isOngoing ? 'ONGOING' : `WK ${weekInPhase} OF ${totalWeeksInPhase}`}
            </span>
            {weekQualified ? (
              <span className="text-[11px] text-[#22c55e] font-semibold">
                ✓ WEEK QUALIFIES
              </span>
            ) : (
              <span className="text-[11px] text-[#555555]">
                {currentWeekActiveDays}/{minActiveDays} days · need {daysNeeded} more
              </span>
            )}
          </div>
          <div className="w-full h-[2px] bg-[#1a1a1a] mt-1">
            <div
              className="h-full bg-[#ff4520] transition-all duration-300"
              style={{ width: `${qualifyPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Row 3: Day pills with week navigation ── */}
      <div className="mx-4 mt-3">
        {/* TODAY pill — when viewing a past/future week */}
        {showTodayPill && (
          <div className="flex justify-end mb-2">
            <button
              onClick={onGoToToday}
              className="text-[10px] tracking-[0.08em] uppercase bg-[#ff4520]/10 border border-[#ff4520]/20 text-[#ff4520] px-3 h-6 flex items-center font-semibold active:bg-[#ff4520]/20 transition-colors"
            >
              TODAY
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Left arrow — always visible */}
          <button
            onClick={onPrevWeek}
            aria-label="Previous week"
            className="min-w-[32px] min-h-[52px] flex items-center justify-center text-[24px] font-light shrink-0 transition-opacity text-[#888888] active:opacity-50"
          >
            ‹
          </button>

          {/* Day pills */}
          <div className="flex-1 flex justify-between">
            {weekDays.map(({ dayLabel, date, dateStr: dayDateStr }) => {
              const isSelected = dayDateStr === selectedDateStr
              const isToday = dayDateStr === todayDateStr
              const isCompleted = completedDateStrs.has(dayDateStr)
              const isPast = dayDateStr < todayDateStr
              const isFuture = dayDateStr > todayDateStr
              const isLissDay = lissLabels.has(dayLabel)
              const dayNum = date.getDate()

              // Status symbol
              let statusChar = '·'
              let statusColor = 'text-[#1a1a1a]' // future default
              if (isToday && !isCompleted) {
                statusChar = '·'
                statusColor = 'text-[#ff4520]'
              } else if (isCompleted && isLissDay) {
                statusChar = '~'
                statusColor = 'text-[#3b82f6]'
              } else if (isCompleted) {
                statusChar = '✓'
                statusColor = 'text-[#22c55e]'
              } else if (isPast) {
                statusChar = '–'
                statusColor = 'text-[#333333]'
              }

              // Day label color
              const labelColor = isToday
                ? 'text-[#ff4520]'
                : isSelected
                ? 'text-[#888888]'
                : 'text-[#333333]'

              // Date color
              const dateColor = isToday
                ? 'text-white font-black'
                : isSelected
                ? 'text-white'
                : 'text-[#333333]'

              return (
                <button
                  key={dayLabel}
                  className="flex-1 flex flex-col items-center gap-0.5 py-1 min-h-[52px]"
                  onClick={() => onSelectDay(dayLabel, dayDateStr, date)}
                  aria-label={`${dayLabel} ${dayNum}${isToday ? ' (today)' : ''}${isCompleted ? ' completed' : ''}`}
                  aria-pressed={isSelected}
                >
                  <span className={`text-[10px] tracking-[0.06em] uppercase font-semibold ${labelColor}`}>
                    {dayLabel}
                  </span>
                  <span className={`text-[16px] font-bold ${dateColor}`}>
                    {dayNum}
                  </span>
                  {/* Today underline */}
                  {isToday && (
                    <div className="w-4 h-[2px] bg-[#ff4520] -mt-0.5" />
                  )}
                  <span className={`text-[${isToday && !isCompleted ? '13' : '11'}px] leading-none ${statusColor}`}>
                    {statusChar}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Right arrow — hidden (not removed) when at current week */}
          <button
            onClick={onNextWeek}
            aria-label="Next week"
            className={`min-w-[32px] min-h-[52px] flex items-center justify-center text-[24px] font-light shrink-0 transition-opacity ${
              weekOffset < 0 ? 'text-[#888888] active:opacity-50' : 'invisible'
            }`}
            disabled={weekOffset >= 0}
          >
            ›
          </button>
        </div>
      </div>
    </>
  )
})

export default PhaseCard
