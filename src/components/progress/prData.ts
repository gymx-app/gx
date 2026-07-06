import type { PrEntry } from './PrRow'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// The curated set shown on the Progress tab preview card — same source used
// as the head of the full history list so the two stay consistent.
export const CURATED_PRS: PrEntry[] = [
  { name: 'Back Squat', dateISO: '2026-07-01', delta: '+2.5', value: '165', unit: 'KG' },
  { name: 'Deadlift', dateISO: '2026-06-24', delta: '+5', value: '185', unit: 'KG' },
  { name: 'Bench Press', dateISO: '2026-06-18', delta: '+1', value: '100', unit: 'KG' },
  { name: 'Overhead Press', dateISO: '2026-06-10', delta: '+2.5', value: '60', unit: 'KG' },
  { name: 'Front Squat', dateISO: '2026-06-02', delta: '+2.5', value: '125', unit: 'KG' },
  { name: 'Romanian Deadlift', dateISO: '2026-05-27', delta: '+5', value: '145', unit: 'KG' },
  { name: 'Incline Bench', dateISO: '2026-05-20', delta: '+2.5', value: '85', unit: 'KG' },
  { name: 'Barbell Row', dateISO: '2026-05-14', delta: '+2.5', value: '95', unit: 'KG' },
  { name: 'Trap Bar Deadlift', dateISO: '2026-05-07', delta: '+7.5', value: '195', unit: 'KG' },
  { name: 'Push Press', dateISO: '2026-04-30', delta: '+2.5', value: '70', unit: 'KG' },
  { name: 'Pause Squat', dateISO: '2026-04-23', delta: '+2.5', value: '145', unit: 'KG' },
  { name: 'Close Grip Bench', dateISO: '2026-04-16', delta: '+1', value: '90', unit: 'KG' },
].map((pr) => ({ ...pr, date: formatDate(pr.dateISO) }))

export const ALL_EXERCISES = [
  ...new Set(CURATED_PRS.map((pr) => pr.name)),
  'Leg Press',
  'Hack Squat',
  'Seated Row',
  'Lat Pulldown',
  'Dumbbell Shoulder Press',
  'Hip Thrust',
  'Bulgarian Split Squat',
  'Cable Fly',
]

// Extends the curated set with older synthetic entries (relative to today)
// so the full history page has enough real-feeling depth to scroll through.
export function buildFullPrHistory(): PrEntry[] {
  const extraExercises = ALL_EXERCISES.filter((name) => !CURATED_PRS.some((pr) => pr.name === name))
  const oldestCurated = new Date(CURATED_PRS[CURATED_PRS.length - 1]!.dateISO)
  const extras: PrEntry[] = []

  let cursor = oldestCurated
  for (let i = 0; i < 90; i++) {
    cursor = new Date(cursor)
    cursor.setDate(cursor.getDate() - (5 + (i % 5)))
    const name = extraExercises[i % extraExercises.length]!
    const value = 40 + ((i * 9) % 120)
    const delta = [1, 2.5, 5][i % 3]
    const dateISO = cursor.toISOString().slice(0, 10)
    extras.push({
      name,
      dateISO,
      date: formatDate(dateISO),
      delta: `+${delta}`,
      value: String(value),
      unit: 'KG',
    })
  }

  return [...CURATED_PRS, ...extras]
}
