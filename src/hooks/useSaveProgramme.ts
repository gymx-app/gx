import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { hydrateProgramme } from '../services/programmeHydrator'

interface SaveParams {
  odinResult: Record<string, unknown>
  userId: string
  goal: string
  equipment: string
  startDate: string
}

interface UseSaveProgrammeReturn {
  save: (params: SaveParams) => Promise<{ success: boolean }>
  saving: boolean
  error: string | null
}

const VALID_GOALS = [
  'fat_loss',
  'muscle_gain',
  'body_recomposition',
  'strength',
  'endurance',
  'maintenance',
  'general_fitness',
]
const VALID_EQUIP = ['full_gym', 'home_gym', 'minimal', 'bodyweight_only', 'dumbbells_only']

export function useSaveProgramme(): UseSaveProgrammeReturn {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = useCallback(async (params: SaveParams): Promise<{ success: boolean }> => {
    const { odinResult, userId, goal, equipment, startDate } = params
    setSaving(true)
    setError(null)

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = odinResult as any
      // V2: data.programme.phases — programme metadata lives in data.programme.programme
      const programmeMeta = data?.programme?.programme ?? data?.programme ?? {}
      const phases = data?.programme?.phases ?? []

      const goalType = VALID_GOALS.includes(goal) ? goal : 'general_fitness'
      const equipType = VALID_EQUIP.includes(equipment) ? equipment : 'full_gym'

      // 1. Deactivate existing active programmes
      await supabase
        .from('programmes')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('is_active', true)

      // 2. Insert new programme row
      const totalWeeks = phases.reduce(
        (sum: number, p: { weeks_count?: number }) => sum + (p.weeks_count ?? 0),
        0
      )

      const { data: inserted, error: insertError } = await supabase
        .from('programmes')
        .insert({
          user_id: userId,
          name: programmeMeta?.name ?? 'My Programme',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          goal_type: goalType as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          equipment: equipType as any,
          created_by_ai: true,
          ai_model: data?.planner_version ?? 'ai_agent_v1',
          ai_prompt: JSON.stringify(odinResult),
          programme_data: data,
          is_active: true,
          available_days: null,
          target_weeks: totalWeeks ?? null,
          started_at: startDate,
        })
        .select('id')
        .single()

      if (insertError || !inserted) {
        setError(insertError?.message ?? 'Failed to create programme')
        setSaving(false)
        return { success: false }
      }

      // 3. Hydrate child tables (phases → days → exercises)
      // Pass the full odinResult so hydrator can navigate odinResult.programme.phases
      const hydrateResult = await hydrateProgramme(inserted.id, data, userId)
      if (!hydrateResult.success) {
        setError(hydrateResult.error ?? 'Failed to populate programme structure')
        setSaving(false)
        return { success: false }
      }

      // 4. Upsert programme_config with correct start_date + phase_weeks
      const phaseWeeks = phases.map((p: { weeks_count?: number }) => p.weeks_count ?? 4)
      if (phaseWeeks.length === 0) phaseWeeks.push(4)

      const { error: configErr } = await supabase
        .from('programme_config')
        .upsert(
          { user_id: userId, start_date: startDate, phase_weeks: phaseWeeks },
          { onConflict: 'user_id' }
        )

      if (configErr) {
        setError(`Config update failed: ${configErr.message}`)
        setSaving(false)
        return { success: false }
      }

      // 5. Bust IDB caches so Today loads fresh data on next visit
      try {
        const idbCache = await import('../services/idbCache')
        void idbCache.invalidate('programme-context', userId)
        void idbCache.invalidate('programme-config', userId)
      } catch {
        // non-fatal — stale cache will expire naturally
      }

      setSaving(false)
      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save programme'
      setError(msg)
      setSaving(false)
      return { success: false }
    }
  }, [])

  return { save, saving, error }
}
