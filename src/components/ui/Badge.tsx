import { memo, type ReactNode } from 'react'

const BADGE_CLS = 'border border-[#2a2a2a] text-[#555555] bg-transparent'

interface BadgeProps {
  label: string
  icon?: ReactNode
}

function Badge({ label, icon }: BadgeProps) {
  return (
    <span
      className={`${BADGE_CLS} px-[7px] py-[2px] text-[10px] tracking-[0.3px] uppercase font-bold rounded-[4px] flex items-center gap-1`}
    >
      {icon}
      {label}
    </span>
  )
}

export default memo(Badge)
