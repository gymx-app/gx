import { memo } from 'react'

function SectionLabel({ label, rightContent, className = '' }) {
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
    <span className={`text-[10px] font-bold tracking-[2px] uppercase text-[#666666] block ${className}`}>
      {label}
    </span>
  )
}

export default memo(SectionLabel)
