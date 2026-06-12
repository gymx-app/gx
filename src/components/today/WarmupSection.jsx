import { useState, useMemo, memo } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { upsertWarmupLog } from '../../services/checklistService'
import { logger } from '../../lib/logger'
import exerciseData from '../../data/exercises.json'
import { SectionLabel, ProgressBar, Checkbox } from '../ui'
import { shadows, gradients } from '../../styles/tokens'

const JSON_WARMUP_ITEMS = exerciseData.WARMUP_ITEMS

const WarmupSection = memo(function WarmupSection({ dateStr, phase, warmupLogs, warmupItems: dbWarmupItems, onUpdate }) {
  const { user } = useAuth()

  // Use DB warmup items if available, fall back to exercises.json
  const items = useMemo(() => {
    if (dbWarmupItems && dbWarmupItems.length > 0) {
      // Map DB format → component format
      return dbWarmupItems.map(item => ({
        k: item.item_key,
        label: item.label,
        detail: item.detail || '',
        ic: item.icon || '',
      }))
    }
    return JSON_WARMUP_ITEMS
  }, [dbWarmupItems])

  const completedKeys = new Set(warmupLogs.filter(l => l.completed).map(l => l.item_key))
  const completedCount = completedKeys.size
  const allDone = completedCount === items.length
  const [collapsed, setCollapsed] = useState(allDone)

  async function toggleItem(item) {
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
    <div className="mt-5">
      <SectionLabel
        label="Warmup Protocol"
        rightContent={
          <div className="flex items-center gap-2">
            {allDone ? (
              <span className="text-[11px] font-semibold text-[#22c55e]">Done</span>
            ) : (
              <span className="text-[11px] text-[#444444]">
                {completedCount}/{items.length}
              </span>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? 'Expand warmup' : 'Collapse warmup'}
            >
              <span className={`text-[10px] text-[#333333] transition-transform duration-200 inline-block ${
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
        animated
        className="mb-3"
      />

      {!collapsed && (
        <div className="border border-[#1a1a1a]" style={{ background: gradients.card, boxShadow: shadows.card }}>
          {items.map((item, idx) => {
            const done = completedKeys.has(item.k)
            return (
              <button
                key={item.k}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left active:bg-[#1c1c1c] transition-colors duration-100 ${
                  idx > 0 ? 'border-t border-[#111111]' : ''
                }`}
                onClick={() => toggleItem(item)}
                aria-label={`${item.label} — ${done ? 'completed' : 'not completed'}`}
              >
                <Checkbox checked={done} />
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-medium leading-tight ${done ? 'text-[#444444]' : 'text-white'}`}>
                    {item.label}
                  </p>
                  <p className="text-[11px] text-[#333333] mt-0.5">{item.detail}</p>
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
