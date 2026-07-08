import { describe, it, expect } from 'vitest'
import { updateExerciseInDay } from './programmeState'

interface TestExercise {
  id: string
  exercise_id: string
  name: string
}

const buildState = (): Record<string, TestExercise[]> => ({
  'day-1': [
    { id: 'ex-1', exercise_id: 'old-uuid', name: 'Barbell Floor Press' },
    { id: 'ex-2', exercise_id: 'uuid-2', name: 'T-Bar Row' },
  ],
  'day-2': [{ id: 'ex-3', exercise_id: 'uuid-3', name: 'Squat' }],
})

describe('updateExerciseInDay', () => {
  it('replaces only the targeted exercise, leaving siblings and other days untouched', () => {
    const before = buildState()
    const replacement: TestExercise = { id: 'ex-1', exercise_id: 'new-uuid', name: 'Band Curl' }

    const after = updateExerciseInDay(before, 'day-1', 'ex-1', replacement)

    expect(after['day-1']?.[0]).toEqual(replacement)
    expect(after['day-1']?.[1]).toEqual(before['day-1']?.[1])
    expect(after['day-2']).toBe(before['day-2'])
  })

  it('returns new object/array references for the changed day (no mutation)', () => {
    const before = buildState()
    const replacement: TestExercise = { id: 'ex-1', exercise_id: 'new-uuid', name: 'Band Curl' }

    const after = updateExerciseInDay(before, 'day-1', 'ex-1', replacement)

    expect(after).not.toBe(before)
    expect(after['day-1']).not.toBe(before['day-1'])
    expect(before['day-1']?.[0]?.exercise_id).toBe('old-uuid') // original untouched
  })

  it('is a no-op (same reference) when the day id is unknown', () => {
    const before = buildState()
    const after = updateExerciseInDay(before, 'day-does-not-exist', 'ex-1', {} as TestExercise)
    expect(after).toBe(before)
  })

  it('is a no-op (same reference) when the exercise row id is unknown within the day', () => {
    const before = buildState()
    const after = updateExerciseInDay(before, 'day-1', 'ex-does-not-exist', {} as TestExercise)
    expect(after).toBe(before)
  })
})
