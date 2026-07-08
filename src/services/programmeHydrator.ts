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
const DAY_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

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

    // 4. Build programme_days rows for every phase up front (still one pass
    // per phase to apply the day-label-dedup logic, but no awaits inside
    // this loop) so all days across the whole programme can be inserted in
    // a single round trip instead of one insert per phase.
    const dayRows: OdinData[] = []
    let warmupRows: OdinData[] = []

    for (let phaseIdx = 0; phaseIdx < phases.length; phaseIdx++) {
      const phase = phases[phaseIdx]
      const phaseId = phaseIdMap.get(phaseIdx + 1)
      if (!phaseId) continue

      const templateWeek = phase.weeks?.[0]
      if (!templateWeek?.days) continue

      const usedDays = new Set<string>()

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

      // Warmup items are keyed by programme only (not per-day), taken once
      // from phase 1's first workout day template.
      if (phaseIdx === 0) {
        const firstWorkoutDay = templateWeek.days.find((d: OdinData) => (d.warmup?.length ?? 0) > 0)
        const warmups: OdinData[] = firstWorkoutDay?.warmup ?? []
        warmupRows = warmups.map((w: OdinData, idx: number) => ({
          programme_id: programmeId,
          item_key: w.warmup_id ?? `wu-${idx}`,
          label: w.activity_name ?? 'Warmup',
          detail: formatItemDetail(w.purpose, w.duration_seconds, w.repetitions),
          display_order: w.display_order ?? idx + 1,
        }))
      }
    }

    // 5. Insert every day across every phase in one round trip. day_of_week
    // repeats across phases, so days are matched back up by (phase_id,
    // day_of_week) rather than day_of_week alone.
    const dbDayRows = dayRows.map(
      ({ _exercises: _ex, _cooldown: _cd, _conditioning: _cond, ...rest }) => rest
    )
    const { data: insertedDays, error: dayErr } =
      dbDayRows.length > 0
        ? await supabase
            .from('programme_days')
            .insert(dbDayRows)
            .select('id, phase_id, day_of_week')
        : { data: [], error: null }

    if (dayErr) return { success: false, error: `Days: ${dayErr.message}` }

    const dayIdMap = new Map<string, string>()
    for (const d of insertedDays ?? []) {
      dayIdMap.set(`${d.phase_id}|${d.day_of_week}`, d.id)
    }

    // 6. Build programme_exercises/cooldown_items/conditioning_items rows
    // for every day across every phase, then insert each in a single
    // round trip instead of once per day.
    const allExRows: OdinData[] = []
    const allCdRows: OdinData[] = []
    const allCondRows: OdinData[] = []

    for (const dayRow of dayRows) {
      const dayId = dayIdMap.get(`${dayRow.phase_id}|${dayRow.day_of_week}`)
      if (!dayId) continue

      const exercises: OdinData[] = dayRow._exercises
      for (const [idx, ex] of exercises.entries()) {
        const exerciseId = exerciseMap.get(ex.exercise_name)
        if (!exerciseId) continue
        allExRows.push({
          day_id: dayId,
          exercise_id: exerciseId,
          display_order: idx + 1,
          sets_reps: formatSetsRepsV2(ex.sets),
          rest: getRestV2(ex.sets),
          notes: ex.coaching_cues?.[0] ?? null,
        })
      }

      const cooldowns: OdinData[] = dayRow._cooldown ?? []
      cooldowns.forEach((cd: OdinData, idx: number) => {
        allCdRows.push({
          day_id: dayId,
          item_key: cd.cooldown_id ?? `cd-${idx}`,
          label: cd.activity_name ?? 'Cooldown',
          detail: formatItemDetail(cd.purpose, cd.duration_seconds, cd.repetitions),
          display_order: cd.display_order ?? idx + 1,
        })
      })

      const conditioningItems: OdinData[] = dayRow._conditioning ?? []
      conditioningItems.forEach((ci: OdinData, idx: number) => {
        allCondRows.push({
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
        })
      })
    }

    if (allExRows.length > 0) {
      const { error: exErr } = await supabase.from('programme_exercises').insert(allExRows)
      if (exErr) return { success: false, error: `Exercises: ${exErr.message}` }
    }
    if (allCdRows.length > 0) {
      const { error: cdErr } = await supabase.from('cooldown_items').insert(allCdRows)
      if (cdErr) return { success: false, error: `Cooldown: ${cdErr.message}` }
    }
    if (allCondRows.length > 0) {
      const { error: condErr } = await supabase.from('conditioning_items').insert(allCondRows)
      if (condErr) return { success: false, error: `Conditioning: ${condErr.message}` }
    }
    if (warmupRows.length > 0) {
      const { error: wuErr } = await supabase.from('warmup_items').insert(warmupRows)
      if (wuErr) return { success: false, error: `Warmup: ${wuErr.message}` }
    }

    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Hydration failed'
    return { success: false, error: msg }
  }
}

export interface OdinPrescriptionLookup {
  exercise_id: string
  substitution_options: { approved_exercise_ids: string[] } | null
}

// programme_exercises never stored Odin's own exercise_id or
// substitution_options — hydration only kept exercise_name (see
// resolveExercises above). Both still live in the raw programme_data JSON
// every active programme already has loaded, so this reconstructs which
// JSON node a given (phase, day, exercise) DB row came from — using the
// exact same day_of_week assignment (mapDayLabel + de-dup) hydration used,
// so it lands on the same day even when the raw label was missing/duplicate.
export function findOdinPrescription(
  odinData: OdinData,
  phaseIndex: number,
  dayOfWeek: string,
  displayOrder: number
): OdinPrescriptionLookup | null {
  const phase = odinData?.programme?.phases?.[phaseIndex]
  const days: OdinData[] = phase?.weeks?.[0]?.days ?? []

  const usedDays = new Set<string>()
  let matchedDay: OdinData = null

  for (let di = 0; di < days.length; di++) {
    const day = days[di]
    let dow = mapDayLabel(day.day_of_week ?? '', di)
    while (usedDays.has(dow)) {
      const idx = DAY_ORDER.indexOf(dow)
      dow = DAY_ORDER[(idx + 1) % 7] ?? 'MON'
    }
    usedDays.add(dow)

    if (dow === dayOfWeek) {
      matchedDay = day
      break
    }
  }

  const exercise = matchedDay?.exercises?.[displayOrder - 1]
  if (!exercise?.exercise_id) return null

  return {
    exercise_id: exercise.exercise_id,
    substitution_options: exercise.substitution_options ?? null,
  }
}
