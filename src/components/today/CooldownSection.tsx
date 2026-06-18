import { memo, useMemo, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { upsertChecklistLog } from '../../services/checklistService'
import { SectionLabel, Checkbox } from '../ui'
import { radius } from '../../styles/tokens'
import useOptimisticUpdate from '../../hooks/useOptimisticUpdate'
import * as idbCache from '../../services/idbCache'

interface ChecklistLog {
  item_key: string
  completed: boolean
}

interface CooldownSectionProps {
  items: string[]
  dateStr: string
  checklistLogs: ChecklistLog[]
  onUpdate: () => void
  readOnly?: boolean
}

function CooldownSection({
  items,
  dateStr,
  checklistLogs,
  onUpdate,
  readOnly = false,
}: CooldownSectionProps) {
  const { user } = useAuth()
  const { execute } = useOptimisticUpdate()
  const [localOverrides, setLocalOverrides] = useState<Record<string, boolean>>({})

  const completedKeys = useMemo(() => {
    const set = new Set(checklistLogs.filter((l) => l.completed).map((l) => l.item_key))
    for (const [k, v] of Object.entries(localOverrides)) {
      if (v) set.add(k)
      else set.delete(k)
    }
    return set
  }, [checklistLogs, localOverrides])

  function toggle(key: string) {
    const done = completedKeys.has(key)
    const newValue = !done

    void execute({
      optimisticUpdate: () => {
        setLocalOverrides((prev) => ({ ...prev, [key]: newValue }))
        if (navigator.vibrate) navigator.vibrate(30)
      },
      idbWrite: async () => {
        await idbCache.invalidate('workout-data', `${user!.id}_${dateStr}`)
      },
      supabaseWrite: async () => {
        const { error } = await upsertChecklistLog(user!.id, {
          date: dateStr,
          item_type: 'cooldown',
          item_key: key,
          completed: newValue,
        })
        if (error) throw new Error(error)
        onUpdate()
      },
      rollback: () => {
        setLocalOverrides((prev) => ({ ...prev, [key]: done }))
      },
      syncKey: `cooldown_${dateStr}_${key}`,
    })
  }

  if (!items || items.length === 0) return null

  return (
    <div className="mt-6 mb-4">
      <SectionLabel label="Cooldown" className="mb-2" />
      <div
        className="overflow-hidden"
        style={{
          background: 'rgba(6,182,212,0.05)',
          border: '1px solid rgba(6,182,212,0.18)',
          borderRadius: radius.button,
        }}
      >
        {items.map((item, idx) => {
          const key = `cd-${idx}`
          const done = completedKeys.has(key)
          return (
            <button
              key={key}
              className={`w-full flex items-center gap-3 px-[14px] py-3 text-left transition-colors duration-150 ${
                idx > 0 ? 'border-t border-[rgba(6,182,212,0.08)]' : ''
              }`}
              onClick={() => !readOnly && toggle(key)}
              aria-label={`${item} — ${done ? 'completed' : 'not completed'}`}
            >
              <Checkbox checked={done} />
              <span
                className={`text-[13px] ${done ? 'text-[#666666] line-through opacity-40' : ''}`}
                style={done ? {} : { color: '#aaaaaa' }}
              >
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
