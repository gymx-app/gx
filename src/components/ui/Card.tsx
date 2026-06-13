import { memo, type ReactNode, type CSSProperties } from 'react'
import { colors, radius } from '../../styles/tokens'

type CardVariant = 'default' | 'elevated' | 'accentLeft' | 'successLeft' | 'transparent'

const VARIANTS: Record<CardVariant, { cls: string; style: CSSProperties }> = {
  default: {
    cls: '',
    style: { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.card },
  },
  elevated: {
    cls: '',
    style: { background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: radius.card },
  },
  accentLeft: {
    cls: '',
    style: { background: colors.surface, border: `1px solid ${colors.border}`, borderLeft: `3px solid ${colors.accent}`, borderRadius: radius.card },
  },
  successLeft: {
    cls: '',
    style: { background: colors.surface, border: `1px solid ${colors.border}`, borderLeft: `3px solid ${colors.success}`, borderRadius: radius.card },
  },
  transparent: {
    cls: '',
    style: { background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: radius.card },
  },
}

interface CardProps {
  variant?: CardVariant
  padding?: string
  children: ReactNode
  onPress?: () => void
  className?: string
}

function Card({ variant = 'default', padding = 'p-4', children, onPress, className = '' }: CardProps) {
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
