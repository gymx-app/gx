import { memo, useCallback, type ReactNode, type CSSProperties } from 'react'
import { colors, radius } from '../../styles/tokens'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'success' | 'danger'

type VariantClasses = { base: string; disabled: string; loading: string }
type VariantStyles = { base: CSSProperties; disabled: CSSProperties; loading: CSSProperties }

const VARIANTS: Record<ButtonVariant, VariantClasses> = {
  primary: {
    base: 'w-full py-4 text-text font-bold text-[18px] tracking-[2px] active:opacity-80 transition-opacity duration-150',
    disabled: 'w-full py-4 text-muted pointer-events-none',
    loading: 'w-full py-4 text-text/70 font-bold text-[18px] animate-pulse pointer-events-none',
  },
  secondary: {
    base: 'w-full py-[13px] border border-border text-muted text-[13px] font-bold tracking-[0.5px] active:bg-surface-3 transition-all duration-150',
    disabled: 'w-full py-[13px] border border-surface-2 text-placeholder pointer-events-none',
    loading:
      'w-full py-[13px] border border-border text-disabled animate-pulse pointer-events-none',
  },
  ghost: {
    base: 'text-accent text-[12px] font-bold active:opacity-60',
    disabled: 'text-placeholder text-[12px] font-bold pointer-events-none',
    loading: 'text-accent/50 text-[12px] font-bold animate-pulse pointer-events-none',
  },
  success: {
    base: 'w-full py-4 text-text font-bold active:opacity-80 transition-opacity duration-150',
    disabled: 'w-full py-4 bg-success/40 text-text/50 pointer-events-none',
    loading: 'w-full py-4 bg-success/70 text-text/70 animate-pulse pointer-events-none',
  },
  danger: {
    base: 'w-full py-4 text-text font-bold active:opacity-80 transition-opacity duration-150',
    disabled: 'w-full py-4 text-text/50 pointer-events-none',
    loading: 'w-full py-4 text-text/70 animate-pulse pointer-events-none',
  },
}

const STYLES: Record<ButtonVariant, VariantStyles> = {
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
    base: { background: colors.error, borderRadius: radius.button },
    disabled: { background: colors.error, borderRadius: radius.button, opacity: 0.4 },
    loading: { background: colors.error, borderRadius: radius.button, opacity: 0.7 },
  },
}

interface ButtonProps {
  variant?: ButtonVariant
  label: string
  onPress?: () => void
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  icon?: ReactNode
  className?: string
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
}: ButtonProps) {
  const v = VARIANTS[variant]
  const cls = loading ? v.loading : disabled ? v.disabled : v.base
  const styles = STYLES[variant]
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
