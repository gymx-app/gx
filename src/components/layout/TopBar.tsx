import { memo, type ReactNode } from 'react'

interface TopBarProps {
  title?: string
  rightContent?: ReactNode
}

function TopBar({ title, rightContent }: TopBarProps) {
  return (
    <div className="bg-[#141414] border-b border-[#2a2a2a] flex-shrink-0" style={{ zIndex: 10 }}>
      <div className="h-[52px] px-4 flex items-center justify-between">
        <span className="font-['Bebas_Neue'] text-[20px] tracking-[2px] text-[#f0ede8]">
          G<span className="text-[#ff4520]">x</span>
        </span>
        {title && (
          <span className="text-[10px] font-bold tracking-[2px] uppercase text-[#666666]">{title}</span>
        )}
        {rightContent || <div className="w-10" />}
      </div>
    </div>
  )
}

export default memo(TopBar)
