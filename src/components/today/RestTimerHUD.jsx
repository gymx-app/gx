import { useState, useEffect, useRef } from 'react'

export default function RestTimerHUD({ durationSec, exerciseName, onDismiss }) {
  const [remaining, setRemaining] = useState(durationSec)
  const startRef = useRef(Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000)
      const left = Math.max(0, durationSec - elapsed)
      setRemaining(left)

      if (left === 0) {
        clearInterval(interval)
        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate([200, 100, 200])
        // Auto-dismiss after 3s
        setTimeout(onDismiss, 3000)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [durationSec, onDismiss])

  const progressPct = ((durationSec - remaining) / durationSec) * 100
  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const timeStr = `${mins}:${String(secs).padStart(2, '0')}`
  const isDone = remaining === 0

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[55] bg-[#111111] border-t border-[#1a1a1a] safe-area-bottom">
      {/* Progress bar */}
      <div className="h-[3px] bg-[#1a1a1a] w-full">
        <div
          className={`h-full transition-all duration-200 ${isDone ? 'bg-[#22c55e]' : 'bg-[#ff4520]'}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className={`text-[24px] font-black tracking-tight ${isDone ? 'text-[#22c55e]' : 'text-white'}`}>
            {isDone ? 'GO' : timeStr}
          </p>
          {exerciseName && (
            <p className="text-[11px] text-[#444444] mt-0.5">Rest — {exerciseName}</p>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="px-4 py-2 text-[12px] font-bold tracking-wider text-[#555555] active:text-white"
        >
          SKIP
        </button>
      </div>
    </div>
  )
}
