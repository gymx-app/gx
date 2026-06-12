import { memo } from 'react'

function Toggle({ value, onChange, disabled = false }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={disabled ? undefined : onChange}
      disabled={disabled}
      className={`w-10 h-6 relative transition-all duration-150 rounded-full ${
        disabled ? 'opacity-40' : ''
      }`}
      style={value ? {
        background: 'linear-gradient(180deg, #ff5533 0%, #ff4520 100%)',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3), 0 0 8px rgba(255,69,32,0.2)',
      } : {
        background: 'linear-gradient(180deg, #1a1a1a 0%, #161616 100%)',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
      }}
    >
      <div
        className={`w-5 h-5 rounded-full absolute top-0.5 transition-transform duration-150 ${
          value ? 'translate-x-[18px]' : 'translate-x-0.5'
        }`}
        style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #f0f0f0 100%)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
        }}
      />
    </button>
  )
}

export default memo(Toggle)
