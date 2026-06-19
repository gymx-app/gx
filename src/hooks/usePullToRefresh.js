import { useState, useEffect, useRef, useCallback } from 'react'

export function usePullToRefresh(scrollRef, onRefresh, options = {}) {
  const { threshold = 64, maxPull = 80, resistance = 0.45 } = options

  const ptrRef = useRef({
    startY: 0,
    startX: 0,
    tracking: false,
    pulling: false,
    pullY: 0,
  })
  const hapticFiredRef = useRef(false)
  const [pullProgress, setPullProgress] = useState(0)
  const [ptrState, setPtrState] = useState('idle')

  const onRefreshRef = useRef(onRefresh)
  useEffect(() => {
    onRefreshRef.current = onRefresh
  })

  const handleTouchStart = useCallback(
    (e) => {
      const el = scrollRef.current
      if (!el || el.scrollTop > 2) return
      const t = e.touches[0]
      ptrRef.current = {
        startY: t.clientY,
        startX: t.clientX,
        tracking: false,
        pulling: false,
        pullY: 0,
      }
      hapticFiredRef.current = false
    },
    [scrollRef]
  )

  const handleTouchMove = useCallback(
    (e) => {
      const ref = ptrRef.current
      const el = scrollRef.current
      if (!el || el.scrollTop > 2) return
      const t = e.touches[0]
      const dy = t.clientY - ref.startY
      const dx = Math.abs(t.clientX - ref.startX)

      if (!ref.tracking) {
        if (Math.abs(dy) < 8) return
        if (dy > 0 && dy > dx * 1.5) {
          ref.tracking = true
          ref.pulling = true
        } else {
          return
        }
      }

      if (!ref.pulling) return

      const travel = Math.min(dy * resistance, maxPull)
      ref.pullY = travel
      const progress = Math.min(travel / threshold, 1)
      setPullProgress(progress)

      if (progress >= 1) {
        setPtrState('triggered')
        if (!hapticFiredRef.current) {
          hapticFiredRef.current = true
          if (navigator.vibrate) navigator.vibrate(10)
        }
      } else {
        setPtrState('pulling')
      }

      el.style.transform = `translateY(${travel}px)`
      el.style.transition = 'none'
    },
    [scrollRef, resistance, maxPull, threshold]
  )

  const handleTouchEnd = useCallback(async () => {
    const ref = ptrRef.current
    const el = scrollRef.current
    if (!ref.pulling || !el) {
      ptrRef.current.tracking = false
      return
    }

    const wasTriggered = ref.pullY >= threshold

    el.style.transition = 'transform 320ms cubic-bezier(0.25, 1, 0.5, 1)'
    el.style.transform = 'translateY(0)'

    ptrRef.current = {
      startY: 0,
      startX: 0,
      tracking: false,
      pulling: false,
      pullY: 0,
    }

    if (wasTriggered) {
      setPtrState('refreshing')
      setPullProgress(0)
      try {
        await onRefreshRef.current()
      } finally {
        setPtrState('done')
        if (navigator.vibrate) navigator.vibrate(30)
        setTimeout(() => setPtrState('idle'), 600)
      }
    } else {
      setPullProgress(0)
      setPtrState('idle')
    }
  }, [scrollRef, threshold])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const onEnd = (e) => void handleTouchEnd(e)

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: true })
    el.addEventListener('touchend', onEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', onEnd)
      el.style.transform = ''
      el.style.transition = ''
    }
  }, [scrollRef, handleTouchStart, handleTouchMove, handleTouchEnd])

  return { pullProgress, ptrState }
}
