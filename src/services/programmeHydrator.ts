import { supabase } from '../lib/supabase'
import { resolveExercises } from './exerciseResolver'
import {
  mapDayLabel,
  mapSessionType,
  mapWorkoutTypeForDb,
  mapConditioningTypeLabel,
  buildTitle,
  buildSubtitle,
  formatRest,
} from '../utils/odinMappers'

const CONDITIONING_ONLY_DAY_TYPES = new Set(['conditioning', 'sport', 'recovery'])

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OdinData = any

interface HydrateResult {
  success: boolean
  error?: string
}

function formatItemDetail(
  purpose: string | undefined,
  durationSeconds: number | undefined,
  repetitions: number | undefined
): string {
  const timing = durationSeconds
    ? `${durationSeconds}s`
    : repetitions
      ? `${repetitions} reps`
      : null
  return [purpose, timing].filter(Boolean).join(' · ')
}

function formatSetsRepsV2(sets: OdinData[]): string {
  if (!sets || sets.length === 0) return '3×12'
  const first = sets[0]
  return `${sets.length}×${first?.target_reps ?? 12}`
}

function getRestV2(sets: OdinData[]): string {
  if (!sets || sets.length === 0) return '60s'
  return formatRest(sets[0]?.rest_seconds ?? null)
}

export async function hydrateProgramme(
  programmeId: string,
  odinData: OdinData,
  userId: string
): Promise<HydrateResult> {
  try {
    // V2 shape: odinData.programme.phases[].weeks[].days[].exercises[]
    const phases: OdinData[] = odinData?.programme?.phases ?? []

    if (phases.length === 0) {
      return { success: true }
    }

    // 1. Collect all exercise names across all phases/weeks/days
    const allNames: string[] = []
    for (const phase of phases) {
      for (const week of phase.weeks ?? []) {
        for (const day of week.days ?? []) {
          for (const ex of day.exercises ?? []) {
            if (ex.exercise_name) allNames.push(ex.exercise_name)
          }
        }
      }
    }

    // 2. Resolve exercise names → UUIDs
    const exerciseMap = await resolveExercises(allNames, userId)

    // 3. Insert phases
    const phaseRows = phases.map((phase: OdinData, idx: number) => ({
      programme_id: programmeId,
      phase_number: idx + 1,
      name: phase.name ?? `Phase ${idx + 1}`,
      goal: phase.objective ?? phase.name ?? `Phase ${idx + 1}`,
      weeks_count: phase.weeks_count ?? phase.weeks?.length ?? 4,
    }))

    const { data: insertedPhases, error: phaseErr } = await supabase
      .from('programme_phases')
      .insert(phaseRows)
      .select('id, phase_number')

    if (phaseErr) return { success: false, error: `Phases: ${phaseErr.message}` }

    const phaseIdMap = new Map<number, string>()
    for (const p of insertedPhases ?? []) {
      phaseIdMap.set(p.phase_number, p.id)
    }

    // 4. For each phase, use week 1 as the template for programme_days
    for (const phase of phases) {
      const phaseIdx = phases.indexOf(phase)
      const phaseId = phaseIdMap.get(phaseIdx + 1)
      if (!phaseId) continue

      const templateWeek = phase.weeks?.[0]
      if (!templateWeek?.days) continue

      const usedDays = new Set<string>()
      const dayRows: OdinData[] = []

      for (let di = 0; di < templateWeek.days.length; di++) {
        const day = templateWeek.days[di]
        let dow = mapDayLabel(day.day_of_week ?? '', di)

        while (usedDays.has(dow)) {
          const idx = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].indexOf(dow)
          dow = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'][(idx + 1) % 7] ?? 'MON'
        }
        usedDays.add(dow)

        const rawDayType = (day.day_type ?? '').toLowerCase()
        const workoutType = mapWorkoutTypeForDb(mapSessionType(day.day_type ?? ''))
        const conditioning: OdinData[] = day.conditioning ?? []
        const primaryConditioning = conditioning[0]
        const isConditioningOnly =
          CONDITIONING_ONLY_DAY_TYPES.has(rawDayType) && !!primaryConditioning

        dayRows.push({
          phase_id: phaseId,
          day_of_week: dow,
          workout_type: workoutType,
          title:
            day.title ??
            (isConditioningOnly ? primaryConditioning.activity_name : null) ??
            buildTitle(day.day_type ?? ''),
          subtitle: isConditioningOnly
            ? mapConditioningTypeLabel(primaryConditioning.conditioning_type)
            : buildSubtitle(
                (day.exercises ?? []).map((e: OdinData) => ({ name: e.exercise_name }))
              ),
          duration_min: isConditioningOnly
            ? (primaryConditioning.duration_min ?? day.estimated_duration_min ?? null)
            : (day.estimated_duration_min ?? null),
          has_warmup: isConditioningOnly ? false : (day.warmup?.length ?? 0) > 0,
          tags: isConditioningOnly ? [primaryConditioning.activity_id] : null,
          _exercises: day.exercises ?? [],
          _cooldown: day.cooldown ?? [],
          _conditioning: conditioning,
        })
      }

      // Insert programme_days (without internal fields)
      const dbDayRows = dayRows.map(
        ({ _exercises: _ex, _cooldown: _cd, _conditioning: _cond, ...rest }) => rest
      )
      const { data: insertedDays, error: dayErr } = await supabase
        .from('programme_days')
        .insert(dbDayRows)
        .select('id, day_of_week')

      if (dayErr) return { success: false, error: `Days: ${dayErr.message}` }

      const dayIdMap = new Map<string, string>()
      for (const d of insertedDays ?? []) {
        dayIdMap.set(d.day_of_week, d.id)
      }

      // 5. Insert programme_exercises + cooldown_items per day
      for (const dayRow of dayRows) {
        const dayId = dayIdMap.get(dayRow.day_of_week)
        if (!dayId) continue

        const exercises: OdinData[] = dayRow._exercises
        if (exercises.length > 0) {
          const exRows = exercises
            .map((ex: OdinData, idx: number) => {
              const exerciseId = exerciseMap.get(ex.exercise_name)
              if (!exerciseId) return null
              return {
                day_id: dayId,
                exercise_id: exerciseId,
                display_order: idx + 1,
                sets_reps: formatSetsRepsV2(ex.sets),
                rest: getRestV2(ex.sets),
                notes: ex.coaching_cues?.[0] ?? null,
              }
            })
            .filter((r): r is NonNullable<typeof r> => r !== null)

          if (exRows.length > 0) {
            const { error: exErr } = await supabase.from('programme_exercises').insert(exRows)
            if (exErr) return { success: false, error: `Exercises: ${exErr.message}` }
          }
        }

        // Insert cooldown_items for this day
        const cooldowns: OdinData[] = dayRow._cooldown ?? []
        if (cooldowns.length > 0) {
          const cdRows = cooldowns.map((cd: OdinData, idx: number) => ({
            day_id: dayId,
            item_key: cd.cooldown_id ?? `cd-${idx}`,
            label: cd.activity_name ?? 'Cooldown',
            detail: formatItemDetail(cd.purpose, cd.duration_seconds, cd.repetitions),
            display_order: cd.display_order ?? idx + 1,
          }))
          const { error: cdErr } = await supabase.from('cooldown_items').insert(cdRows)
          if (cdErr) return { success: false, error: `Cooldown: ${cdErr.message}` }
        }

        // Insert conditioning_items for this day (conditioning/sport/recovery-only
        // days, and the conditioning half of combined days)
        const conditioningItems: OdinData[] = dayRow._conditioning ?? []
        if (conditioningItems.length > 0) {
          const condRows = conditioningItems.map((ci: OdinData, idx: number) => ({
            programme_id: programmeId,
            day_id: dayId,
            display_order: idx,
            conditioning_id: ci.conditioning_id ?? null,
            activity_id: ci.activity_id,
            activity_name: ci.activity_name,
            conditioning_type: ci.conditioning_type,
            purpose: ci.purpose ?? null,
            duration_min: ci.duration_min,
            target_rpe: ci.intensity?.target_rpe ?? null,
            heart_rate_zone: ci.intensity?.heart_rate_zone ?? null,
            intensity_description: ci.intensity?.description ?? null,
            intervals: ci.intervals ?? null,
            fatigue_cost: ci.fatigue_cost ?? null,
            rationale: ci.rationale ?? null,
          }))
          const { error: condErr } = await supabase.from('conditioning_items').insert(condRows)
          if (condErr) return { success: false, error: `Conditioning: ${condErr.message}` }
        }
      }

      // 6. Insert warmup_items once per programme (use phase 1's first workout day template)
      if (phaseIdx === 0) {
        const firstWorkoutDay = templateWeek.days.find((d: OdinData) => (d.warmup?.length ?? 0) > 0)
        const warmups: OdinData[] = firstWorkoutDay?.warmup ?? []
        if (warmups.length > 0) {
          const warmupRows = warmups.map((w: OdinData, idx: number) => ({
            programme_id: programmeId,
            item_key: w.warmup_id ?? `wu-${idx}`,
            label: w.activity_name ?? 'Warmup',
            detail: formatItemDetail(w.purpose, w.duration_seconds, w.repetitions),
            display_order: w.display_order ?? idx + 1,
          }))
          const { error: wuErr } = await supabase.from('warmup_items').insert(warmupRows)
          if (wuErr) return { success: false, error: `Warmup: ${wuErr.message}` }
        }
      }
    }

    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Hydration failed'
    return { success: false, error: msg }
  }
}
