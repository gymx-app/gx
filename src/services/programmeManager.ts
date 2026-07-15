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
  // warmup_items only keys off programme_id, so it has no dependency on the
  // phase/day lookup below — fire it off now and just await it at the end.
  const warmupDelete = supabase.from('warmup_items').delete().eq('programme_id', programmeId)

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
      // Both key off day_id and don't depend on each other, so they can run
      // concurrently; programme_days must wait for both since it's their
      // FK parent.
      await Promise.all([
        supabase.from('cooldown_items').delete().in('day_id', dayIds),
        supabase.from('programme_exercises').delete().in('day_id', dayIds),
      ])
      await supabase.from('programme_days').delete().in('phase_id', phaseIds)
    }
  }

  await supabase.from('programme_phases').delete().eq('programme_id', programmeId)
  await warmupDelete
}

/**
 * Re-hydrate a programme's structure from its stored Odin JSON. Clears
 * existing child rows first so it is safe to call on a live programme.
 *
 * `resetStartDate` controls whether this also restarts the athlete's
 * progress (start_date back to today, i.e. Week 1) — kept as a caller
 * choice rather than two near-duplicate functions because "restart" is
 * literally "refresh, and also reset progress": Program.tsx's plain
 * Refresh action passes false (fix structure, keep progress); its
 * separate Restart action passes true.
 */
export async function rehydrateProgramme(
  programmeId: string,
  userId: string,
  resetStartDate = false
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
    ...(resetStartDate ? { start_date: new Date().toISOString().slice(0, 10) } : {}),
    phase_weeks: phaseWeeks.length ? phaseWeeks : [4],
  })

  return { success: true }
}

/**
 * Full reset: wipe all user logs, all programmes + structure, and programme_config.
 * Called before entering the generate-new flow.
 */
export async function deleteAllUserData(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Collect all programme IDs for this user
    const { data: progs } = await supabase.from('programmes').select('id').eq('user_id', userId)

    const progIds = (progs ?? []).map((p: AnyData) => p.id as string)

    for (const progId of progIds) {
      await clearProgrammeStructure(progId)
    }

    if (progIds.length > 0) {
      await supabase.from('programmes').delete().in('id', progIds)
    }

    // Delete all log tables
    await Promise.all([
      supabase.from('exercise_logs').delete().eq('user_id', userId),
      supabase.from('workout_sessions').delete().eq('user_id', userId),
      supabase.from('warmup_logs').delete().eq('user_id', userId),
      supabase.from('checklist_logs').delete().eq('user_id', userId),
      supabase.from('programme_config').delete().eq('user_id', userId),
    ])

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Reset failed' }
  }
}
