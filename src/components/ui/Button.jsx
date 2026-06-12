import { memo, useCallback } from 'react'
import { shadows, gradients } from '../../styles/tokens'

const VARIANTS = {
  primary: {
    base: 'w-full h-[56px] text-white font-semibold text-[15px] tracking-[-0.01em] active:scale-[0.98] transition-all duration-150',
    disabled: 'w-full h-[56px] text-[#333333] pointer-events-none',
    loading: 'w-full h-[56px] text-white/70 font-semibold text-[15px] animate-pulse pointer-events-none',
  },
  secondary: {
    base: 'w-full h-[56px] border border-[#2a2a2a] text-[#888888] text-[13px] tracking-[0.06em] uppercase active:scale-[0.98] transition-all duration-150',
    disabled: 'w-full h-[56px] border border-[#1a1a1a] text-[#333333] pointer-events-none',
    loading: 'w-full h-[56px] border border-[#2a2a2a] text-[#555555] animate-pulse pointer-events-none',
  },
  ghost: {
    base: 'text-[#ff4520] text-[13px] font-semibold active:opacity-70',
    disabled: 'text-[#333333] text-[13px] font-semibold pointer-events-none',
    loading: 'text-[#ff4520]/50 text-[13px] font-semibold animate-pulse pointer-events-none',
  },
  success: {
    base: 'w-full h-[56px] text-white font-semibold active:scale-[0.98] transition-all duration-150',
    disabled: 'w-full h-[56px] bg-[#22c55e]/40 text-white/50 pointer-events-none',
    loading: 'w-full h-[56px] bg-[#22c55e]/70 text-white/70 animate-pulse pointer-events-none',
  },
  danger: {
    base: 'w-full h-[56px] bg-[#ef4444] text-white font-semibold active:scale-[0.98] transition-all duration-150',
    disabled: 'w-full h-[56px] bg-[#ef4444]/40 text-white/50 pointer-events-none',
    loading: 'w-full h-[56px] bg-[#ef4444]/70 text-white/70 animate-pulse pointer-events-none',
  },
}

const DEPTH_STYLES = {
  primary: {
    base: { background: gradients.buttonAccent, boxShadow: shadows.buttonAccent },
    active: { background: '#e03a1a', boxShadow: 'none' },
    disabled: { background: '#161616', boxShadow: 'none' },
    loading: { background: gradients.buttonAccent, boxShadow: 'none', opacity: 0.7 },
  },
  secondary: {
    base: { background: gradients.buttonSecondary, boxShadow: shadows.button },
    active: { background: '#222222', boxShadow: 'none' },
    disabled: {},
    loading: {},
  },
  ghost: { base: {}, active: {}, disabled: {}, loading: {} },
  success: {
    base: { background: gradients.buttonSuccess, boxShadow: '0 1px 0 rgba(255,255,255,0.15) inset, 0 2px 8px rgba(34,197,94,0.25)' },
    active: { background: '#1ea34e', boxShadow: 'none' },
    disabled: {},
    loading: {},
  },
  danger: {
    base: { boxShadow: shadows.button },
    active: { boxShadow: 'none' },
    disabled: {},
    loading: {},
  },
}

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
  const depth = DEPTH_STYLES[variant] || DEPTH_STYLES.primary
  const style = loading ? depth.loading : disabled ? depth.disabled : depth.base

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
      style={style}
      aria-busy={loading}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {loading ? 'Loading...' : label}
    </button>
  )
}

export default memo(Button)
