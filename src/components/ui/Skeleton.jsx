import { memo } from 'react'

/**
 * Skeleton loading placeholder.
 * @param {{ width?: string|number, height?: string|number, className?: string }} props
 */
function Skeleton({ width, height, className = '' }) {
  const style = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      className={`bg-[#1a1a1a] animate-pulse ${className}`}
      style={style}
      aria-hidden="true"
    />
  )
}

export default memo(Skeleton)
