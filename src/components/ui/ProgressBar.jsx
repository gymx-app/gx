import { memo } from 'react'

const COLOR_MAP = {
  accent: 'bg-[#ff4520]',
  success: 'bg-[#22c55e]',
  yellow: 'bg-[#fbbf24]',
}

function ProgressBar({ progress, animated = false, color = 'accent', height = 3 }) {
  const fill = COLOR_MAP[color] || COLOR_MAP.accent
  return (
    <div className="bg-[#2a2a2a] w-full relative overflow-hidden rounded-[3px]" style={{ height }}>
      <div
        className={`absolute inset-y-0 left-0 ${fill} rounded-[3px] ${animated ? 'transition-all duration-500' : 'transition-all duration-300'}`}
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  )
}

export default memo(ProgressBar)
