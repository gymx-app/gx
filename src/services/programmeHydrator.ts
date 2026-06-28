import { supabase } from '../lib/supabase'
import { resolveExercises } from './exerciseResolver'
import {
  mapDayLabel,
  mapSessionType,
  buildTitle,
  buildSubtitle,
  formatSetsReps,
  formatRest,
} from '../utils/odinMappers'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OdinData = any

interface HydrateResult {
  success: boolean
  error?: string
}

export async function hydrateProgramme(
  programmeId: string,
  odinData: OdinData,
  userId: string
): Promise<HydrateResult> {
  try {
    const programme = odinData?.programme
    const phases: OdinData[] = programme?.phases ?? []

    if (phases.length === 0) {
      return { success: true }
    }

    // 1. Collect all exercise names across all phases/weeks/sessions
    const allNames: string[] = []
    for (const phase of phases) {
      for (const week of phase.weeks ?? []) {
        for (const session of week.sessions ?? []) {
          for (const ex of session.exercises ?? []) {
            if (ex.name) allNames.push(ex.name)
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
      goal: phase.rationale ?? phase.name ?? `Phase ${idx + 1}`,
      weeks_count: phase.duration_weeks ?? 4,
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
      if (!templateWeek?.sessions) continue

      const usedDays = new Set<string>()
      const dayRows: OdinData[] = []

      for (let si = 0; si < templateWeek.sessions.length; si++) {
        const session = templateWeek.sessions[si]
        let dow = mapDayLabel(session.day_label, si)

        // Avoid duplicate day_of_week within a phase
        while (usedDays.has(dow)) {
          const idx = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].indexOf(dow)
          dow = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'][(idx + 1) % 7] ?? 'MON'
        }
        usedDays.add(dow)

        const workoutType = mapSessionType(session.session_type)

        dayRows.push({
          phase_id: phaseId,
          day_of_week: dow,
          workout_type: workoutType,
          title: buildTitle(session.session_type),
          subtitle: buildSubtitle(session.exercises ?? []),
          duration_min: null,
          has_warmup: workoutType === 'workout',
          _exercises: session.exercises ?? [],
        })
      }

      // Insert programme_days (without _exercises)
      const dbDayRows = dayRows.map(({ _exercises, ...rest }) => rest)
      const { data: insertedDays, error: dayErr } = await supabase
        .from('programme_days')
        .insert(dbDayRows)
        .select('id, day_of_week')

      if (dayErr) return { success: false, error: `Days: ${dayErr.message}` }

      // Build day_of_week → day_id map
      const dayIdMap = new Map<string, string>()
      for (const d of insertedDays ?? []) {
        dayIdMap.set(d.day_of_week, d.id)
      }

      // 5. Insert programme_exercises for each day
      for (const dayRow of dayRows) {
        const dayId = dayIdMap.get(dayRow.day_of_week)
        if (!dayId) continue

        const exercises: OdinData[] = dayRow._exercises
        if (exercises.length === 0) continue

        const exRows = exercises
          .map((ex: OdinData, idx: number) => {
            const exerciseId = exerciseMap.get(ex.name)
            if (!exerciseId) return null
            return {
              day_id: dayId,
              exercise_id: exerciseId,
              display_order: idx + 1,
              sets_reps: formatSetsReps(ex.sets, ex.reps),
              rest: formatRest(ex.rest_seconds),
              notes: ex.notes ?? null,
            }
          })
          .filter((r): r is NonNullable<typeof r> => r !== null)

        if (exRows.length > 0) {
          const { error: exErr } = await supabase.from('programme_exercises').insert(exRows)

          if (exErr) return { success: false, error: `Exercises: ${exErr.message}` }
        }
      }
    }

    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Hydration failed'
    return { success: false, error: msg }
  }
}
