import { memo } from 'react'
import { colors, radius } from '../../styles/tokens'

function Toggle({ value, onChange, disabled = false }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={disabled ? undefined : onChange}
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
