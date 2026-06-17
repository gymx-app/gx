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
  programmeStartDate: string | null
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
  programmeStartDate,
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
            className={`w-[44px] h-[44px] flex items-center justify-center rounded-[12px] shrink-0 transition-all duration-150 ${
              canGoBack ? 'bg-[#1c1c1c] active:bg-[#242424] active:scale-[0.93]' : 'pointer-events-none cursor-default'
            }`}
            style={{ border: `1.5px solid ${colors.border}` }}
          >
            <span className="text-[16px] leading-none" style={{ color: canGoBack ? '#f0ede8' : '#1a1a1a' }}>&lt;</span>
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
            aria-label="Next week"
            className="w-[44px] h-[44px] flex items-center justify-center rounded-[12px] shrink-0 transition-all duration-150 bg-[#1c1c1c] active:bg-[#242424] active:scale-[0.93]"
            style={{ border: `1.5px solid ${colors.border}` }}
          >
            <span className="text-[16px] leading-none text-[#f0ede8]">&gt;</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {weekDays.map(({ dayLabel, date, dateStr: dayDateStr }) => {
            const isBeforeStart = programmeStartDate ? dayDateStr < programmeStartDate : false
            const isStartDate = programmeStartDate ? dayDateStr === programmeStartDate : false
            const isSelected = dayDateStr === selectedDateStr
            const isToday = dayDateStr === todayDateStr
            const isCompleted = completedDateStrs.has(dayDateStr)
            const isPast = dayDateStr < todayDateStr
            const isFuture = dayDateStr > todayDateStr
            const isSunday = dayLabel === 'SUN'
            const dayNum = date.getDate()

            if (isBeforeStart) {
              return (
                <div
                  key={dayLabel}
                  className="rounded-[12px]"
                  style={{ minHeight: 72, background: '#111111', border: '1.5px solid #1a1a1a' }}
                />
              )
            }

            const isSkipped = isPast && !isCompleted && !isSunday

            let dayColor = '#555555'
            let numColor = '#f0ede8'

            if (isSelected) {
              dayColor = '#999999'
              numColor = '#ffffff'
            } else if (isFuture) {
              dayColor = '#444444'
              numColor = '#555555'
            } else if (isSunday) {
              dayColor = isToday ? '#ff4520' : '#333333'
              numColor = isToday ? '#f0ede8' : '#444444'
            } else if (isCompleted) {
              dayColor = '#22c55e'
            } else if (isSkipped) {
              dayColor = '#555555'
              numColor = '#555555'
            }

            if (isToday && !isSelected && !isCompleted && !isSunday) {
              dayColor = '#ff4520'
            }

            const bg = isSelected ? '#1c1c1c' : 'transparent'
            const border = isToday && !isSelected
              ? `2px solid ${colors.accent}`
              : isSelected
              ? '2px solid #333333'
              : '2px solid transparent'

            return (
              <button
                key={dayLabel}
                className="flex flex-col items-center justify-center rounded-[12px]"
                style={{
                  minHeight: 72,
                  background: bg,
                  border,
                  transition: 'transform 120ms ease, background 120ms ease',
                }}
                onClick={() => onSelectDay(dayLabel, dayDateStr, date)}
                onPointerDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.95)' }}
                onPointerUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
                onPointerLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
                aria-label={`${dayLabel} ${dayNum}${isToday ? ' (today)' : ''}${isSunday ? ' rest day' : ''}${isCompleted ? ' completed' : ''}${isSkipped ? ' skipped' : ''}${isStartDate ? ' programme start' : ''}`}
                aria-pressed={isSelected}
              >
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: dayColor, letterSpacing: '0.06em' }}
                >
                  {dayLabel}
                </span>

                {isSunday && !isToday ? (
                  <span
                    className="text-[10px] font-semibold mt-[6px]"
                    style={{ color: '#333333', letterSpacing: '0.06em' }}
                  >
                    REST
                  </span>
                ) : (
                  <span
                    className="font-['Bebas_Neue'] text-[20px] leading-none mt-[4px]"
                    style={{ color: numColor, fontWeight: 500 }}
                  >
                    {dayNum}
                  </span>
                )}

                <div className="mt-[6px] h-[5px] flex items-center justify-center">
                  {isStartDate ? (
                    <span className="text-[8px] font-bold text-[#ff4520]" style={{ letterSpacing: '0.06em' }}>START</span>
                  ) : isCompleted ? (
                    <div className="w-[5px] h-[5px] rounded-full bg-[#22c55e]" />
                  ) : isSkipped ? (
                    <div className="w-[5px] h-[5px] rounded-full bg-[#ff4520]" />
                  ) : (
                    <div className="w-[5px] h-[5px]" />
                  )}
                </div>
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
