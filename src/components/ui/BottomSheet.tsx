import { memo, useEffect, useRef, useCallback, useState, type ReactNode } from 'react'

const HEIGHT_MAP = {
  auto: 'max-h-[90vh]',
  '75vh': 'h-[75vh]',
  '90vh': 'h-[90vh]',
  full: 'h-full',
} as const

type SheetHeight = keyof typeof HEIGHT_MAP

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  height?: SheetHeight
}

function BottomSheet({ isOpen, onClose, children, height = 'auto' }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<Element | null>(null)
  const touchStartY = useRef(0)
  const [translateY, setTranslateY] = useState(0)
  const mountedRef = useRef(false)

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement
      mountedRef.current = true
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      ;(triggerRef.current as HTMLElement)?.focus?.()
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && mountedRef.current && sheetRef.current) {
      const focusable = sheetRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      focusable?.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0]!.clientY
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const delta = e.touches[0]!.clientY - touchStartY.current
    if (delta > 0) setTranslateY(delta)
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (translateY > 80) {
      onClose()
    }
    setTranslateY(0)
  }, [translateY, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden="true" />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        className={`relative w-full bg-[#141414] rounded-t-[20px] z-50 animate-slide-up ${HEIGHT_MAP[height] || HEIGHT_MAP.auto}`}
        style={{ transform: translateY > 0 ? `translateY(${translateY}px)` : undefined }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="w-10 h-1 bg-[#2a2a2a] rounded-full mx-auto mt-3 mb-2" />
        {children}
      </div>
    </div>
  )
}

export default memo(BottomSheet)
