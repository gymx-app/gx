import { memo } from 'react'
import { Skeleton } from '../ui'

/**
 * Skeleton that mirrors the Today screen structure.
 * Shown only on first load when no cached data exists.
 */
const TodaySkeleton = memo(function TodaySkeleton() {
  return (
    <>
      {/* TopBar skeleton */}
      <div className="bg-[#080808] border-b border-[#111111] flex-shrink-0 safe-area-top">
        <div className="h-14 px-4 flex items-center justify-between">
          <Skeleton width={32} height={24} />
          <Skeleton width={160} height={12} />
          <Skeleton width={44} height={12} />
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {/* Phase card skeleton */}
        <div className="mx-4 mt-3 bg-[#111111] border border-[#1a1a1a] p-4">
          <div className="flex items-baseline justify-between">
            <Skeleton width={128} height={24} />
            <Skeleton width={80} height={14} />
          </div>
          <Skeleton width="100%" height={2} className="mt-3" />
          {/* Week nav row */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1a1a1a]">
            <Skeleton width={32} height={32} />
            <Skeleton width={64} height={14} />
            <Skeleton width={32} height={32} />
          </div>
          <Skeleton width={96} height={12} className="mt-2" />
        </div>

        {/* Week strip skeleton */}
        <div className="flex items-end justify-between px-4 py-3 border-b border-[#111111]">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <Skeleton width={24} height={10} />
              <Skeleton width={36} height={36} />
              <div className="h-1.5" />
            </div>
          ))}
        </div>

        {/* Workout header skeleton */}
        <div className="px-4 pt-6">
          <Skeleton width={160} height={10} />
          <Skeleton width={224} height={36} className="mt-2" />
          <Skeleton width={176} height={14} className="mt-2" />
          <div className="flex items-center gap-2 mt-3">
            <Skeleton width={80} height={28} />
            <Skeleton width={80} height={28} />
          </div>
        </div>

        {/* Warmup skeleton */}
        <div className="px-4 mt-5">
          <Skeleton width="100%" height={48} />
        </div>

        {/* Exercise card skeletons */}
        <div className="px-4 mt-4 flex flex-col gap-2">
          {[160, 128, 144].map((titleW, i) => (
            <div key={i} className="bg-[#111111] border border-[#1a1a1a] border-l-2 border-l-[#2a2a2a] px-3 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton width={titleW} height={18} />
                  <Skeleton width={100} height={12} className="mt-1.5" />
                </div>
                <Skeleton width={40} height={14} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
})

export default TodaySkeleton
