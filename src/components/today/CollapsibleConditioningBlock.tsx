import { useState, memo } from 'react'
import { ChevronDown } from 'lucide-react'
import { SectionLabel } from '../ui'
import { colors, radius } from '../../styles/tokens'
import ConditioningDay, { type ConditioningItem } from './ConditioningDay'

interface CollapsibleConditioningBlockProps {
  conditioningItems: ConditioningItem[]
  date: string
  userId: string
  isFuture?: boolean
}

const CollapsibleConditioningBlock = memo(function CollapsibleConditioningBlock({
  conditioningItems,
  date,
  userId,
  isFuture = false,
}: CollapsibleConditioningBlockProps) {
  const [expanded, setExpanded] = useState(false)
  const item = conditioningItems?.[0] ?? null
  if (!item) return null

  return (
    <div className="mt-6">
      <SectionLabel label="Conditioning" className="mb-2" />
      <div
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.card,
        }}
      >
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left"
          aria-expanded={expanded}
        >
          <span className="text-[12px] font-bold tracking-[0.06em] uppercase text-[#f0ede8]">
            Conditioning Finisher · {item.activity_name} · {item.duration_min} min
          </span>
          <ChevronDown
            size={18}
            color={colors.muted}
            style={{
              transform: expanded ? 'rotate(180deg)' : 'none',
              transition: 'transform 150ms',
            }}
          />
        </button>
        {expanded && (
          <div className="px-4 pb-4 border-t" style={{ borderColor: colors.border }}>
            <div className="pt-4">
              <ConditioningDay
                conditioningItems={conditioningItems}
                date={date}
                userId={userId}
                isFuture={isFuture}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

export default CollapsibleConditioningBlock
