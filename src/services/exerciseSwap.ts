import { resolveExercises } from './exerciseResolver'
import { updateProgrammeExerciseId } from './programmeService'
import * as idbCache from './idbCache'
import { replaceById } from '../utils/programmeState'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = any

export interface ChosenAlternative {
  exercise_id: string
  name: string
}

export interface ApplyExerciseSwapResult {
  success: boolean
  error?: string
  updatedRow?: AnyData
}

export interface ApplyExerciseSwapDeps {
  resolveExercises: typeof resolveExercises
  updateProgrammeExerciseId: typeof updateProgrammeExerciseId
  idbCacheGet: typeof idbCache.get
  idbCacheSet: typeof idbCache.set
}

const defaultDeps: ApplyExerciseSwapDeps = {
  resolveExercises,
  updateProgrammeExerciseId,
  idbCacheGet: idbCache.get,
  idbCacheSet: idbCache.set,
}

// Odin identifies exercises by its own slug id; programme_exercises expects
// gx's own UUID. gx has no separate id-mapping table for this — exercises
// are matched/created by name (see exerciseResolver.ts, the same logic
// hydration already uses), so this reuses it rather than building a second
// lookup. If gx has never stored this exercise before (swap alternatives
// aren't limited to exercises already in this user's hydrated programme,
// so this does happen), resolveExercises creates the row on the fly, same
// as initial hydration does.
export async function applyExerciseSwap(
  userId: string,
  dayId: string,
  prescriptionId: string,
  chosen: ChosenAlternative,
  deps: ApplyExerciseSwapDeps = defaultDeps
): Promise<ApplyExerciseSwapResult> {
  const nameToId = await deps.resolveExercises([chosen.name], userId)
  const newExerciseId = nameToId.get(chosen.name)
  if (!newExerciseId) {
    return { success: false, error: 'Could not resolve the new exercise.' }
  }

  const { data, error } = await deps.updateProgrammeExerciseId(prescriptionId, newExerciseId)
  if (error || !data) {
    return { success: false, error: error ?? 'Failed to save the swap.' }
  }

  // The Today tab reads this day's exercises from an IDB cache keyed by
  // dayId (see cacheKey.programmeExercises in useTodayData.js), separate
  // from gx's own in-memory Programme-tab state — without this, a
  // successful swap wouldn't show up there until the cache's 1-hour TTL
  // expired or the user manually refreshed. Only patches an entry that's
  // already cached: if this day was never cached there's nothing stale to
  // fix, and writing a partial list here (we only have this one row, not
  // the day's full exercise list) would corrupt an as-yet-unpopulated cache.
  const cachedDayExercises = await deps.idbCacheGet('programme-exercises', dayId)
  if (cachedDayExercises) {
    const updatedList = replaceById(cachedDayExercises as AnyData[], prescriptionId, data)
    await deps.idbCacheSet('programme-exercises', dayId, updatedList)
  }

  return { success: true, updatedRow: data }
}
