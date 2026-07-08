import { describe, it, expect, vi } from 'vitest'

// hydrateProgramme batches all days/exercises across every phase into single
// inserts (see the "Refresh Programme takes forever" fix) and re-matches
// inserted days back to their source phase via a (phase_id, day_of_week)
// composite key, since day_of_week repeats across phases. This is the one
// piece of new logic that can silently drop data (an unmatched day just
// gets skipped) rather than error, so it's the one worth covering.

vi.mock('./exerciseResolver', () => ({
  resolveExercises: vi.fn().mockResolvedValue(
    new Map([
      ['Phase1 Monday Exercise', 'ex-p1-mon'],
      ['Phase2 Monday Exercise', 'ex-p2-mon'],
    ])
  ),
}))

const inserted: Record<string, unknown[]> = {}

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      insert: (rows: Record<string, unknown>[]) => {
        inserted[table] = rows
        return {
          select: () =>
            Promise.resolve({
              data:
                table === 'programme_phases'
                  ? rows.map((r, i) => ({ id: `phase-${i + 1}`, phase_number: r.phase_number }))
                  : table === 'programme_days'
                    ? rows.map((r, i) => ({
                        id: `day-${i + 1}`,
                        phase_id: r.phase_id,
                        day_of_week: r.day_of_week,
                      }))
                    : [],
              error: null,
            }),
          then: (resolve: (v: { data: null; error: null }) => void) =>
            resolve({ data: null, error: null }),
        }
      },
    }),
  },
}))

import { hydrateProgramme } from './programmeHydrator'

describe('hydrateProgramme', () => {
  it('matches each day back to its own phase (not a same-named day in another phase)', async () => {
    const odinData = {
      programme: {
        phases: [
          {
            name: 'Phase 1',
            weeks: [
              {
                days: [
                  {
                    day_of_week: 'monday',
                    day_type: 'strength',
                    exercises: [{ exercise_name: 'Phase1 Monday Exercise', sets: [] }],
                  },
                ],
              },
            ],
          },
          {
            name: 'Phase 2',
            weeks: [
              {
                days: [
                  {
                    day_of_week: 'monday',
                    day_type: 'strength',
                    exercises: [{ exercise_name: 'Phase2 Monday Exercise', sets: [] }],
                  },
                ],
              },
            ],
          },
        ],
      },
    }

    const result = await hydrateProgramme('programme-1', odinData, 'user-1')

    expect(result).toEqual({ success: true })

    const exRows = inserted['programme_exercises'] as Array<{
      day_id: string
      exercise_id: string
    }>
    expect(exRows).toHaveLength(2)

    const dayRows = inserted['programme_days'] as Array<{ phase_id: string; day_of_week: string }>
    // Two distinct MON rows, one per phase, not deduped/collapsed into one.
    expect(dayRows).toHaveLength(2)
    expect(dayRows[0]?.day_of_week).toBe('MON')
    expect(dayRows[1]?.day_of_week).toBe('MON')
    expect(dayRows[0]?.phase_id).not.toBe(dayRows[1]?.phase_id)

    // Each exercise's day_id must trace back to the day row insert order
    // (day-1 for phase 1, day-2 for phase 2) — not swapped between phases.
    const phase1Ex = exRows.find((r) => r.exercise_id === 'ex-p1-mon')
    const phase2Ex = exRows.find((r) => r.exercise_id === 'ex-p2-mon')
    expect(phase1Ex?.day_id).toBe('day-1')
    expect(phase2Ex?.day_id).toBe('day-2')
  })
})
