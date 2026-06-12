import { memo } from 'react'

const VARIANTS = {
  default: 'border border-[#2a2a2a] text-[#666666]',
  elevated: 'bg-[#161616] border border-[#2a2a2a] text-[#888888]',
  accent: 'border border-[#2a2a2a] text-[#666666]',
  success: 'bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e]',
  warning: 'bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-[#f59e0b]',
}

function Badge({ label, variant = 'default', icon }) {
  const cls = VARIANTS[variant] || VARIANTS.default
  return (
    <span className={`${cls} px-2 h-[22px] text-[10px] tracking-[0.08em] uppercase font-semibold flex items-center gap-1`}>
      {icon}
      {label}
    </span>
  )
}

export default memo(Badge)
