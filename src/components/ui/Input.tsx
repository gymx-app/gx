import { memo, useRef, useEffect, type ChangeEvent } from 'react'
import SectionLabel from './SectionLabel'
import { colors, radius } from '../../styles/tokens'

const VARIANT_CLASSES = {
  field:
    "h-[52px] w-full px-[14px] text-[#f0ede8] text-[16px] font-['DM_Sans'] placeholder:text-[#444444] focus:border-[#ff4520] transition-all duration-150",
  large:
    "text-[24px] font-black text-[#f0ede8] text-center bg-transparent focus:outline-none w-full placeholder-[#555555] font-['Bebas_Neue'] tracking-[1px]",
} as const

type InputVariant = keyof typeof VARIANT_CLASSES

const VARIANT_STYLES: Record<InputVariant, React.CSSProperties> = {
  field: {
    background: colors.surface2,
    border: `1.5px solid ${colors.border}`,
    borderRadius: radius.input,
  },
  large: {},
}

interface InputProps {
  variant?: InputVariant
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  label?: string
  unit?: string
  type?: string
  inputMode?: 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url'
  autoFocus?: boolean
  readOnly?: boolean
  step?: string
  className?: string
  id?: string
}

function Input({
  variant = 'field',
  value,
  onChange,
  placeholder,
  label,
  unit,
  type = 'text',
  inputMode,
  autoFocus = false,
  readOnly = false,
  step,
  className = '',
  id,
}: InputProps) {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!autoFocus || !ref.current) return
    const t = setTimeout(() => {
      ref.current!.focus()
      if (ref.current!.value) ref.current!.select()
    }, 100)
    return () => clearTimeout(t)
  }, [autoFocus])

  const inputId = id ?? (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)

  return (
    <div className={className}>
      {label && <SectionLabel label={label} className="mb-2" />}
      <input
        ref={ref}
        id={inputId}
        type={type}
        inputMode={inputMode}
        step={step}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        className={VARIANT_CLASSES[variant]}
        style={VARIANT_STYLES[variant]}
        aria-label={label}
      />
      {unit && <span className="text-[10px] text-[#666666] mt-1 block text-center">{unit}</span>}
    </div>
  )
}

export default memo(Input)
