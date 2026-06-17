export type DayStatus = 'pre_programme' | 'rest' | 'completed' | 'today' | 'skipped' | 'future'

export function getDayStatus(
  date: string,
  completedDates: Set<string>,
  restDayIndices: Set<number>,
  programmeStartDate: string | null,
  todayStr: string,
  dayIndex: number,
): DayStatus {
  if (programmeStartDate && date < programmeStartDate) return 'pre_programme'
  if (restDayIndices.has(dayIndex)) return 'rest'
  if (completedDates.has(date)) return 'completed'
  if (date === todayStr) return 'today'
  if (date < todayStr) return 'skipped'
  return 'future'
}
