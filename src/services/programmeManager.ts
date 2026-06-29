import { supabase } from '../lib/supabase'
import { hydrateProgramme } from './programmeHydrator'
import { getProgrammePhases, upsertProgrammeConfig } from './programmeService'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = any

/**
 * Delete all child rows for a programme (phases → days → exercises / warmup / cooldown).
 * Safe to call before re-hydration.
 */
export async function clearProgrammeStructure(programmeId: string): Promise<void> {
  const { data: phases } = await supabase
    .from('programme_phases')
    .select('id')
    .eq('programme_id', programmeId)

  const phaseIds = (phases ?? []).map((p: AnyData) => p.id as string)

  if (phaseIds.length > 0) {
    const { data: days } = await supabase
      .from('programme_days')
      .select('id')
      .in('phase_id', phaseIds)

    const dayIds = (days ?? []).map((d: AnyData) => d.id as string)

    if (dayIds.length > 0) {
      await supabase.from('cooldown_items').delete().in('day_id', dayIds)
      await supabase.from('programme_exercises').delete().in('day_id', dayIds)
      await supabase.from('programme_days').delete().in('phase_id', phaseIds)
    }
  }

  await supabase.from('warmup_items').delete().eq('programme_id', programmeId)
  await supabase.from('programme_phases').delete().eq('programme_id', programmeId)
}

/**
 * Re-hydrate a programme from its stored Odin JSON, then reset start_date to today.
 * Clears existing child rows first so it is safe to call on a live programme.
 */
export async function rehydrateProgramme(
  programmeId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const { data: row, error: fetchErr } = await supabase
    .from('programmes')
    .select('programme_data')
    .eq('id', programmeId)
    .single()

  if (fetchErr || !row?.programme_data) {
    return { success: false, error: 'Could not load stored programme data' }
  }

  await clearProgrammeStructure(programmeId)

  const hydrateResult = await hydrateProgramme(programmeId, row.programme_data as AnyData, userId)
  if (!hydrateResult.success) return hydrateResult

  const { data: freshPhases } = await getProgrammePhases(programmeId)
  const phaseWeeks = (freshPhases ?? []).map((p: AnyData) => (p.weeks_count as number) ?? 4)
  await upsertProgrammeConfig(userId, {
    start_date: new Date().toISOString().slice(0, 10),
    phase_weeks: phaseWeeks.length ? phaseWeeks : [4],
  })

  return { success: true }
}
