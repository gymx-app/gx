import { memo } from 'react'

interface StatBlockProps {
  value: string | number
  label: string
  unit?: string
}

function StatBlock({ value, label, unit }: StatBlockProps) {
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
