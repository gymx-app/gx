import { memo } from 'react'

const COLOR_MAP = {
  accent: 'bg-[#ff4520]',
  success: 'bg-[#22c55e]',
}

/**
 * Thin progress bar.
 * @param {{ progress: number, animated?: boolean, color?: 'accent'|'success', height?: number }} props
 */
function ProgressBar({ progress, animated = false, color = 'accent', height = 2 }) {
  const fill = COLOR_MAP[color] || COLOR_MAP.accent
  return (
    <div className="bg-[#1a1a1a] w-full relative overflow-hidden" style={{ height }}>
      <div
        className={`absolute inset-y-0 left-0 ${fill} ${animated ? 'transition-all duration-500' : 'transition-all duration-300'}`}
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  )
}

export default memo(ProgressBar)
