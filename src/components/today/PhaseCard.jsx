import { useMemo, memo } from 'react'
import { getDayWorkout } from '../../utils/programme'
import { colors, radius } from '../../styles/tokens'

const LISS_TYPES = new Set(['liss'])

const PHASE_COLORS = {
  1: '#ff4520',
  2: '#ff8c00',
  3: '#22c55e',
  4: '#3b82f6',
  5: '#a855f7',
}

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
  canGoForward,
  programme,
  phases,
  weekDays,
  selectedDateStr,
  completedDateStrs,
  onSelectDay,
  onGoToToday,
}) {
  const currentPhase = phases?.find(p => p.phase_number === phase)
  const totalWeeksInPhase = currentPhase?.weeks_count || phaseWeeks[phase - 1] || 4
  const isOngoing = totalWeeksInPhase === 999
  const totalPhases = phases?.length || phaseWeeks?.length || 5

  const phaseName = currentPhase?.name || ''
  const phaseGoal = currentPhase?.description || ''

  const daysNeeded = Math.max(0, minActiveDays - currentWeekActiveDays)
  const weekQualified = daysNeeded === 0
  const qualifyPct = Math.min(100, (currentWeekActiveDays / minActiveDays) * 100)
  const phaseColor = PHASE_COLORS[phase] || colors.accent

  const todayDateStr = useMemo(() => {
    const d = new Date()
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0')
  }, [])

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
      {/* Phase banner */}
      <div
        className="mx-4 mt-3 overflow-hidden"
        style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.settings }}
      >
        {/* Phase header */}
        <div className="px-[14px] py-3 flex justify-between items-center">
          <span className="text-[11px] font-bold tracking-[1.5px] uppercase" style={{ color: phaseColor }}>
            {phaseName.toUpperCase() || `PHASE ${phase}`}
          </span>
          <span className="text-[11px] text-[#666666]">
            {isOngoing ? 'ONGOING' : `WK ${weekInPhase} / ${totalWeeksInPhase}`}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-[4px] bg-[#2a2a2a] mx-[14px]">
          <div
            className="h-full rounded-[2px] transition-all duration-600"
            style={{ width: `${qualifyPct}%`, background: phaseColor }}
          />
        </div>

        {/* Day dots */}
        <div className="flex gap-[6px] px-[14px] py-[10px] items-center">
          {weekDays.map(({ dayLabel, date, dateStr: dayDateStr }) => {
            const isToday = dayDateStr === todayDateStr
            const isCompleted = completedDateStrs.has(dayDateStr)
            const isPast = dayDateStr < todayDateStr
            const isFuture = dayDateStr > todayDateStr
            const isLissDay = lissLabels.has(dayLabel)

            let dotStyle = {}
            let dotCls = 'flex-1 h-[32px] rounded-[8px] flex flex-col items-center justify-center gap-[2px] text-[8px] font-bold tracking-[0.5px] transition-all duration-200'

            if (isCompleted) {
              dotStyle = { background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', color: '#22c55e' }
            } else if (isPast) {
              dotStyle = { background: 'rgba(255,69,32,0.08)', border: '1px solid rgba(255,69,32,0.2)', color: '#ff4520' }
            } else if (isFuture) {
              dotStyle = { background: colors.surface2, border: `1px solid ${colors.border}`, color: '#666666', opacity: 0.5 }
            } else {
              dotStyle = { background: colors.surface2, border: `1px solid ${colors.border}`, color: '#f0ede8' }
            }

            if (isToday) dotStyle.borderWidth = '2px'

            return (
              <div key={dayLabel} className={dotCls} style={dotStyle}>
                {isCompleted ? (
                  <span className="text-[10px] leading-none">✓</span>
                ) : (
                  <span>{dayLabel.slice(0, 1)}</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-[14px] pb-[10px] flex justify-between items-center">
          <span className="text-[12px] text-[#666666]">
            {weekQualified ? (
              <><strong className="text-[#f0ede8]">{currentWeekActiveDays}/{minActiveDays}</strong> days — qualified</>
            ) : (
              <><strong className="text-[#f0ede8]">{currentWeekActiveDays}/{minActiveDays}</strong> days — {daysNeeded} more needed</>
            )}
          </span>
          {weekQualified && (
            <span className="text-[11px] font-bold tracking-[0.5px] text-[#22c55e]">✓</span>
          )}
        </div>
      </div>

      {/* Day pills with week navigation */}
      <div className="mx-4 mt-3">
        {/* Week nav + today button */}
        <div className="flex items-center justify-between pb-[6px] gap-2">
          <button
            onClick={onPrevWeek}
            disabled={!canGoBack}
            aria-label="Previous week"
            className={`px-[10px] py-1 text-[13px] rounded-[8px] transition-all duration-150 ${
              canGoBack ? 'bg-[#141414] border border-[#2a2a2a] text-[#f0ede8] active:bg-[#242424]' : 'text-[#2a2a2a]'
            }`}
          >
            ‹
          </button>

          <span className="text-[12px] font-semibold text-[#666666] flex-1 text-center tracking-[0.03em]">
            WEEK {totalWeek}
          </span>

          {showTodayPill && (
            <button
              onClick={onGoToToday}
              className="text-[12px] font-semibold text-[#ff4520] px-[6px] py-[2px] rounded-[6px]"
            >
              Today
            </button>
          )}

          <button
            onClick={onNextWeek}
            disabled={!canGoForward}
            aria-label="Next week"
            className={`px-[10px] py-1 text-[13px] rounded-[8px] transition-all duration-150 ${
              canGoForward ? 'bg-[#141414] border border-[#2a2a2a] text-[#f0ede8] active:bg-[#242424]' : 'text-[#2a2a2a]'
            }`}
          >
            ›
          </button>
        </div>

        {/* Day pills */}
        <div className="flex gap-[6px] overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {weekDays.map(({ dayLabel, date, dateStr: dayDateStr }) => {
            const isSelected = dayDateStr === selectedDateStr
            const isToday = dayDateStr === todayDateStr
            const isCompleted = completedDateStrs.has(dayDateStr)
            const isPast = dayDateStr < todayDateStr
            const isFuture = dayDateStr > todayDateStr
            const isLissDay = lissLabels.has(dayLabel)
            const dayNum = date.getDate()

            let dotColor = colors.border
            let dayColor = '#666666'
            let numColor = '#f0ede8'

            if (isCompleted) {
              dotColor = '#22c55e'
              dayColor = isLissDay ? '#666666' : '#22c55e'
            } else if (isPast && !isCompleted) {
              dotColor = colors.border
              dayColor = '#666666'
              numColor = '#666666'
            } else if (isFuture) {
              dayColor = '#666666'
              numColor = '#666666'
            }

            if (isToday && !isCompleted) {
              dayColor = '#ff4520'
              dotColor = '#ff4520'
            }

            return (
              <button
                key={dayLabel}
                className={`flex-1 flex flex-col items-center gap-[3px] py-2 px-[10px] rounded-[12px] min-w-[44px] shrink-0 transition-all duration-150 active:scale-[0.93] ${
                  isSelected
                    ? 'bg-[#242424] border-[#ff4520]'
                    : 'bg-[#141414] border-[#2a2a2a]'
                }`}
                style={{ border: `1.5px solid ${isSelected ? '#ff4520' : '#2a2a2a'}` }}
                onClick={() => onSelectDay(dayLabel, dayDateStr, date)}
                aria-label={`${dayLabel} ${dayNum}${isToday ? ' (today)' : ''}${isCompleted ? ' completed' : ''}`}
                aria-pressed={isSelected}
              >
                <span className="text-[9px] font-semibold" style={{ color: dayColor }}>
                  {dayLabel}
                </span>
                <span className="font-['Bebas_Neue'] text-[18px] leading-none" style={{ color: numColor }}>
                  {dayNum}
                </span>
                <div className="w-[5px] h-[5px] rounded-full" style={{ background: dotColor }} />
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
})

export default PhaseCard
