import { memo } from 'react'

/**
 * Stat display — value + unit + label.
 * @param {{ value: string|number, label: string, unit?: string }} props
 */
function StatBlock({ value, label, unit }) {
  return (
    <div className="text-center">
      <p className="text-[24px] font-black text-[#ff4520]">
        {value}
        {unit && <span className="text-[16px] text-[#555555] ml-1">{unit}</span>}
      </p>
      <p className="text-[10px] tracking-wider uppercase text-[#555555] mt-0.5">{label}</p>
    </div>
  )
}

export default memo(StatBlock)
