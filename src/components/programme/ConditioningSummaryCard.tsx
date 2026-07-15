import { memo } from 'react'
import { colors, radius } from '../../styles/tokens'
import { mapConditioningTypeLabel } from '../../utils/odinMappers'
import type { ConditioningItem } from '../today/ConditioningDay'

interface ConditioningSummaryCardProps {
  item: ConditioningItem
}

function ConditioningSummaryCard({ item }: ConditioningSummaryCardProps) {
  return (
    <div className="px-4 py-3" style={{ background: colors.surface2 }}>
      <p className="text-[13px] font-['DM_Sans'] font-medium" style={{ color: colors.text }}>
        {item.activity_name}
      </p>
      <p className="text-[11px] font-['DM_Sans'] mt-0.5" style={{ color: colors.muted }}>
        {mapConditioningTypeLabel(item.conditioning_type)}
      </p>
      <div className="flex gap-4 mt-2">
        <span className="text-[11px] font-['DM_Sans']" style={{ color: colors.textSecondary }}>
          {item.duration_min} min
        </span>
        {item.target_rpe != null && (
          <span className="text-[11px] font-['DM_Sans']" style={{ color: colors.textSecondary }}>
            RPE {item.target_rpe}
          </span>
        )}
        {item.heart_rate_zone != null && (
          <span
            className="text-[11px] font-['DM_Sans'] px-1.5"
            style={{ background: colors.surface3, color: colors.muted, borderRadius: radius.chip }}
          >
            Zone {item.heart_rate_zone}
          </span>
        )}
      </div>
    </div>
  )
}

export default memo(ConditioningSummaryCard)
