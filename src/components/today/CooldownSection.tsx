import { memo, useMemo } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { upsertChecklistLog } from '../../services/checklistService'
import { SectionLabel, Checkbox } from '../ui'
import { radius } from '../../styles/tokens'

interface ChecklistLog {
  item_key: string
  completed: boolean
}

interface CooldownSectionProps {
  items: string[]
  dateStr: string
  checklistLogs: ChecklistLog[]
  onUpdate: () => void
}

function CooldownSection({ items, dateStr, checklistLogs, onUpdate }: CooldownSectionProps) {
  const { user } = useAuth()
  const completedKeys = useMemo(
    () => new Set(checklistLogs.filter(l => l.completed).map(l => l.item_key)),
    [checklistLogs]
  )

  async function toggle(key: string) {
    const done = completedKeys.has(key)
    await upsertChecklistLog(user.id, {
      date: dateStr,
      item_type: 'cooldown',
      item_key: key,
      completed: !done,
    })
    onUpdate()
  }

  if (!items || items.length === 0) return null

  return (
    <div className="mt-6 mb-4">
      <SectionLabel label="Cooldown" className="mb-2" />
      <div className="overflow-hidden" style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.18)', borderRadius: radius.button }}>
        {items.map((item, idx) => {
          const key = `cd-${idx}`
          const done = completedKeys.has(key)
          return (
            <button
              key={key}
              className={`w-full flex items-center gap-3 px-[14px] py-3 text-left transition-colors duration-150 ${
                idx > 0 ? 'border-t border-[rgba(6,182,212,0.08)]' : ''
              }`}
              onClick={() => toggle(key)}
              aria-label={`${item} — ${done ? 'completed' : 'not completed'}`}
            >
              <Checkbox checked={done} />
              <span className={`text-[13px] ${done ? 'text-[#666666] line-through opacity-40' : ''}`} style={done ? {} : { color: '#aaaaaa' }}>
                {item}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default memo(CooldownSection)
