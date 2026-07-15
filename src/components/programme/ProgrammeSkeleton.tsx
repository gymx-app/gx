import { memo } from 'react'
import { Skeleton } from '../ui'
import { colors, radius } from '../../styles/tokens'

const ProgrammeSkeleton = memo(function ProgrammeSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto pb-8 px-4 pt-4 space-y-4">
      {/* Profile card */}
      <div
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 16,
        }}
      >
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <Skeleton width={56} height={36} />
          <Skeleton width={120} height={14} className="flex-1" />
          <Skeleton width={64} height={24} />
        </div>
        <div className="grid grid-cols-3" style={{ borderTop: `1px solid ${colors.border}` }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center py-3 px-2"
              style={{ borderRight: i < 2 ? `1px solid ${colors.border}` : 'none' }}
            >
              <Skeleton width={48} height={8} className="mb-2" />
              <Skeleton width={36} height={16} />
            </div>
          ))}
        </div>
        <div className="px-4 py-3" style={{ borderTop: `1px solid ${colors.border}` }}>
          <Skeleton width={140} height={14} />
        </div>
        <div className="px-4 py-3" style={{ borderTop: `1px solid ${colors.border}` }}>
          <Skeleton width={180} height={14} />
        </div>
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderTop: `1px solid ${colors.border}` }}
        >
          <Skeleton width={100} height={20} />
          <Skeleton width={40} height={14} />
        </div>
      </div>

      {/* Programme title row */}
      <div className="flex items-center justify-between">
        <Skeleton width={180} height={22} />
        <Skeleton width={17} height={17} />
      </div>

      {/* Phase accordion rows */}
      <div className="space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-4"
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.card,
            }}
          >
            <Skeleton width={36} height={36} />
            <div className="flex-1 space-y-1.5">
              <Skeleton width={120} height={14} />
              <Skeleton width={180} height={11} />
            </div>
            <Skeleton width={32} height={18} />
          </div>
        ))}
      </div>
    </div>
  )
})

export default ProgrammeSkeleton
