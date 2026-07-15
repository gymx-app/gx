import { ChevronRight } from 'lucide-react'
import type { ScanEntry } from './scanData'
import { Text } from '../ui'
import { colors } from '../../styles/tokens'

export default function ScanHistoryRow({
  scan,
  isLast,
  isActive,
  onPress,
}: {
  scan: ScanEntry
  isLast: boolean
  isActive?: boolean
  onPress: () => void
}) {
  const { date, bodyFat, weight, muscleMass, delta, isBaseline } = scan
  return (
    <button
      onClick={onPress}
      className="w-full flex items-center justify-between py-[10px] text-left"
      style={isLast ? undefined : { borderBottom: `1px solid ${colors.borderSubtle}` }}
    >
      <div>
        <p
          className="text-[15px] font-bold leading-relaxed"
          style={{ color: isActive ? colors.accent : colors.text }}
        >
          {date}
        </p>
        <Text variant="caption" className="mt-0.5">
          {bodyFat} · {weight} · {muscleMass}
        </Text>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="text-[14px] font-bold"
          style={{ color: isBaseline ? colors.muted : colors.success }}
        >
          {delta}
        </span>
        {!isActive && <ChevronRight size={16} strokeWidth={2} color={colors.muted} />}
      </div>
    </button>
  )
}
