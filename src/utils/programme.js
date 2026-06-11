/**
 * Pure utility — compute current phase and week from session history
 * and programme config.
 */

import exerciseData from '../data/exercises.json'

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

/**
 * Get the Monday of the week containing `date`.
 */
function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Format a Date to 'YYYY-MM-DD'.
 */
export function toDateStr(d) {
  const dt = typeof d === 'string' ? new Date(d + 'T00:00:00') : d
  return dt.getFullYear() + '-' +
    String(dt.getMonth() + 1).padStart(2, '0') + '-' +
    String(dt.getDate()).padStart(2, '0')
}

/**
 * Get day-of-week key from a Date.
 */
export function getDayKey(date) {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date
  return ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()]
}

/**
 * Get the week number (1-based) from startDate to a given date.
 */
export function getWeekNumber(startDate, date) {
  const start = getMonday(new Date(startDate + 'T00:00:00'))
  const target = getMonday(new Date(date + 'T00:00:00'))
  const diff = Math.round((target - start) / (7 * 24 * 60 * 60 * 1000))
  return Math.max(1, diff + 1)
}

/**
 * Count qualifying weeks from session history.
 * A week qualifies if it has >= minActiveDays completed sessions
 * (Sunday excluded from counting).
 */
function countQualifyingWeeks(sessions, startDate, minActiveDays) {
  const weekMap = {}
  for (const s of sessions) {
    if (s.day_of_week === 'SUN') continue
    const monday = toDateStr(getMonday(new Date(s.date + 'T00:00:00')))
    if (!weekMap[monday]) weekMap[monday] = new Set()
    weekMap[monday].add(s.date)
  }

  const startMonday = toDateStr(getMonday(new Date(startDate + 'T00:00:00')))
  const todayMonday = toDateStr(getMonday(new Date()))

  let count = 0
  for (const wk of Object.keys(weekMap).sort()) {
    if (wk < startMonday) continue
    if (wk >= todayMonday) continue
    if (weekMap[wk].size >= minActiveDays) count++
  }
  return count
}

/**
 * Compute the current phase and week-within-phase.
 */
export function computePhaseAndWeek(sessions, config) {
  const { start_date, phase_weeks, min_active_days } = config
  const qualifyingWeeks = countQualifyingWeeks(sessions, start_date, min_active_days)

  let phase = 1
  let consumed = 0
  for (let i = 0; i < phase_weeks.length; i++) {
    if (qualifyingWeeks < consumed + phase_weeks[i]) {
      phase = i + 1
      break
    }
    consumed += phase_weeks[i]
    if (i === phase_weeks.length - 1) phase = phase_weeks.length
  }

  const weekInPhase = qualifyingWeeks - consumed + 1
  const totalWeek = getWeekNumber(start_date, toDateStr(new Date()))

  return { phase, weekInPhase, totalWeek, qualifyingWeeks }
}

/**
 * Get workout definition for a specific phase + day.
 */
export function getDayWorkout(phase, dayOfWeek) {
  const phaseData = exerciseData.W[String(phase)]
  if (!phaseData) return null
  return phaseData[dayOfWeek] || null
}

/**
 * Return true if weekOffset represents a past week.
 */
export function isPastWeek(weekOffset) {
  return weekOffset < 0
}

/**
 * Get array of { dayLabel, date, dateStr } for Mon-Sat of the given week.
 * weekOffset: 0 = current week, -1 = last week, +1 = next week
 */
export function getWeekDays(weekOffset = 0) {
  const now = new Date()
  now.setDate(now.getDate() + weekOffset * 7)
  const monday = getMonday(now)

  return DAY_LABELS.map((label, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return { dayLabel: label, date: d, dateStr: toDateStr(d) }
  })
}
