import { memo, useCallback } from 'react'
import { shadows, gradients } from '../../styles/tokens'

const CHECK_SVG = (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
)

const UNCHECKED_STYLE = {
  background: gradients.input,
  boxShadow: shadows.input,
}

const CHECKED_STYLE = {
  background: 'linear-gradient(180deg, #ff5533 0%, #ff4520 100%)',
  boxShadow: '0 1px 0 rgba(255,255,255,0.2) inset, 0 2px 6px rgba(255,69,32,0.3)',
}

function Checkbox({ checked, onToggle, size = 24 }) {
  const handleToggle = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate(30)
    onToggle()
  }, [onToggle])

  const cls = `shrink-0 flex items-center justify-center rounded-full transition-all duration-150 ${
    checked
      ? 'text-white'
      : 'border-2 border-[#333333] text-transparent'
  }`
  const style = checked ? CHECKED_STYLE : UNCHECKED_STYLE

  if (!onToggle) {
    return (
      <div
        role="checkbox"
        aria-checked={checked}
        className={cls}
        style={{ ...style, width: size, height: size }}
      >
        {CHECK_SVG}
      </div>
    )
  }

  return (
    <button
      onClick={handleToggle}
      role="checkbox"
      aria-checked={checked}
      className={cls}
      style={{ ...style, width: size, height: size }}
    >
      {CHECK_SVG}
    </button>
  )
}

export default memo(Checkbox)
