import { useState, useEffect, useRef, memo } from 'react'
import { ProgressBar } from '../ui'

const RestTimerHUD = memo(function RestTimerHUD({ durationSec, exerciseName, onDismiss }) {
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
    }, 100)

    return () => clearInterval(interval)
  }, [durationSec, onDismiss])

  const progressPct = ((durationSec - remaining) / durationSec) * 100
  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const timeStr = `${mins}:${String(secs).padStart(2, '0')}`
  const isDone = remaining === 0

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[55] border-t border-[#222222] safe-area-bottom"
      style={{
        background: 'linear-gradient(180deg, #141414 0%, #111111 100%)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.7)',
      }}
    >
      <ProgressBar
        progress={progressPct}
        color={isDone ? 'success' : 'accent'}
        height={3}
      />

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
          className="px-4 py-2 text-[12px] font-bold tracking-wider text-[#555555] active:text-white min-h-[44px]"
          aria-label="Skip rest timer"
        >
          SKIP
        </button>
      </div>
    </div>
  )
})

export default RestTimerHUD
