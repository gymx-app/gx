import { memo } from 'react'
import { shadows, gradients } from '../../styles/tokens'

const VARIANTS = {
  default: {
    cls: 'border border-[#1a1a1a]',
    style: { background: gradients.card, boxShadow: shadows.card },
  },
  elevated: {
    cls: 'border border-[#222222]',
    style: { background: gradients.cardElevated, boxShadow: shadows.cardElevated },
  },
  accentLeft: {
    cls: 'border border-[#1a1a1a] border-l-[3px] border-l-[#ff4520]',
    style: { background: gradients.card, boxShadow: shadows.card },
  },
  successLeft: {
    cls: 'border border-[#1a1a1a] border-l-[3px] border-l-[#22c55e]',
    style: { background: gradients.card, boxShadow: shadows.card },
  },
  transparent: {
    cls: 'bg-transparent border border-[#1a1a1a]',
    style: {},
  },
}

function Card({ variant = 'default', padding = 'p-4', children, onPress, className = '' }) {
  const v = VARIANTS[variant] || VARIANTS.default
  const interactive = onPress ? 'active:brightness-110 transition-all duration-150 min-h-[44px] cursor-pointer' : ''

  if (onPress) {
    return (
      <button
        onClick={onPress}
        className={`${v.cls} ${padding} ${interactive} w-full text-left ${className}`}
        style={v.style}
      >
        {children}
      </button>
    )
  }

  return (
    <div className={`${v.cls} ${padding} ${className}`} style={v.style}>
      {children}
    </div>
  )
}

export default memo(Card)
