import { describe, it, expect, vi } from 'vitest'

// applyExerciseSwap's default deps import resolveExercises/updateProgrammeExerciseId,
// which transitively import the real Supabase client — every test below
// passes explicit mock deps instead, so this just keeps that import from
// throwing on missing env vars in the test environment.
vi.mock('../lib/supabase', () => ({ supabase: {} }))

import { applyExerciseSwap } from './exerciseSwap'

const USER_ID = 'user-1'
const DAY_ID = 'day-1'
const PRESCRIPTION_ID = 'programme-exercise-1'

// idbCacheGet/idbCacheSet are required deps but most tests here aren't
// exercising cache behavior — this keeps them terse (cache miss, no-op).
const noCache = {
  idbCacheGet: vi.fn().mockResolvedValue(null),
  idbCacheSet: vi.fn().mockResolvedValue(undefined),
}

describe('applyExerciseSwap', () => {
  it('resolves an already-mapped exercise name to its existing gx UUID and persists it', async () => {
    // "already mapped" — resolveExercises finds an existing row by name
    // rather than creating one, mirroring how gx's exercise catalog is
    // matched everywhere else (exerciseResolver.ts).
    const resolveExercises = vi
      .fn()
      .mockResolvedValue(new Map([['Band Biceps Curl', 'existing-gx-uuid']]))
    const updateProgrammeExerciseId = vi.fn().mockResolvedValue({
      data: { id: PRESCRIPTION_ID, exercise_id: 'existing-gx-uuid', sets_reps: '3x12' },
      error: null,
    })

    const result = await applyExerciseSwap(
      USER_ID,
      DAY_ID,
      PRESCRIPTION_ID,
      { exercise_id: 'band_biceps_curl', name: 'Band Biceps Curl' },
      { resolveExercises, updateProgrammeExerciseId, ...noCache }
    )

    expect(resolveExercises).toHaveBeenCalledWith(['Band Biceps Curl'], USER_ID)
    expect(updateProgrammeExerciseId).toHaveBeenCalledWith(PRESCRIPTION_ID, 'existing-gx-uuid')
    expect(result).toEqual({
      success: true,
      updatedRow: { id: PRESCRIPTION_ID, exercise_id: 'existing-gx-uuid', sets_reps: '3x12' },
    })
  })

  it('fails without writing when the exercise name cannot be resolved to a UUID', async () => {
    const resolveExercises = vi.fn().mockResolvedValue(new Map())
    const updateProgrammeExerciseId = vi.fn()

    const result = await applyExerciseSwap(
      USER_ID,
      DAY_ID,
      PRESCRIPTION_ID,
      { exercise_id: 'mystery_exercise', name: 'Mystery Exercise' },
      { resolveExercises, updateProgrammeExerciseId, ...noCache }
    )

    expect(updateProgrammeExerciseId).not.toHaveBeenCalled()
    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('reports failure and returns no updatedRow when the Supabase write fails', async () => {
    const resolveExercises = vi
      .fn()
      .mockResolvedValue(new Map([['Cable Biceps Curl', 'existing-gx-uuid']]))
    const updateProgrammeExerciseId = vi
      .fn()
      .mockResolvedValue({ data: null, error: 'Failed to save the swap' })

    const result = await applyExerciseSwap(
      USER_ID,
      DAY_ID,
      PRESCRIPTION_ID,
      { exercise_id: 'cable_biceps_curl', name: 'Cable Biceps Curl' },
      { resolveExercises, updateProgrammeExerciseId, ...noCache }
    )

    expect(result).toEqual({ success: false, error: 'Failed to save the swap' })
    expect(result.updatedRow).toBeUndefined()
    expect(noCache.idbCacheSet).not.toHaveBeenCalled()
  })

  describe("IDB cache sync (Today tab reads this day's exercises from cache, separately from Programme-tab state)", () => {
    it('patches the cached day-exercise list in place when an entry already exists, so no manual refresh is needed', async () => {
      const updatedRow = { id: PRESCRIPTION_ID, exercise_id: 'existing-gx-uuid', sets_reps: '3x12' }
      const resolveExercises = vi
        .fn()
        .mockResolvedValue(new Map([['Band Biceps Curl', 'existing-gx-uuid']]))
      const updateProgrammeExerciseId = vi.fn().mockResolvedValue({ data: updatedRow, error: null })
      const cachedList = [
        { id: PRESCRIPTION_ID, exercise_id: 'old-uuid', sets_reps: '3x12' },
        { id: 'programme-exercise-2', exercise_id: 'other-uuid', sets_reps: '4x8' },
      ]
      const idbCacheGet = vi.fn().mockResolvedValue(cachedList)
      const idbCacheSet = vi.fn().mockResolvedValue(undefined)

      await applyExerciseSwap(
        USER_ID,
        DAY_ID,
        PRESCRIPTION_ID,
        { exercise_id: 'band_biceps_curl', name: 'Band Biceps Curl' },
        { resolveExercises, updateProgrammeExerciseId, idbCacheGet, idbCacheSet }
      )

      expect(idbCacheGet).toHaveBeenCalledWith('programme-exercises', DAY_ID)
      expect(idbCacheSet).toHaveBeenCalledWith('programme-exercises', DAY_ID, [
        updatedRow,
        { id: 'programme-exercise-2', exercise_id: 'other-uuid', sets_reps: '4x8' },
      ])
      // The other exercise in the same day is untouched.
      expect(cachedList[1]).toEqual({
        id: 'programme-exercise-2',
        exercise_id: 'other-uuid',
        sets_reps: '4x8',
      })
    })

    it('does not write to the cache when the day was never cached (nothing stale to fix)', async () => {
      const resolveExercises = vi
        .fn()
        .mockResolvedValue(new Map([['Band Biceps Curl', 'existing-gx-uuid']]))
      const updateProgrammeExerciseId = vi.fn().mockResolvedValue({
        data: { id: PRESCRIPTION_ID, exercise_id: 'existing-gx-uuid' },
        error: null,
      })
      const idbCacheGet = vi.fn().mockResolvedValue(null)
      const idbCacheSet = vi.fn().mockResolvedValue(undefined)

      await applyExerciseSwap(
        USER_ID,
        DAY_ID,
        PRESCRIPTION_ID,
        { exercise_id: 'band_biceps_curl', name: 'Band Biceps Curl' },
        { resolveExercises, updateProgrammeExerciseId, idbCacheGet, idbCacheSet }
      )

      expect(idbCacheGet).toHaveBeenCalledWith('programme-exercises', DAY_ID)
      expect(idbCacheSet).not.toHaveBeenCalled()
    })

    it('does not touch the cache when the swap itself fails', async () => {
      const resolveExercises = vi.fn().mockResolvedValue(new Map())
      const idbCacheGet = vi.fn().mockResolvedValue(null)
      const idbCacheSet = vi.fn().mockResolvedValue(undefined)

      await applyExerciseSwap(
        USER_ID,
        DAY_ID,
        PRESCRIPTION_ID,
        { exercise_id: 'mystery_exercise', name: 'Mystery Exercise' },
        { resolveExercises, updateProgrammeExerciseId: vi.fn(), idbCacheGet, idbCacheSet }
      )

      expect(idbCacheGet).not.toHaveBeenCalled()
      expect(idbCacheSet).not.toHaveBeenCalled()
    })
  })
})
