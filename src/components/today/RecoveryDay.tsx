import { useState, useEffect, memo } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { upsertChecklistLog } from '../../services/checklistService'
import { supabase } from '../../lib/supabase'
import { Text, Button } from '../ui'
import { colors } from '../../styles/tokens'
import useOptimisticUpdate from '../../hooks/useOptimisticUpdate'
import * as idbCache from '../../services/idbCache'
import type { ConditioningItem } from './ConditioningDay'

const ACTIVITY_INSTRUCTIONS: Record<string, (durationMin: number) => string> = {
  walking: (d) => `Go for a ${d} min easy walk`,
  swimming: (d) => `${d} min easy swim`,
  elliptical: (d) => `${d} min easy elliptical`,
}

interface RecoveryDayProps {
  dayData?: { title?: string | null } | null
  conditioningItems: ConditioningItem[]
  date: string
  userId: string
  isFuture?: boolean
}

const RecoveryDay = memo(function RecoveryDay({
  conditioningItems,
  date,
  userId,
  isFuture = false,
}: RecoveryDayProps) {
  useAuth()
  const { execute } = useOptimisticUpdate()

  const item = conditioningItems?.[0] ?? null
  const itemKey = item?.conditioning_id ?? item?.activity_id ?? 'recovery'

  const [isLogged, setIsLogged] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function checkExisting() {
      const { data } = await supabase
        .from('checklist_logs')
        .select('completed')
        .eq('user_id', userId)
        .eq('date', date)
        .eq('item_type', 'recovery')
        .eq('item_key', itemKey)
        .maybeSingle()

      if (!cancelled && data?.completed) setIsLogged(true)
    }
    void checkExisting()
    return () => {
      cancelled = true
    }
  }, [userId, date, itemKey])

  if (!item) return null

  const instruction = ACTIVITY_INSTRUCTIONS[item.activity_id]
    ? ACTIVITY_INSTRUCTIONS[item.activity_id]!(item.duration_min)
    : `${item.activity_name} · ${item.duration_min} min · easy pace`

  function handleComplete() {
    if (!item) return
    setSubmitError(null)

    void execute({
      optimisticUpdate: () => {
        setIsLogged(true)
        if (navigator.vibrate) navigator.vibrate(50)
      },
      idbWrite: async () => {
        await idbCache.invalidate('workout-data', `${userId}_${date}`)
      },
      supabaseWrite: async () => {
        const { error } = await upsertChecklistLog(userId, {
          date,
          item_type: 'recovery',
          item_key: itemKey,
          completed: true,
          notes: `${item.activity_name} · ${item.duration_min} min`,
        })
        if (error) throw new Error(error)
      },
      rollback: () => {
        setIsLogged(false)
        setSubmitError('Failed to save — tap to retry')
      },
      syncKey: `recovery_${date}_${itemKey}`,
    })
  }

  return (
    <div className="pt-2.5">
      <Text variant="pageTitle" className="!text-[26px]">
        RECOVERY DAY
      </Text>
      <Text variant="bodyMuted" className="mt-0.5">
        {item.activity_name} · {item.duration_min} min
      </Text>
      {item.purpose && <p className="text-[12px] text-muted italic mt-1">{item.purpose}</p>}
      {item.intensity_description && (
        <Text variant="bodyMuted" className="mt-2">
          {item.intensity_description}
        </Text>
      )}

      <div
        className="mt-5 p-5 text-center"
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: '16px',
        }}
      >
        <Text variant="body" className="!text-[16px]">
          {instruction}
        </Text>
        {item.target_rpe != null && (
          <Text variant="caption" className="mt-2">
            Keep effort at RPE {item.target_rpe} or below
          </Text>
        )}
      </div>

      {submitError && (
        <Text variant="caption" className="mt-2 text-error">
          {submitError}
        </Text>
      )}

      {!isFuture && !isLogged && (
        <div className="mt-6">
          <Button variant="primary" label="MARK COMPLETE" onPress={handleComplete} />
        </div>
      )}

      {isLogged && (
        <div className="mt-6 flex flex-col items-center py-6 text-center">
          <CheckCircle2 size={36} color={colors.success} />
          <Text variant="cardTitle" className="mt-2 text-success">
            RECOVERY COMPLETE
          </Text>
        </div>
      )}
    </div>
  )
})

export default RecoveryDay
