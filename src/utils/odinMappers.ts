const DAY_MAP: Record<string, string> = {
  monday: 'MON',
  tuesday: 'TUE',
  wednesday: 'WED',
  thursday: 'THU',
  friday: 'FRI',
  saturday: 'SAT',
  sunday: 'SUN',
  mon: 'MON',
  tue: 'TUE',
  wed: 'WED',
  thu: 'THU',
  fri: 'FRI',
  sat: 'SAT',
  sun: 'SUN',
}

const INDEX_TO_DAY = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

export function mapDayLabel(dayLabel: string, sessionIndex: number): string {
  if (!dayLabel) return INDEX_TO_DAY[sessionIndex % 7] ?? 'MON'

  const lower = dayLabel.toLowerCase().trim()

  if (DAY_MAP[lower]) return DAY_MAP[lower]

  // "Day 1", "Day 2" etc.
  const dayNum = lower.match(/day\s*(\d+)/)?.[1]
  if (dayNum) {
    const idx = parseInt(dayNum) - 1
    return INDEX_TO_DAY[idx % 7] ?? 'MON'
  }

  // Partial match: starts with day abbreviation
  for (const [key, val] of Object.entries(DAY_MAP)) {
    if (lower.startsWith(key)) return val
  }

  return INDEX_TO_DAY[sessionIndex % 7] ?? 'MON'
}

export function mapSessionType(sessionType: string): string {
  if (!sessionType) return 'workout'

  const lower = sessionType.toLowerCase()

  if (/\brest\b|day\s*off\b|\boff\b/.test(lower)) return 'rest'
  if (/\bliss\b|\bcardio\b|\brecovery\b|\bactive\s*rest/.test(lower)) return 'liss'
  if (/\bhiit\b|\binterval\b|\bcircuit\b/.test(lower)) return 'hiit'
  if (/\bmobility\b|\bstretch\b|\byoga\b|\bflexibility\b/.test(lower)) return 'mobility'

  return 'workout'
}

export function buildTitle(sessionType: string): string {
  if (!sessionType) return 'WORKOUT'
  return sessionType.toUpperCase()
}

export function buildSubtitle(exercises: { name: string }[]): string {
  if (!exercises || exercises.length === 0) return ''
  return exercises
    .slice(0, 3)
    .map((e) => e.name)
    .join(' · ')
}

export function formatSetsReps(sets: number | null, reps: string | number | null): string {
  const s = sets ?? 3
  const r = reps ?? '12'
  return `${s}×${r}`
}

export function formatRest(restSeconds: number | null): string {
  if (!restSeconds) return '60s'
  return `${restSeconds}s`
}
