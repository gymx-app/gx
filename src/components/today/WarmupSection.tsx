import { useState, useMemo, memo } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { upsertWarmupLog } from '../../services/checklistService'
import { logger } from '../../lib/logger'
import { SectionLabel, ProgressBar, Checkbox } from '../ui'
import { radius } from '../../styles/tokens'

interface WarmupItem {
  k: string
  label: string
  detail?: string
  ic?: string
}

interface WarmupLog {
  item_key: string
  completed: boolean
}

interface DbWarmupItem {
  item_key: string
  label: string
  detail?: string
  icon?: string
}

interface WarmupSectionProps {
  dateStr: string
  phase: string
  warmupLogs: WarmupLog[]
  warmupItems: DbWarmupItem[]
  onUpdate: () => void
}

const WarmupSection = memo(function WarmupSection({ dateStr, phase, warmupLogs, warmupItems: dbWarmupItems, onUpdate }: WarmupSectionProps) {
  const { user } = useAuth()

  const items: WarmupItem[] = useMemo(() => {
    if (!dbWarmupItems || dbWarmupItems.length === 0) return []
    return dbWarmupItems.map(item => ({
      k: item.item_key,
      label: item.label,
      detail: item.detail || '',
      ic: item.icon || '',
    }))
  }, [dbWarmupItems])

  const completedKeys = new Set(warmupLogs.filter(l => l.completed).map(l => l.item_key))
  const completedCount = completedKeys.size
  const allDone = completedCount === items.length
  const [collapsed, setCollapsed] = useState(allDone)

  async function toggleItem(item: WarmupItem) {
    const isCompleted = completedKeys.has(item.k)
    const { error } = await upsertWarmupLog(user.id, {
      date: dateStr,
      phase,
      item_key: item.k,
      item_label: item.label,
      completed: !isCompleted,
    })
    if (error) logger.error('toggleWarmup:', error)
    onUpdate()
  }

  return (
    <div className="mt-3">
      <SectionLabel
        label="Warmup Protocol"
        rightContent={
          <div className="flex items-center gap-2">
            {allDone ? (
              <span className="text-[11px] font-semibold text-[#22c55e]">Done</span>
            ) : (
              <span className="text-[11px] text-[#666666]">
                {completedCount}/{items.length}
              </span>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? 'Expand warmup' : 'Collapse warmup'}
            >
              <span className={`text-[10px] text-[#666666] transition-transform duration-200 inline-block ${
                collapsed ? '' : 'rotate-180'
              }`}>
                ▾
              </span>
            </button>
          </div>
        }
        className="mb-2"
      />

      <ProgressBar
        progress={(completedCount / items.length) * 100}
        color="yellow"
        animated
      />

      {!collapsed && (
        <div
          className="overflow-hidden mt-3"
          style={{
            background: 'rgba(251,191,36,0.05)',
            border: '1px solid rgba(251,191,36,0.18)',
            borderRadius: radius.button,
          }}
        >
          {items.map((item, idx) => {
            const done = completedKeys.has(item.k)
            return (
              <button
                key={item.k}
                className={`w-full flex items-center gap-[8px] px-[14px] py-[3px] text-left cursor-pointer transition-colors duration-150 ${
                  idx > 0 ? 'border-t border-[rgba(251,191,36,0.08)]' : ''
                }`}
                onClick={() => toggleItem(item)}
                aria-label={`${item.label} — ${done ? 'completed' : 'not completed'}`}
              >
                <Checkbox checked={done} />
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] leading-tight ${done ? 'text-[#666666] line-through opacity-40' : 'text-[#aaa]'}`}>
                    {item.label}
                  </p>
                  {item.detail && (
                    <p className="text-[11px] text-[#666666] mt-0.5">{item.detail}</p>
                  )}
                </div>
                <span className="text-[16px] shrink-0">{item.ic}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
})

export default WarmupSection
