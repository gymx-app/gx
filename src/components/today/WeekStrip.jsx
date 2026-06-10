import { memo } from 'react'
import { getDayKey } from '../../utils/programme'

const WeekStrip = memo(function WeekStrip({
  weekDays,
  selectedDateStr,
  completedDateStrs,
  onSelectDay,
}) {
  const todayStr = getDayKey(new Date())
  const todayDate = new Date()
  const todayDateStr =
    todayDate.getFullYear() + '-' +
    String(todayDate.getMonth() + 1).padStart(2, '0') + '-' +
    String(todayDate.getDate()).padStart(2, '0')

  return (
    <div className="flex items-end justify-between px-4 py-3 border-b border-[#111111]">
      {weekDays.map(({ dayLabel, date, dateStr }) => {
        const isSelected = dateStr === selectedDateStr
        const isToday = dateStr === todayDateStr
        const isCompleted = completedDateStrs.has(dateStr)
        const dayNum = date.getDate()

        return (
          <button
            key={dayLabel}
            className="flex flex-col items-center gap-1 flex-1 min-w-0"
            onClick={() => onSelectDay(dayLabel, dateStr, date)}
          >
            <span className={`text-[10px] font-semibold tracking-wider ${
              isSelected ? 'text-white' : 'text-[#444444]'
            }`}>
              {dayLabel}
            </span>

            <div className={`w-9 h-9 flex items-center justify-center text-[14px] font-bold transition-all duration-150 ${
              isSelected && isToday
                ? 'bg-[#ff4520] text-white'
                : isSelected
                ? 'bg-[#1a1a1a] text-white'
                : isToday
                ? 'text-white'
                : 'text-[#333333]'
            }`}>
              {dayNum}
            </div>

            <div className="h-1.5">
              {isCompleted && (
                <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
})

export default WeekStrip
