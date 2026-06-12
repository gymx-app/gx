import { useMemo, memo } from 'react'
import { getDayWorkout } from '../../utils/programme'
import { shadows, gradients } from '../../styles/tokens'

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
      {/* Phase card */}
      <div
        className="border border-[#202020] mx-5 mt-3 px-4 py-3"
        style={{ background: gradients.cardElevated, boxShadow: shadows.cardElevated }}
      >
        <div className="flex justify-between items-start">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] tracking-[0.1em] uppercase text-[#444444] font-semibold">
              PHASE {phase} OF {totalPhases}
            </p>
            <p className="text-[20px] font-bold tracking-[-0.03em] text-white mt-0.5">
              {phaseName.toUpperCase() || `PHASE ${phase}`}
            </p>
            {phaseGoal && (
              <p className="text-[12px] text-[#555555] mt-0.5 truncate">
                {phaseGoal}
              </p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#444444]">
              {isOngoing ? 'ONGOING' : `WK ${weekInPhase} OF ${totalWeeksInPhase}`}
            </span>
            {weekQualified ? (
              <span className="text-[10px] text-[#22c55e] font-semibold tracking-[0.08em] uppercase">
                ✓ WEEK QUALIFIES
              </span>
            ) : (
              <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#444444]">
                {currentWeekActiveDays}/{minActiveDays} DAYS
              </span>
            )}
          </div>
          <div className="w-full h-[3px] mt-1 bg-[#1a1a1a] relative">
            <div
              className="h-full transition-all duration-300 absolute inset-y-0 left-0"
              style={{
                width: `${qualifyPct}%`,
                background: '#ff4520',
              }}
            />
          </div>
        </div>
      </div>

      {/* Day pills with week navigation */}
      <div className="mx-5 mt-3">
        {showTodayPill && (
          <div className="flex justify-end mb-2">
            <button
              onClick={onGoToToday}
              className="text-[10px] tracking-[0.08em] uppercase bg-[#ff4520]/10 border border-[#ff4520]/20 text-[#ff4520] px-3 h-6 flex items-center font-semibold active:bg-[#ff4520]/20 transition-colors duration-120"
            >
              TODAY
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={onPrevWeek}
            disabled={!canGoBack}
            aria-label="Previous week"
            className={`min-w-[32px] min-h-[56px] flex items-center justify-center text-[24px] font-light shrink-0 transition-opacity duration-120 ${
              canGoBack ? 'text-[#888888] active:opacity-50' : 'text-[#222222]'
            }`}
          >
            ‹
          </button>

          <div className="flex-1 flex justify-between">
            {weekDays.map(({ dayLabel, date, dateStr: dayDateStr }) => {
              const isSelected = dayDateStr === selectedDateStr
              const isToday = dayDateStr === todayDateStr
              const isCompleted = completedDateStrs.has(dayDateStr)
              const isPast = dayDateStr < todayDateStr
              const isFuture = dayDateStr > todayDateStr
              const isLissDay = lissLabels.has(dayLabel)
              const dayNum = date.getDate()

              let statusEl = null
              let labelColor = 'text-[#333333]'
              let dateColor = 'text-[#333333]'

              if (isToday && !isCompleted) {
                labelColor = 'text-[#ff4520]'
                dateColor = 'text-white font-black'
                statusEl = <div className="w-5 h-[2px] bg-[#ff4520] mt-0.5" />
              } else if (isToday && isCompleted) {
                labelColor = 'text-[#ff4520]'
                dateColor = 'text-white font-black'
                statusEl = <span className="text-[11px] font-bold text-[#22c55e] leading-none mt-0.5">✓</span>
              } else if (isCompleted && isLissDay) {
                labelColor = 'text-[#333333]'
                dateColor = 'text-[#444444]'
                statusEl = <span className="text-[13px] text-[#3b82f6] leading-none mt-0.5">∼</span>
              } else if (isCompleted) {
                labelColor = 'text-[#333333]'
                dateColor = 'text-[#444444]'
                statusEl = <span className="text-[11px] font-bold text-[#22c55e] leading-none mt-0.5">✓</span>
              } else if (isPast) {
                labelColor = 'text-[#222222]'
                dateColor = 'text-[#2a2a2a]'
                statusEl = <span className="text-[11px] text-[#2a2a2a] leading-none mt-0.5">–</span>
              } else if (isFuture) {
                labelColor = 'text-[#181818]'
                dateColor = 'text-[#1e1e1e]'
              }

              if (isSelected && !isToday) {
                labelColor = 'text-[#888888]'
                dateColor = 'text-white'
              }

              return (
                <button
                  key={dayLabel}
                  className="flex-1 flex flex-col items-center gap-0.5 py-1 min-h-[56px] active:scale-[0.92] transition-transform duration-[80ms]"
                  onClick={() => onSelectDay(dayLabel, dayDateStr, date)}
                  aria-label={`${dayLabel} ${dayNum}${isToday ? ' (today)' : ''}${isCompleted ? ' completed' : ''}`}
                  aria-pressed={isSelected}
                >
                  <span className={`text-[9px] tracking-[0.1em] uppercase font-semibold ${labelColor}`}>
                    {dayLabel}
                  </span>
                  <span className={`text-[20px] font-bold ${dateColor}`}>
                    {dayNum}
                  </span>
                  {statusEl}
                </button>
              )
            })}
          </div>

          <button
            onClick={onNextWeek}
            disabled={!canGoForward}
            aria-label="Next week"
            className={`min-w-[32px] min-h-[56px] flex items-center justify-center text-[24px] font-light shrink-0 transition-opacity duration-120 ${
              canGoForward ? 'text-[#888888] active:opacity-50' : 'text-[#222222]'
            }`}
          >
            ›
          </button>
        </div>
      </div>
    </>
  )
})

export default PhaseCard
