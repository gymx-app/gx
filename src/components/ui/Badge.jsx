import { memo } from 'react'

const VARIANTS = {
  default: 'border border-[#2a2a2a] text-[#666666]',
  elevated: 'bg-[#1c1c1c] border border-[#2a2a2a] text-[#666666]',
  accent: 'border border-[#2a2a2a] text-[#666666]',
  push: 'bg-[rgba(255,69,32,0.15)] text-[#ff4520]',
  pull: 'bg-[rgba(59,130,246,0.15)] text-[#60a5fa]',
  legs: 'bg-[rgba(34,197,94,0.15)] text-[#22c55e]',
  liss: 'bg-[rgba(255,140,0,0.15)] text-[#ff8c00]',
  success: 'bg-[rgba(34,197,94,0.15)] border border-[rgba(34,197,94,0.25)] text-[#22c55e]',
  warning: 'bg-[rgba(245,158,11,0.15)] border border-[rgba(245,158,11,0.25)] text-[#f59e0b]',
}

const TAG_MAP = {
  PUSH: 'push',
  PULL: 'pull',
  LEGS: 'legs',
  LISS: 'liss',
}

function Badge({ label, variant = 'default', icon }) {
  const resolvedVariant = TAG_MAP[label?.toUpperCase()] || variant
  const cls = VARIANTS[resolvedVariant] || VARIANTS.default
  return (
    <span className={`${cls} px-[7px] py-[2px] text-[10px] tracking-[0.3px] uppercase font-bold rounded-[4px] flex items-center gap-1`}>
      {icon}
      {label}
    </span>
  )
}

export default memo(Badge)
