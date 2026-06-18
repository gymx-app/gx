import { useState, useEffect, useRef, memo } from 'react'
import { colors } from '../../styles/tokens'

interface RestTimerHUDProps {
  durationSec: number
  exerciseName: string
  onDismiss: () => void
}

const RestTimerHUD = memo(function RestTimerHUD({
  durationSec,
  exerciseName: _exerciseName,
  onDismiss,
}: RestTimerHUDProps) {
  const [remaining, setRemaining] = useState(durationSec)
  const startRef = useRef(Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000)
      const left = Math.max(0, durationSec - elapsed)
      setRemaining(left)

      if (left === 0) {
        clearInterval(interval)
        if (navigator.vibrate) navigator.vibrate([200, 100, 200])
        setTimeout(onDismiss, 3000)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [durationSec, onDismiss])

  const progressPct = ((durationSec - remaining) / durationSec) * 100
  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const timeStr = `${mins}:${String(secs).padStart(2, '0')}`
  const isDone = remaining === 0

  return (
    <div
      className="fixed bottom-[72px] left-1/2 -translate-x-1/2 z-[55] flex items-center gap-3 px-[18px] py-[10px] whitespace-nowrap transition-all duration-250"
      style={{
        background: colors.surface,
        border: `1.5px solid ${colors.border}`,
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}
    >
      <div>
        <span className="font-['Bebas_Neue'] text-[13px] tracking-[1px] text-[#666666] block">
          REST
        </span>
      </div>
      <span
        className={`font-['Bebas_Neue'] text-[28px] tracking-[2px] min-w-[52px] text-center ${isDone ? 'text-[#22c55e]' : 'text-[#f0ede8]'}`}
      >
        {isDone ? 'GO' : timeStr}
      </span>
      <div className="w-[80px] h-1 bg-[#2a2a2a] rounded-[4px] overflow-hidden">
        <div
          className={`h-full rounded-[4px] transition-[width] duration-[0.9s] linear bg-[#22c55e]`}
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <button
        onClick={onDismiss}
        className="text-[11px] font-bold text-[#666666] px-3 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[6px] tracking-[0.5px] active:opacity-60"
        aria-label="Skip rest timer"
      >
        SKIP
      </button>
    </div>
  )
})

export default RestTimerHUD
