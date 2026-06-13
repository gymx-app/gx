import { useMemo, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDayWorkout } from '../../utils/programme'
import { colors, radius } from '../../styles/tokens'

const PHASE_COLORS: Record<number, string> = {
  1: '#ff4520',
  2: '#ff8c00',
  3: '#22c55e',
  4: '#3b82f6',
  5: '#a855f7',
}

interface Phase {
  phase_number: number
  name?: string
  description?: string
  weeks_count?: number
}

interface WeekDay {
  dayLabel: string
  date: Date
  dateStr: string
}

interface PhaseCardProps {
  phase: number
  weekInPhase: number
  totalWeek: number
  phaseWeeks: number[]
  minActiveDays: number
  currentWeekActiveDays: number
  weekOffset: number
  onPrevWeek: () => void
  onNextWeek: () => void
  canGoBack: boolean
  canGoForward: boolean
  programme: unknown
  phases: Phase[]
  weekDays: WeekDay[]
  selectedDateStr: string
  completedDateStrs: Set<string>
  onSelectDay: (dayLabel: string, dateStr: string, date: Date) => void
  onGoToToday: () => void
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
}: PhaseCardProps) {
  const navigate = useNavigate()
  const currentPhase = phases?.find(p => p.phase_number === phase)
  const totalWeeksInPhase = currentPhase?.weeks_count || phaseWeeks[phase - 1] || 4
  const isOngoing = totalWeeksInPhase === 999
  const totalPhases = phases?.length || phaseWeeks?.length || 5

  const phaseColor = PHASE_COLORS[phase] || colors.accent
  const phasePct = isOngoing ? 100 : Math.min(100, (weekInPhase / totalWeeksInPhase) * 100)

  const todayDateStr = useMemo(() => {
    const d = new Date()
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0')
  }, [])

  const lissLabels = useMemo(() => {
    const set = new Set<string>()
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
      <div
        className="mx-4 mt-3 overflow-hidden"
        style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.settings }}
      >
        {/* Header — tappable to Programme tab */}
        <button
          onClick={() => navigate('/program')}
          className="w-full px-[14px] py-3 flex justify-between items-center active:bg-[#1c1c1c] transition-colors duration-150"
        >
          <span className="font-['Bebas_Neue'] text-[18px] tracking-[1.5px] text-[#f0ede8]">
            FITNESS PROGRAMME
          </span>
          <span className="text-[11px] text-[#666666]">›</span>
        </button>

        {/* Phase progress bar */}
        <div className="h-[3px] bg-[#2a2a2a] mx-[14px]">
          <div
            className="h-full rounded-[2px] transition-all duration-600"
            style={{ width: `${phasePct}%`, background: phaseColor }}
          />
        </div>

        {/* Phase timeline — horizontal scroll */}
        <div className="flex gap-[6px] px-[14px] py-[10px] overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {Array.from({ length: totalPhases }, (_, i) => {
            const p = i + 1
            const isCurrent = p === phase
            const isCompleted = p < phase
            const pColor = PHASE_COLORS[p] || colors.accent
            const phaseDef = phases?.find(ph => ph.phase_number === p)
            const name = phaseDef?.name || `Phase ${p}`
            const wks = phaseDef?.weeks_count || phaseWeeks[i] || 4
            const isOngoingPhase = wks === 999

            return (
              <div
                key={p}
                className="shrink-0 flex flex-col items-center gap-[2px] rounded-[10px] px-[10px] py-[6px] transition-all duration-200"
                style={
                  isCurrent
                    ? { background: `${pColor}15`, border: `1.5px solid ${pColor}50` }
                    : isCompleted
                    ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }
                    : { background: colors.surface2, border: `1px solid ${colors.border}`, opacity: 0.5 }
                }
              >
                <span
                  className="text-[10px] font-bold tracking-[0.5px] leading-none whitespace-nowrap"
                  style={{ color: isCompleted ? '#22c55e' : isCurrent ? pColor : '#666666' }}
                >
                  {isCompleted ? `✓ P${p}` : `P${p}`} ({name})
                </span>
                <span
                  className="text-[9px] leading-none"
                  style={{ color: isCompleted ? '#22c55e' : isCurrent ? colors.text : '#666666' }}
                >
                  {isCompleted
                    ? 'Done'
                    : isCurrent
                    ? (isOngoing ? 'Ongoing' : `${weekInPhase}/${wks} weeks`)
                    : (isOngoingPhase ? 'Ongoing' : `${wks} weeks`)
                  }
                </span>
              </div>
            )
          })}
        </div>

        {/* Weekly qualification */}
        <div className="px-[14px] pb-[10px] flex justify-between items-center">
          <span className="text-[12px] text-[#666666]">
            {currentWeekActiveDays >= minActiveDays ? (
              <><strong className="text-[#f0ede8]">{currentWeekActiveDays}/{minActiveDays}</strong> days — qualified</>
            ) : (
              <><strong className="text-[#f0ede8]">{currentWeekActiveDays}/{minActiveDays}</strong> days — {Math.max(0, minActiveDays - currentWeekActiveDays)} more needed</>
            )}
          </span>
          {currentWeekActiveDays >= minActiveDays && (
            <span className="text-[11px] font-bold tracking-[0.5px] text-[#22c55e]">✓</span>
          )}
        </div>
      </div>

      {/* Week strip */}
      <div className="mx-4 mt-3">
        {showTodayPill && (
          <div className="flex justify-center pb-[6px]">
            <button
              onClick={onGoToToday}
              className="text-[11px] font-semibold text-[#ff4520] px-[10px] py-[4px] rounded-[8px] bg-[#141414] border border-[#ff452040] active:bg-[#242424] transition-all duration-150"
            >
              ← Today
            </button>
          </div>
        )}

        <div className="flex items-center justify-center pb-[6px]">
          <span className="text-[12px] font-semibold text-[#666666] tracking-[0.03em]">
            WEEK {totalWeek}
          </span>
        </div>

        <div className="flex gap-[6px] overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {/* Prev week button */}
          <button
            onClick={onPrevWeek}
            disabled={!canGoBack}
            aria-label="Previous week"
            className={`flex flex-col items-center justify-center gap-[3px] py-2 px-[10px] rounded-[12px] min-w-[44px] shrink-0 transition-all duration-150 active:scale-[0.93] ${
              canGoBack ? 'bg-[#141414] active:bg-[#242424]' : 'opacity-30'
            }`}
            style={{ border: `1.5px solid ${colors.border}` }}
          >
            <span className="text-[16px] leading-none text-[#666666]">&lt;</span>
          </button>

          {weekDays.map(({ dayLabel, date, dateStr: dayDateStr }) => {
            const isSelected = dayDateStr === selectedDateStr
            const isToday = dayDateStr === todayDateStr
            const isCompleted = completedDateStrs.has(dayDateStr)
            const isPast = dayDateStr < todayDateStr
            const isFuture = dayDateStr > todayDateStr
            const dayNum = date.getDate()

            let dotColor = colors.border
            let dayColor = '#666666'
            let numColor = '#f0ede8'

            if (isCompleted) {
              dotColor = '#22c55e'
              dayColor = '#22c55e'
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

          {/* Next week button */}
          <button
            onClick={onNextWeek}
            disabled={!canGoForward}
            aria-label="Next week"
            className={`flex flex-col items-center justify-center gap-[3px] py-2 px-[10px] rounded-[12px] min-w-[44px] shrink-0 transition-all duration-150 active:scale-[0.93] ${
              canGoForward ? 'bg-[#141414] active:bg-[#242424]' : 'opacity-30'
            }`}
            style={{ border: `1.5px solid ${colors.border}` }}
          >
            <span className="text-[16px] leading-none text-[#666666]">&gt;</span>
          </button>
        </div>
      </div>
    </>
  )
})

export default PhaseCard
