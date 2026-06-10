import { memo, useCallback } from 'react'

const CHECK_SVG = (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
)

/**
 * Circular checkbox with haptic feedback.
 * @param {{ checked: boolean, onToggle: () => void, size?: number }} props
 */
function Checkbox({ checked, onToggle, size = 22 }) {
  const handleToggle = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate(30)
    onToggle()
  }, [onToggle])

  return (
    <button
      onClick={handleToggle}
      role="checkbox"
      aria-checked={checked}
      className={`shrink-0 flex items-center justify-center rounded-full transition-colors duration-150 ${
        checked
          ? 'bg-[#ff4520] border-[#ff4520] text-white'
          : 'border-2 border-[#2a2a2a] text-transparent'
      }`}
      style={{ width: size, height: size }}
    >
      {CHECK_SVG}
    </button>
  )
}

export default memo(Checkbox)
