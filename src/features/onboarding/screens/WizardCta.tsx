import { Loader2 } from 'lucide-react'
import { colors, radius } from '../../../styles/tokens'

interface WizardCtaProps {
  label: string
  disabled?: boolean
  saving?: boolean
  onTap: () => void
  variant?: 'default' | 'danger'
}

// Every screen renders its own fixed-bottom CTA (rather than the shell owning
// one shared button) because validation, save calls, and labels differ enough
// per screen that a single generic CTA would need a large prop surface anyway.
export function WizardCta({ label, disabled, saving, onTap, variant = 'default' }: WizardCtaProps) {
  const active = !disabled && !saving
  const bg = variant === 'danger' ? colors.error : colors.accent
  return (
    <div
      className="fixed left-0 right-0 px-5 pt-3 z-20"
      style={{
        bottom: 0,
        background: `linear-gradient(transparent, ${colors.bg} 20%)`,
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
      }}
    >
      <button
        onClick={onTap}
        disabled={Boolean(disabled) || Boolean(saving)}
        className="w-full py-4 font-['Bebas_Neue'] text-[18px] tracking-[2px] transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-2"
        style={{
          borderRadius: radius.button,
          background: active ? bg : colors.surface3,
          color: active ? colors.white : colors.muted,
          border: 'none',
          cursor: active ? 'pointer' : 'default',
          opacity: saving ? 0.7 : 1,
          minHeight: 56,
        }}
      >
        {saving && <Loader2 size={18} className="animate-spin" />}
        {label}
      </button>
    </div>
  )
}
