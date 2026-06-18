import { memo, type ReactNode } from 'react'

interface SectionLabelProps {
  label: string
  rightContent?: ReactNode
  className?: string
}

function SectionLabel({ label, rightContent, className = '' }: SectionLabelProps) {
  if (rightContent) {
    return (
      <div className={`flex justify-between items-center ${className}`}>
        <span className="text-[10px] font-bold tracking-[2px] uppercase text-[#666666]">
          {label}
        </span>
        {rightContent}
      </div>
    )
  }

  return (
    <span
      className={`text-[10px] font-bold tracking-[2px] uppercase text-[#666666] block ${className}`}
    >
      {label}
    </span>
  )
}

export default memo(SectionLabel)
