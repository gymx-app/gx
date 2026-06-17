import { useState, useMemo, memo } from 'react'
import { colors } from '../../styles/tokens'
import PhaseBottomSheet from './PhaseBottomSheet'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

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

interface Programme {
  name?: string
  goal?: string
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
  programme: Programme | null
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
  const [sheetOpen, setSheetOpen] = useState(false)

  const currentPhase = phases?.find(p => p.phase_number === phase)
  const totalWeeksInPhase = currentPhase?.weeks_count || phaseWeeks?.[phase - 1] || 4
  const isOngoing = totalWeeksInPhase === 999
  const totalPhases = phases?.length || phaseWeeks?.length || 5
  const phaseName = currentPhase?.name || `Phase ${phase}`

  const qualifyPct = Math.min(100, (currentWeekActiveDays / minActiveDays) * 100)
  const qualified = currentWeekActiveDays >= minActiveDays

  const todayDateStr = useMemo(() => {
    const d = new Date()
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0')
  }, [])

  const showTodayPill = weekOffset !== 0

  return (
    <>
      {/* ── Phase card ── */}
      <div
        className="mx-4 mt-3 px-4 py-3"
        style={{ background: '#141414', border: '1px solid #202020' }}
      >
        {/* Line 1 */}
        <div className="flex justify-between items-center">
          <span className="text-[13px] font-semibold tracking-[-0.01em] text-white">
            {phaseName.toUpperCase()} · WK {weekInPhase}{isOngoing ? '' : ` OF ${totalWeeksInPhase}`}
          </span>
          <button
            onClick={() => setSheetOpen(true)}
            className="text-[13px] font-semibold text-[#ff4520] min-w-[44px] min-h-[44px] flex items-center justify-end"
          >
            {phase}/{totalPhases} ›
          </button>
        </div>

        {/* Line 2 */}
        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1 h-[3px] bg-[#1a1a1a]">
            <div
              className="h-full bg-[#ff4520] transition-all duration-300"
              style={{ width: `${qualifyPct}%` }}
            />
          </div>
          {qualified ? (
            <span className="text-[11px] text-[#22c55e] font-semibold whitespace-nowrap">
              ✓ WEEK QUALIFIES
            </span>
          ) : (
            <span className="text-[11px] text-[#555555] whitespace-nowrap">
              {currentWeekActiveDays}/{minActiveDays} days
            </span>
          )}
        </div>
      </div>

      {/* ── Week strip — sticky below TopBar ── */}
      <div className="px-4 mt-3 sticky top-0 z-40 bg-[#0a0a0a] pb-2 border-b border-[#1a1a1a]">
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
              Wk {totalWeek} · {weekDays[0].date.getDate()} {MONTHS[weekDays[0].date.getMonth()]} – {weekDays[6].date.getDate()} {MONTHS[weekDays[6].date.getMonth()]}
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

        <div className="flex gap-[6px]">
          {weekDays.map(({ dayLabel, date, dateStr: dayDateStr }) => {
            const isSelected = dayDateStr === selectedDateStr
            const isToday = dayDateStr === todayDateStr
            const isCompleted = completedDateStrs.has(dayDateStr)
            const isPast = dayDateStr < todayDateStr
            const isFuture = dayDateStr > todayDateStr
            const isSunday = dayLabel === 'SUN'
            const dayNum = date.getDate()
            const monthStr = MONTHS[date.getMonth()]

            const isSkipped = isPast && !isCompleted && !isSunday

            let dayColor = '#666666'
            let numColor = '#f0ede8'

            if (isSunday) {
              dayColor = isToday ? '#ff4520' : '#333333'
              numColor = isToday ? '#f0ede8' : '#666666'
            } else if (isCompleted) {
              dayColor = '#22c55e'
            } else if (isSkipped) {
              dayColor = '#666666'
              numColor = '#666666'
            } else if (isFuture) {
              dayColor = '#666666'
              numColor = '#666666'
            }

            if (isToday && !isCompleted && !isSunday) {
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
                aria-label={`${dayLabel} ${dayNum} ${monthStr}${isToday ? ' (today)' : ''}${isSunday ? ' rest day' : ''}${isCompleted ? ' completed' : ''}${isSkipped ? ' skipped' : ''}`}
                aria-pressed={isSelected}
              >
                <span className="text-[10px] font-semibold" style={{ color: dayColor }}>
                  {dayLabel}
                </span>
                <span className="font-['Bebas_Neue'] text-[20px] leading-none" style={{ color: numColor }}>
                  {dayNum} {monthStr}
                </span>
                {isSunday ? (
                  <span className="text-[9px] font-semibold" style={{ color: '#333333' }}>REST</span>
                ) : isCompleted ? (
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

      {/* ── Phase bottom sheet ── */}
      <PhaseBottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        programme={programme}
        phases={phases}
        currentPhase={phase}
        weekInPhase={weekInPhase}
        phaseWeeks={phaseWeeks}
      />
    </>
  )
})

export default PhaseCard
