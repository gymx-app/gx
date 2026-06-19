import { useState, useEffect, useRef } from 'react'

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
  const [pullDistance, setPullDistance] = useState(0)
  const [ptrState, setPtrState] = useState('idle')
  const [transitioning, setTransitioning] = useState(false)

  const onRefreshRef = useRef(onRefresh)
  useEffect(() => {
    onRefreshRef.current = onRefresh
  })

  useEffect(() => {
    function onTouchStart(e) {
      const el = scrollRef.current
      if (!el || el.scrollTop > 2) return
      if (!el.contains(e.target)) return
      const t = e.touches[0]
      ptrRef.current = {
        startY: t.clientY,
        startX: t.clientX,
        tracking: false,
        pulling: false,
        pullY: 0,
      }
      hapticFiredRef.current = false
    }

    function onTouchMove(e) {
      const ref = ptrRef.current
      if (!ref.startY) return
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
      setPullDistance(travel)

      if (progress >= 1) {
        setPtrState('triggered')
        if (!hapticFiredRef.current) {
          hapticFiredRef.current = true
          if (navigator.vibrate) navigator.vibrate(10)
        }
      } else {
        setPtrState('pulling')
      }
    }

    async function onTouchEnd() {
      const ref = ptrRef.current
      const el = scrollRef.current
      if (!ref.pulling || !el) {
        ptrRef.current.tracking = false
        ptrRef.current.startY = 0
        return
      }

      const wasTriggered = ref.pullY >= threshold

      setTransitioning(true)
      setPullDistance(0)
      setPullProgress(0)

      ptrRef.current = {
        startY: 0,
        startX: 0,
        tracking: false,
        pulling: false,
        pullY: 0,
      }

      setTimeout(() => setTransitioning(false), 320)

      if (wasTriggered) {
        setPtrState('refreshing')
        try {
          await onRefreshRef.current()
        } finally {
          setPtrState('done')
          if (navigator.vibrate) navigator.vibrate(30)
          setTimeout(() => setPtrState('idle'), 600)
        }
      } else {
        setPtrState('idle')
      }
    }

    const endHandler = () => void onTouchEnd()

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', endHandler, { passive: true })

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', endHandler)
    }
  }, [scrollRef, resistance, maxPull, threshold])

  return { pullProgress, pullDistance, ptrState, transitioning }
}
