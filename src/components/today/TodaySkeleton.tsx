import { memo } from 'react'
import { Skeleton } from '../ui'

const TodaySkeleton = memo(function TodaySkeleton() {
  return (
    <>
      <div className="bg-[#141414] border-b border-[#2a2a2a] flex-shrink-0 safe-area-top">
        <div className="h-[52px] px-4 flex items-center justify-between">
          <Skeleton width={32} height={24} />
          <Skeleton width={160} height={12} />
          <Skeleton width={20} height={12} />
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div
          className="mx-4 mt-3"
          style={{
            background: '#141414',
            border: '1px solid #2a2a2a',
            borderRadius: '14px',
            padding: '14px',
          }}
        >
          <div className="flex items-baseline justify-between">
            <Skeleton width={128} height={20} />
            <Skeleton width={80} height={14} />
          </div>
          <Skeleton width="100%" height={4} className="mt-3" />
          <div className="flex gap-[6px] mt-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="flex-1 h-[32px] rounded-[8px]"
                style={{ background: '#1c1c1c', border: '1px solid #2a2a2a' }}
              />
            ))}
          </div>
        </div>

        <div
          className="px-4 py-3"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}
        >
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="rounded-[12px]"
              style={{ minHeight: 72, background: '#141414', border: '1.5px solid #2a2a2a' }}
            />
          ))}
        </div>

        <div className="px-4 pt-4">
          <Skeleton width={160} height={10} />
          <Skeleton width={224} height={32} className="mt-2" />
          <Skeleton width={176} height={14} className="mt-2" />
          <div className="flex items-center gap-2 mt-3">
            <Skeleton width={60} height={20} />
            <Skeleton width={60} height={20} />
          </div>
        </div>

        <div className="px-4 mt-4 flex flex-col gap-3">
          {[160, 128, 144].map((titleW, i) => (
            <div
              key={i}
              style={{
                background: '#141414',
                border: '1px solid #2a2a2a',
                borderRadius: '16px',
                padding: '11px 16px',
              }}
            >
              <div className="flex items-center gap-[10px]">
                <Skeleton width={34} height={34} />
                <div className="flex-1">
                  <Skeleton width={titleW} height={14} />
                  <Skeleton width={100} height={12} className="mt-1.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
})

export const DayContentSkeleton = memo(function DayContentSkeleton() {
  return (
    <div className="pt-2.5">
      <Skeleton width={180} height={10} />
      <Skeleton width={220} height={32} className="mt-3" />
      <Skeleton width={160} height={13} className="mt-2" />
      <div className="flex gap-2 mt-3">
        <Skeleton width={52} height={20} />
        <Skeleton width={44} height={20} />
      </div>
      <Skeleton width={72} height={10} className="mt-5" />
      <div className="flex flex-col gap-3 mt-3">
        {[160, 128, 144].map((w, i) => (
          <div
            key={i}
            style={{
              background: '#141414',
              border: '1px solid #2a2a2a',
              borderRadius: '16px',
              padding: '11px 16px',
            }}
          >
            <div className="flex items-center gap-[10px]">
              <Skeleton width={34} height={34} />
              <div className="flex-1">
                <Skeleton width={w} height={14} />
                <Skeleton width={100} height={11} className="mt-1.5" />
              </div>
              <Skeleton width={16} height={16} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})

export default TodaySkeleton
