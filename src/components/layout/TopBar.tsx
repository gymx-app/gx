import { memo, type ReactNode } from 'react'

interface TopBarProps {
  title?: string
  rightContent?: ReactNode
}

function TopBar({ title, rightContent }: TopBarProps) {
  return (
    <div className="bg-surface border-b border-border flex-shrink-0" style={{ zIndex: 10 }}>
      <div className="h-[52px] px-4 flex items-center justify-between">
        <span className="font-['Bebas_Neue'] text-[20px] tracking-[2px] text-text">
          G<span className="text-accent">x</span>
        </span>
        {title && (
          <span
            className="text-[10px] font-bold tracking-[2px] uppercase text-muted truncate"
            style={{ maxWidth: 'calc(100% - 120px)' }}
          >
            {title}
          </span>
        )}
        {rightContent ?? <div className="w-10" />}
      </div>
    </div>
  )
}

export default memo(TopBar)
