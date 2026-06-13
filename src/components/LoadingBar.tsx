import { useState, useEffect, useRef } from 'react'
import { useLoading } from '../hooks/useLoading'

export default function LoadingBar() {
  const { isLoading } = useLoading()
  const [width, setWidth] = useState(0)
  const [visible, setVisible] = useState(false)
  const crawlRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fadeRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (crawlRef.current) clearInterval(crawlRef.current)
    if (fadeRef.current) clearTimeout(fadeRef.current)

    if (isLoading) {
      setVisible(true)
      setWidth(0)

      requestAnimationFrame(() => setWidth(85))

      crawlRef.current = setInterval(() => {
        setWidth(prev => {
          if (prev >= 95) return prev
          return prev + 0.5
        })
      }, 200)
    } else if (visible) {
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

  const done = !isLoading && width === 100

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] safe-area-top pointer-events-none">
      <div
        className="h-[2px] bg-[#ff4520]"
        style={{
          width: `${width}%`,
          opacity: done ? 0 : 1,
          transition: done
            ? 'width 150ms ease-out, opacity 200ms 100ms ease-out'
            : width <= 85
            ? 'width 300ms ease-out'
            : 'width 200ms linear',
        }}
      />
    </div>
  )
}
