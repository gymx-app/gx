import { memo, useRef, useEffect } from 'react'
import SectionLabel from './SectionLabel'
import { colors, radius } from '../../styles/tokens'

const VARIANT_CLASSES = {
  field: "h-[52px] w-full px-[14px] text-[#f0ede8] text-[16px] font-['DM_Sans'] placeholder:text-[#444444] focus:border-[#ff4520] transition-all duration-150",
  large: "text-[24px] font-black text-[#f0ede8] text-center bg-transparent focus:outline-none w-full placeholder-[#555555] font-['Bebas_Neue'] tracking-[1px]",
}

const VARIANT_STYLES = {
  field: { background: colors.surface2, border: `1.5px solid ${colors.border}`, borderRadius: radius.input },
  large: {},
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
}) {
  const ref = useRef(null)

  useEffect(() => {
    if (autoFocus && ref.current) {
      const t = setTimeout(() => {
        ref.current.focus()
        if (ref.current.value) ref.current.select()
      }, 100)
      return () => clearTimeout(t)
    }
  }, [autoFocus])

  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)

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
        className={VARIANT_CLASSES[variant] || VARIANT_CLASSES.field}
        style={VARIANT_STYLES[variant] || VARIANT_STYLES.field}
        aria-label={label}
      />
      {unit && (
        <span className="text-[10px] text-[#666666] mt-1 block text-center">{unit}</span>
      )}
    </div>
  )
}

export default memo(Input)
