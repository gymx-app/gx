import { memo, useEffect, useRef, useCallback, useState } from 'react'

const HEIGHT_MAP = {
  auto: 'max-h-[90vh]',
  '75vh': 'h-[75vh]',
  '90vh': 'h-[90vh]',
  full: 'h-full',
}

/**
 * Reusable bottom sheet with swipe-to-dismiss and focus trapping.
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   children: React.ReactNode,
 *   height?: 'auto'|'75vh'|'90vh'|'full',
 * }} props
 */
function BottomSheet({ isOpen, onClose, children, height = 'auto' }) {
  const sheetRef = useRef(null)
  const triggerRef = useRef(null)
  const touchStartY = useRef(0)
  const [translateY, setTranslateY] = useState(0)
  const [mounted, setMounted] = useState(false)

  // Capture the element that opened the sheet
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement
      setMounted(true)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      // Return focus to trigger
      triggerRef.current?.focus?.()
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Focus first focusable on open
  useEffect(() => {
    if (isOpen && mounted && sheetRef.current) {
      const focusable = sheetRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      focusable?.focus()
    }
  }, [isOpen, mounted])

  // ESC to close
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Swipe down gesture
  const handleTouchStart = useCallback((e) => {
    touchStartY.current = e.touches[0].clientY
  }, [])

  const handleTouchMove = useCallback((e) => {
    const delta = e.touches[0].clientY - touchStartY.current
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
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        className={`relative w-full bg-[#0f0f0f] rounded-t-[16px] z-50 animate-slide-up ${HEIGHT_MAP[height] || HEIGHT_MAP.auto}`}
        style={{ transform: translateY > 0 ? `translateY(${translateY}px)` : undefined }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-[#2a2a2a] rounded-full mx-auto mt-3 mb-2" />
        {children}
      </div>
    </div>
  )
}

export default memo(BottomSheet)
