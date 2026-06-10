import { memo, useCallback } from 'react'

const VARIANTS = {
  primary: {
    base: 'w-full h-[56px] bg-[#ff4520] text-white font-semibold text-[15px] tracking-[-0.01em] active:scale-[0.98] transition-transform',
    disabled: 'w-full h-[56px] bg-[#1a1a1a] text-[#333333] pointer-events-none',
    loading: 'w-full h-[56px] bg-[#ff4520]/70 text-white/70 font-semibold text-[15px] animate-pulse pointer-events-none',
  },
  secondary: {
    base: 'w-full h-[56px] border border-[#2a2a2a] text-[#888888] text-[13px] tracking-[0.06em] uppercase active:scale-[0.98] transition-transform',
    disabled: 'w-full h-[56px] border border-[#1a1a1a] text-[#333333] pointer-events-none',
    loading: 'w-full h-[56px] border border-[#2a2a2a] text-[#555555] animate-pulse pointer-events-none',
  },
  ghost: {
    base: 'text-[#ff4520] text-[13px] font-semibold active:opacity-70',
    disabled: 'text-[#333333] text-[13px] font-semibold pointer-events-none',
    loading: 'text-[#ff4520]/50 text-[13px] font-semibold animate-pulse pointer-events-none',
  },
  success: {
    base: 'w-full h-[56px] bg-[#22c55e] text-white font-semibold active:scale-[0.98] transition-transform',
    disabled: 'w-full h-[56px] bg-[#22c55e]/40 text-white/50 pointer-events-none',
    loading: 'w-full h-[56px] bg-[#22c55e]/70 text-white/70 animate-pulse pointer-events-none',
  },
  danger: {
    base: 'w-full h-[56px] bg-[#ef4444] text-white font-semibold active:scale-[0.98] transition-transform',
    disabled: 'w-full h-[56px] bg-[#ef4444]/40 text-white/50 pointer-events-none',
    loading: 'w-full h-[56px] bg-[#ef4444]/70 text-white/70 animate-pulse pointer-events-none',
  },
}

/**
 * Design-system button with haptic feedback on primary variant.
 * @param {{
 *   variant?: 'primary'|'secondary'|'ghost'|'success'|'danger',
 *   label: string,
 *   onPress: () => void,
 *   disabled?: boolean,
 *   loading?: boolean,
 *   fullWidth?: boolean,
 *   icon?: React.ReactNode,
 *   className?: string,
 * }} props
 */
function Button({
  variant = 'primary',
  label,
  onPress,
  disabled = false,
  loading = false,
  fullWidth = true,
  icon,
  className = '',
}) {
  const v = VARIANTS[variant] || VARIANTS.primary
  const cls = loading ? v.loading : disabled ? v.disabled : v.base

  const handlePress = useCallback(() => {
    if (disabled || loading) return
    if (variant === 'primary' && navigator.vibrate) navigator.vibrate(50)
    onPress?.()
  }, [disabled, loading, variant, onPress])

  return (
    <button
      onClick={handlePress}
      disabled={disabled || loading}
      className={`${cls} ${!fullWidth ? 'w-auto' : ''} ${className}`}
      aria-busy={loading}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {loading ? 'Loading...' : label}
    </button>
  )
}

export default memo(Button)
