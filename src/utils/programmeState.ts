// Replaces one item in a list by id, returning a new array. Returns the
// SAME array reference if the id isn't found, so callers can cheaply check
// `result === list` to detect a no-op (used by updateExerciseInDay below,
// and by exerciseSwap.ts to patch the same shape inside the IDB cache).
export function replaceById<T extends { id: string }>(list: T[], id: string, replacement: T): T[] {
  const index = list.findIndex((item) => item.id === id)
  if (index === -1) return list

  const next = [...list]
  next[index] = replacement
  return next
}

// gx's Programme tab state is flat/ID-keyed (phaseDays: Record<phaseId, days[]>,
// dayExercises: Record<dayId, exercises[]>), not a nested phases→weeks→days
// tree — there's no "weeks" level in this schema at all (a phase's days are
// a single template reused across all its weeks). This locates one exercise
// row within that shape and replaces it, without mutating the original
// record/array or touching any other day.
export function updateExerciseInDay<T extends { id: string }>(
  dayExercises: Record<string, T[]>,
  dayId: string,
  exerciseRowId: string,
  updatedExercise: T
): Record<string, T[]> {
  const dayList = dayExercises[dayId]
  if (!dayList) return dayExercises

  const nextDayList = replaceById(dayList, exerciseRowId, updatedExercise)
  if (nextDayList === dayList) return dayExercises

  return { ...dayExercises, [dayId]: nextDayList }
}
