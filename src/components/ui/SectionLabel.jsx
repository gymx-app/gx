import { memo } from 'react'

/**
 * Consistent section label used across all screens.
 * @param {{ label: string, rightContent?: React.ReactNode, className?: string }} props
 */
function SectionLabel({ label, rightContent, className = '' }) {
  if (rightContent) {
    return (
      <div className={`flex justify-between items-center ${className}`}>
        <span className="text-[11px] tracking-[0.08em] uppercase text-[#555555] font-medium">
          {label}
        </span>
        {rightContent}
      </div>
    )
  }

  return (
    <span className={`text-[11px] tracking-[0.08em] uppercase text-[#555555] font-medium block ${className}`}>
      {label}
    </span>
  )
}

export default memo(SectionLabel)
