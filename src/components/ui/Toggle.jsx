import { memo } from 'react'

/**
 * Pill-shaped toggle switch.
 * @param {{ value: boolean, onChange: () => void, disabled?: boolean }} props
 */
function Toggle({ value, onChange, disabled = false }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={disabled ? undefined : onChange}
      disabled={disabled}
      className={`w-10 h-6 relative transition-colors duration-150 rounded-full ${
        value ? 'bg-[#ff4520]' : 'bg-[#2a2a2a]'
      } ${disabled ? 'opacity-40' : ''}`}
    >
      <div
        className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow transition-transform duration-150 ${
          value ? 'translate-x-[18px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

export default memo(Toggle)
