import { memo } from 'react'
import { colors } from '../../styles/tokens'

interface ToggleProps {
  value: boolean
  onChange: () => void
  disabled?: boolean
}

function Toggle({ value, onChange, disabled = false }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={(e) => {
        e.stopPropagation()
        if (!disabled) onChange()
      }}
      disabled={disabled}
      className={`w-[44px] h-[26px] relative transition-all duration-200 ${
        disabled ? 'opacity-40' : ''
      }`}
      style={{
        borderRadius: '13px',
        border: `1.5px solid ${value ? colors.cyan : colors.border}`,
        background: value ? colors.cyan : colors.surface3,
      }}
    >
      {/* Invisible expanded tap target */}
      <span className="absolute -inset-[9px]" aria-hidden="true" />
      <div
        className={`w-[17px] h-[17px] rounded-full absolute top-[3px] transition-transform duration-200 ${
          value ? 'translate-x-[18px]' : 'translate-x-[3px]'
        }`}
        style={{
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
        }}
      />
    </button>
  )
}

export default memo(Toggle)
