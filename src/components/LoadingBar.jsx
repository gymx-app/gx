import { useState, useEffect, useRef } from 'react'
import { useLoading } from '../hooks/useLoading'

export default function LoadingBar() {
  const { isLoading } = useLoading()
  const [width, setWidth] = useState(0)
  const [visible, setVisible] = useState(false)
  const crawlRef = useRef(null)
  const fadeRef = useRef(null)

  useEffect(() => {
    // Clear any pending timers
    if (crawlRef.current) clearInterval(crawlRef.current)
    if (fadeRef.current) clearTimeout(fadeRef.current)

    if (isLoading) {
      setVisible(true)
      setWidth(0)

      // Jump to 85% quickly
      requestAnimationFrame(() => setWidth(85))

      // Then crawl slowly toward 95%
      crawlRef.current = setInterval(() => {
        setWidth(prev => {
          if (prev >= 95) return prev
          return prev + 0.5
        })
      }, 200)
    } else if (visible) {
      // Complete: jump to 100% then fade out
      if (crawlRef.current) clearInterval(crawlRef.current)
      setWidth(100)

      fadeRef.current = setTimeout(() => {
        setVisible(false)
        setWidth(0)
      }, 200)
    }

    return () => {
      if (crawlRef.current) clearInterval(crawlRef.current)
      if (fadeRef.current) clearTimeout(fadeRef.current)
    }
  }, [isLoading])

  if (!visible) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] safe-area-top pointer-events-none">
      <div
        className="h-[2px] bg-[#ff4520]"
        style={{
          width: `${width}%`,
          transition: isLoading
            ? width <= 85
              ? 'width 300ms ease-out'
              : 'width 200ms linear'
            : 'width 150ms ease-out',
          opacity: width === 100 ? 0 : 1,
          transitionProperty: 'width, opacity',
          transitionDuration: width === 100 ? '150ms, 200ms' : undefined,
        }}
      />
    </div>
  )
}
