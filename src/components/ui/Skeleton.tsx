import { memo } from 'react'

interface SkeletonProps {
  width?: string | number
  height?: string | number
  className?: string
}

function Skeleton({ width, height, className = '' }: SkeletonProps) {
  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      className={`bg-[#1c1c1c] rounded-[8px] animate-pulse ${className}`}
      style={style}
      aria-hidden="true"
    />
  )
}

export default memo(Skeleton)
