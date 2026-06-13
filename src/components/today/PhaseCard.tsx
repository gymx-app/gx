import { useMemo, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDayWorkout } from '../../utils/programme'
import { colors, radius } from '../../styles/tokens'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

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
      <div className="px-4 mt-3">
        {/* Week nav header: < Wk 1 · 8 Jun – 13 Jun > */}
        <div className="flex items-center gap-[8px] pb-[10px]">
          <button
            onClick={onPrevWeek}
            disabled={!canGoBack}
            aria-label="Previous week"
            className={`w-[44px] h-[44px] flex items-center justify-center rounded-[12px] shrink-0 transition-all duration-150 active:scale-[0.93] ${
              canGoBack ? 'bg-[#1c1c1c] active:bg-[#242424]' : 'opacity-30'
            }`}
            style={{ border: `1.5px solid ${colors.border}` }}
          >
            <span className="text-[16px] leading-none text-[#f0ede8]">&lt;</span>
          </button>

          <div className="flex-1 text-center">
            <span className="font-['Bebas_Neue'] text-[18px] tracking-[1px] text-[#f0ede8]">
              Wk {totalWeek} · {weekDays[0].date.getDate()} {MONTHS[weekDays[0].date.getMonth()]} – {weekDays[5].date.getDate()} {MONTHS[weekDays[5].date.getMonth()]}
            </span>
            {showTodayPill && (
              <button
                onClick={onGoToToday}
                className="ml-2 text-[11px] font-semibold text-[#ff4520] active:opacity-70"
              >
                Today
              </button>
            )}
          </div>

          <button
            onClick={onNextWeek}
            disabled={!canGoForward}
            aria-label="Next week"
            className={`w-[44px] h-[44px] flex items-center justify-center rounded-[12px] shrink-0 transition-all duration-150 active:scale-[0.93] ${
              canGoForward ? 'bg-[#1c1c1c] active:bg-[#242424]' : 'opacity-30'
            }`}
            style={{ border: `1.5px solid ${colors.border}` }}
          >
            <span className="text-[16px] leading-none text-[#f0ede8]">&gt;</span>
          </button>
        </div>

        {/* Day pills */}
        <div className="flex gap-[6px]">
          {weekDays.map(({ dayLabel, date, dateStr: dayDateStr }) => {
            const isSelected = dayDateStr === selectedDateStr
            const isToday = dayDateStr === todayDateStr
            const isCompleted = completedDateStrs.has(dayDateStr)
            const isPast = dayDateStr < todayDateStr
            const isFuture = dayDateStr > todayDateStr
            const dayNum = date.getDate()
            const monthStr = MONTHS[date.getMonth()]

            const isSkipped = isPast && !isCompleted

            let dayColor = '#666666'
            let numColor = '#f0ede8'

            if (isCompleted) {
              dayColor = '#22c55e'
            } else if (isSkipped) {
              dayColor = '#666666'
              numColor = '#666666'
            } else if (isFuture) {
              dayColor = '#666666'
              numColor = '#666666'
            }

            if (isToday && !isCompleted) {
              dayColor = '#ff4520'
            }

            return (
              <button
                key={dayLabel}
                className={`flex-1 flex flex-col items-center gap-[3px] py-[10px] rounded-[14px] min-w-0 transition-all duration-150 active:scale-[0.93]`}
                style={{
                  background: isSelected ? '#242424' : '#1c1c1c',
                  border: `1.5px solid ${isSelected ? '#ff4520' : '#2a2a2a'}`,
                }}
                onClick={() => onSelectDay(dayLabel, dayDateStr, date)}
                aria-label={`${dayLabel} ${dayNum} ${monthStr}${isToday ? ' (today)' : ''}${isCompleted ? ' completed' : ''}${isSkipped ? ' skipped' : ''}`}
                aria-pressed={isSelected}
              >
                <span className="text-[9px] font-semibold" style={{ color: dayColor }}>
                  {dayLabel}
                </span>
                <span className="font-['Bebas_Neue'] text-[20px] leading-none" style={{ color: numColor }}>
                  {dayNum} {monthStr}
                </span>
                {isCompleted ? (
                  <span className="text-[12px] leading-none text-[#22c55e]">✓</span>
                ) : isSkipped ? (
                  <span className="text-[12px] leading-none text-[#ff4520]">—</span>
                ) : (
                  <div className="w-[5px] h-[5px] rounded-full" style={{ background: isToday ? '#ff4520' : colors.border }} />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
})

export default PhaseCard
