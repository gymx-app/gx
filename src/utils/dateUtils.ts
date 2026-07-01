// IST-aware date helpers. All "today" calculations resolve against Asia/Kolkata
// so age/date logic is consistent regardless of the device's local timezone.
const IST_TIME_ZONE = 'Asia/Kolkata'

interface DateParts {
  year: number
  month: number
  day: number
}

function getISTTodayParts(): DateParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const map: Record<string, string> = {}
  for (const p of parts) map[p.type] = p.value

  return { year: Number(map.year), month: Number(map.month), day: Number(map.day) }
}

function parseDobParts(dateOfBirth: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateOfBirth)
  if (!match) return null
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
}

/** Age in whole years, computed against the current IST date. Returns null for invalid/empty input. */
export function calculateAge(dateOfBirth: string | null | undefined): number | null {
  if (!dateOfBirth) return null
  const dob = parseDobParts(dateOfBirth)
  if (!dob) return null

  const today = getISTTodayParts()
  let age = today.year - dob.year
  const beforeBirthdayThisYear =
    today.month < dob.month || (today.month === dob.month && today.day < dob.day)
  if (beforeBirthdayThisYear) age--

  return age
}

/** 'YYYY-MM-DD' string for today, in IST — the latest birth date allowed for a given minimum age. */
export function getMaxDobForMinAge(minAge: number): string {
  const today = getISTTodayParts()
  const year = today.year - minAge
  return `${year}-${String(today.month).padStart(2, '0')}-${String(today.day).padStart(2, '0')}`
}

/** 'YYYY-MM-DD' string for today, in IST. */
export function getISTTodayStr(): string {
  const { year, month, day } = getISTTodayParts()
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
