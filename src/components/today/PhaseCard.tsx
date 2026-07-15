import { useMemo, memo } from 'react'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { colors } from '../../styles/tokens'
import { getDayStatus, type DayStatus } from '../../utils/dayStatus'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface WeekDay {
  dayLabel: string
  date: Date
  dateStr: string
}

interface PhaseCardProps {
  totalWeek: number
  weekOffset: number
  onPrevWeek: () => void
  onNextWeek: () => void
  canGoBack: boolean
  canGoForward: boolean
  weekDays: WeekDay[]
  selectedDateStr: string
  completedDateStrs: Set<string>
  restDayIndices: Set<number>
  onSelectDay: (dayLabel: string, dateStr: string, date: Date) => void
  onGoToToday: () => void
  programmeStartDate: string | null
}

function getPillStyle(status: DayStatus, isSelected: boolean) {
  if (isSelected) {
    return {
      container: { background: 'var(--surface-2)', border: '2px solid var(--placeholder)' },
      dayColor: 'var(--text-secondary)',
      numColor: 'var(--white)',
    }
  }

  switch (status) {
    case 'completed':
      return {
        container: { background: 'transparent', border: '1.5px solid var(--success)' },
        dayColor: 'var(--success)',
        numColor: 'var(--text)',
      }
    case 'today':
      return {
        container: { background: 'var(--accent-muted)', border: '2px solid var(--accent)' },
        dayColor: 'var(--accent)',
        numColor: 'var(--text)',
      }
    case 'skipped':
      return {
        container: { background: 'transparent', border: '0.5px solid var(--muted-border)' },
        dayColor: 'var(--muted)',
        numColor: 'var(--muted)',
      }
    case 'future':
      return {
        container: { background: 'transparent', border: '0.5px solid var(--muted-border)' },
        dayColor: 'var(--muted)',
        numColor: 'var(--muted)',
      }
    case 'rest':
      return {
        container: { background: 'transparent', border: '0.5px solid var(--muted-border)' },
        dayColor: 'var(--muted)',
        numColor: 'var(--muted)',
      }
    default:
      return {
        container: { background: 'transparent', border: '0.5px solid var(--muted-border)' },
        dayColor: 'var(--muted)',
        numColor: 'var(--text)',
      }
  }
}

const PhaseCard = memo(function PhaseCard({
  totalWeek,
  weekOffset,
  onPrevWeek,
  onNextWeek,
  canGoBack,
  canGoForward: _canGoForward,
  weekDays,
  selectedDateStr,
  completedDateStrs,
  restDayIndices,
  onSelectDay,
  onGoToToday,
  programmeStartDate,
}: PhaseCardProps) {
  const todayDateStr = useMemo(() => {
    const d = new Date()
    return (
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0')
    )
  }, [])

  const showTodayPill = weekOffset !== 0

  return (
    <>
      {/* ── Week strip — sticky below TopBar ── */}
      <div className="px-4 mt-3 sticky top-0 z-40 bg-bg pb-2 pt-2 border-b border-border-subtle">
        <div className="flex items-center gap-[8px] pb-[10px] px-1">
          <button
            onClick={onPrevWeek}
            disabled={!canGoBack}
            aria-label="Previous week"
            className={`w-[40px] h-[40px] flex items-center justify-center rounded-[12px] shrink-0 transition-all duration-150 ${
              canGoBack
                ? 'bg-surface-2 active:bg-surface-3 active:scale-[0.93]'
                : 'pointer-events-none cursor-default'
            }`}
            style={{ border: `1.5px solid ${colors.border}`, minWidth: 44, minHeight: 44 }}
          >
            <ChevronLeft
              size={18}
              strokeWidth={1.5}
              color={canGoBack ? colors.text : colors.surface}
            />
          </button>

          <div className="flex-1 text-center">
            <span className="font-['Bebas_Neue'] text-[18px] tracking-[1px] text-text">
              Wk {totalWeek} · {weekDays[0]!.date.getDate()} {MONTHS[weekDays[0]!.date.getMonth()]}{' '}
              – {weekDays[6]!.date.getDate()} {MONTHS[weekDays[6]!.date.getMonth()]}
            </span>
            {showTodayPill && (
              <button
                onClick={onGoToToday}
                className="ml-2 text-[11px] font-semibold text-accent active:opacity-70"
              >
                Today
              </button>
            )}
          </div>

          <button
            onClick={onNextWeek}
            aria-label="Next week"
            className="w-[40px] h-[40px] flex items-center justify-center rounded-[12px] shrink-0 transition-all duration-150 bg-surface-2 active:bg-surface-3 active:scale-[0.93]"
            style={{ border: `1.5px solid ${colors.border}`, minWidth: 44, minHeight: 44 }}
          >
            <ChevronRight size={18} strokeWidth={1.5} color={colors.text} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {weekDays.map(({ dayLabel, date, dateStr: dayDateStr }, idx) => {
            const status = getDayStatus(
              dayDateStr,
              completedDateStrs,
              restDayIndices,
              programmeStartDate,
              todayDateStr,
              idx
            )
            const isSelected = dayDateStr === selectedDateStr
            const dayNum = date.getDate()

            if (status === 'pre_programme') {
              return (
                <div
                  key={dayLabel}
                  className="rounded-[12px] flex flex-col items-center justify-center"
                  style={{
                    minHeight: 72,
                    background: 'var(--surface)',
                    border: '0.5px solid var(--muted-border)',
                    cursor: 'default',
                  }}
                >
                  <span
                    className="text-[10px] font-semibold"
                    style={{ color: 'var(--muted)', letterSpacing: '0.06em', opacity: 0.4 }}
                  >
                    {dayLabel}
                  </span>
                </div>
              )
            }

            const pillStyle = getPillStyle(status, isSelected)

            return (
              <button
                key={dayLabel}
                className="flex flex-col items-center justify-center rounded-[12px]"
                style={{
                  minHeight: 72,
                  ...pillStyle.container,
                  transition: 'transform 120ms ease, background 120ms ease',
                }}
                onClick={() => onSelectDay(dayLabel, dayDateStr, date)}
                onPointerDown={(e) => {
                  ;(e.currentTarget as HTMLElement).style.transform = 'scale(0.95)'
                }}
                onPointerUp={(e) => {
                  ;(e.currentTarget as HTMLElement).style.transform = 'scale(1)'
                }}
                onPointerLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.transform = 'scale(1)'
                }}
                aria-label={`${dayLabel} ${dayNum}${status === 'today' ? ' (today)' : ''}${status === 'rest' ? ' rest day' : ''}${status === 'completed' ? ' completed' : ''}${status === 'skipped' ? ' skipped' : ''}`}
                aria-pressed={isSelected}
              >
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: pillStyle.dayColor, letterSpacing: '0.06em' }}
                >
                  {dayLabel}
                </span>

                {status === 'rest' ? (
                  <span
                    className="text-[10px] font-semibold mt-[6px]"
                    style={{ color: 'var(--muted)', letterSpacing: '0.06em', opacity: 0.5 }}
                  >
                    REST
                  </span>
                ) : (
                  <span
                    className="font-['Bebas_Neue'] text-[20px] leading-none mt-[4px]"
                    style={{ color: pillStyle.numColor, fontWeight: 500 }}
                  >
                    {dayNum}
                  </span>
                )}

                <div className="mt-[6px] h-[10px] flex items-center justify-center">
                  {status === 'completed' ? (
                    <Check size={10} strokeWidth={2.5} color="var(--success)" />
                  ) : status === 'skipped' ? (
                    <div
                      className="w-[5px] h-[5px] rounded-full"
                      style={{ background: 'var(--error)' }}
                    />
                  ) : (
                    <div className="w-[5px] h-[5px]" />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
})

export default PhaseCard
