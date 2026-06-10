import { memo } from 'react'

const VARIANTS = {
  default: 'bg-[#111111] border border-[#1a1a1a]',
  elevated: 'bg-[#1a1a1a] border border-[#2a2a2a]',
  accentLeft: 'bg-[#111111] border border-[#1a1a1a] border-l-[3px] border-l-[#ff4520]',
  successLeft: 'bg-[#111111] border border-[#1a1a1a] border-l-[3px] border-l-[#22c55e]',
  transparent: 'bg-transparent border border-[#1a1a1a]',
}

/**
 * Card container with optional tap handler.
 * @param {{
 *   variant?: 'default'|'elevated'|'accentLeft'|'successLeft'|'transparent',
 *   padding?: string,
 *   children: React.ReactNode,
 *   onPress?: () => void,
 *   className?: string,
 * }} props
 */
function Card({ variant = 'default', padding = 'p-4', children, onPress, className = '' }) {
  const base = VARIANTS[variant] || VARIANTS.default
  const interactive = onPress ? 'active:bg-[#ffffff05] transition-colors min-h-[44px] cursor-pointer' : ''

  if (onPress) {
    return (
      <button
        onClick={onPress}
        className={`${base} ${padding} ${interactive} w-full text-left ${className}`}
      >
        {children}
      </button>
    )
  }

  return (
    <div className={`${base} ${padding} ${className}`}>
      {children}
    </div>
  )
}

export default memo(Card)
