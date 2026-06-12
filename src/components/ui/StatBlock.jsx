import { memo } from 'react'

/**
 * Stat display — value + unit + label.
 * @param {{ value: string|number, label: string, unit?: string }} props
 */
function StatBlock({ value, label, unit }) {
  return (
    <div className="text-center">
      <p className="font-['Bebas_Neue'] text-[26px] text-[#f0ede8] leading-none">
        {value}
        {unit && <span className="text-[16px] text-[#666666] ml-1">{unit}</span>}
      </p>
      <p className="text-[11px] text-[#666666] mt-[2px]">{label}</p>
    </div>
  )
}

export default memo(StatBlock)
