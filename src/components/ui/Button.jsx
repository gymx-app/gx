import { memo, useCallback } from 'react'
import { colors, radius } from '../../styles/tokens'

const VARIANTS = {
  primary: {
    base: 'w-full py-4 text-white font-bold text-[18px] tracking-[2px] active:opacity-80 transition-opacity duration-150',
    disabled: 'w-full py-4 text-[#666666] pointer-events-none',
    loading: 'w-full py-4 text-white/70 font-bold text-[18px] animate-pulse pointer-events-none',
  },
  secondary: {
    base: 'w-full py-[13px] border border-[#2a2a2a] text-[#666666] text-[13px] font-bold tracking-[0.5px] active:bg-[#242424] transition-all duration-150',
    disabled: 'w-full py-[13px] border border-[#1c1c1c] text-[#444444] pointer-events-none',
    loading: 'w-full py-[13px] border border-[#2a2a2a] text-[#555555] animate-pulse pointer-events-none',
  },
  ghost: {
    base: 'text-[#ff4520] text-[12px] font-bold active:opacity-60',
    disabled: 'text-[#444444] text-[12px] font-bold pointer-events-none',
    loading: 'text-[#ff4520]/50 text-[12px] font-bold animate-pulse pointer-events-none',
  },
  success: {
    base: 'w-full py-4 text-white font-bold active:opacity-80 transition-opacity duration-150',
    disabled: 'w-full py-4 bg-[#22c55e]/40 text-white/50 pointer-events-none',
    loading: 'w-full py-4 bg-[#22c55e]/70 text-white/70 animate-pulse pointer-events-none',
  },
  danger: {
    base: 'w-full py-4 bg-[#ef4444] text-white font-bold active:opacity-80 transition-opacity duration-150',
    disabled: 'w-full py-4 bg-[#ef4444]/40 text-white/50 pointer-events-none',
    loading: 'w-full py-4 bg-[#ef4444]/70 text-white/70 animate-pulse pointer-events-none',
  },
}

const STYLES = {
  primary: {
    base: { background: colors.accent, borderRadius: radius.button },
    disabled: { background: colors.surface3, borderRadius: radius.button },
    loading: { background: colors.accent, borderRadius: radius.button, opacity: 0.7 },
  },
  secondary: {
    base: { background: colors.surface3, borderRadius: radius.buttonSm },
    disabled: { borderRadius: radius.buttonSm },
    loading: { borderRadius: radius.buttonSm },
  },
  ghost: { base: {}, disabled: {}, loading: {} },
  success: {
    base: { background: colors.success, borderRadius: radius.button },
    disabled: { borderRadius: radius.button },
    loading: { borderRadius: radius.button },
  },
  danger: {
    base: { borderRadius: radius.button },
    disabled: { borderRadius: radius.button },
    loading: { borderRadius: radius.button },
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
  const styles = STYLES[variant] || STYLES.primary
  const style = loading ? styles.loading : disabled ? styles.disabled : styles.base

  const handlePress = useCallback(() => {
    if (disabled || loading) return
    if (variant === 'primary' && navigator.vibrate) navigator.vibrate(50)
    onPress?.()
  }, [disabled, loading, variant, onPress])

  return (
    <button
      onClick={handlePress}
      disabled={disabled || loading}
      className={`${cls} ${!fullWidth ? 'w-auto' : ''} font-['Bebas_Neue'] ${className}`}
      style={style}
      aria-busy={loading}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {loading ? 'Loading...' : label}
    </button>
  )
}

export default memo(Button)
