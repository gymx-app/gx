import { memo } from 'react'

const VARIANTS = {
  default: 'bg-[#1a1a1a] border border-[#2a2a2a] text-[#666666]',
  accent: 'bg-[#ff4520]/10 border border-[#ff4520]/20 text-[#ff4520]',
  success: 'bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e]',
  warning: 'bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-[#f59e0b]',
}

/**
 * Small inline badge / tag.
 * @param {{ label: string, variant?: string, icon?: React.ReactNode }} props
 */
function Badge({ label, variant = 'default', icon }) {
  const cls = VARIANTS[variant] || VARIANTS.default
  return (
    <span className={`${cls} px-3 h-7 text-[10px] tracking-[0.06em] uppercase font-bold flex items-center gap-1`}>
      {icon}
      {label}
    </span>
  )
}

export default memo(Badge)
