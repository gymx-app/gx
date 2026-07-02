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

// The onboarding wizard stores free-text display labels in user_health
// (lifestyle, occupation, medical_conditions) rather than Odin's enum values —
// these maps translate label -> enum so the athlete payload validates against
// Odin's strict Zod schemas (LifestyleTagSchema / OccupationSchema /
// MedicalConditionSchema).
export const LIFESTYLE_TAG_MAP: Record<string, string> = {
  'Sedentary (desk job, minimal movement)': 'sedentary',
  'Lightly Active (walk occasionally)': 'lightly_active',
  'Moderately Active (on feet most of day)': 'moderately_active',
  'Very Active (physical work or sport regularly)': 'very_active',
  'Shift Worker (irregular hours)': 'shift_worker',
  'Frequently Travelling': 'frequently_travelling',
  'High Stress / Low Sleep': 'high_stress_low_sleep',
}

export const OCCUPATION_MAP: Record<string, string> = {
  Student: 'student',
  'Desk Job / Office Worker': 'desk_job',
  'Field / On-site Worker': 'field_worker',
  'Healthcare Professional': 'healthcare',
  'Athlete / Coach': 'athlete_coach',
  Homemaker: 'homemaker',
  'Business Owner / Entrepreneur': 'business_owner',
  'Creative / Freelancer': 'creative_freelancer',
  Retired: 'retired',
  Other: 'other',
}

export const MEDICAL_CONDITION_MAP: Record<string, string> = {
  Hypertension: 'hypertension',
  'Type 2 Diabetes': 'type2_diabetes',
  'Thyroid Disorder': 'thyroid_disorder',
  Asthma: 'asthma',
  'Chronic Lower Back Pain': 'chronic_lower_back_pain',
  'Chronic Knee Pain': 'chronic_knee_pain',
  'Heart Condition (doctor cleared)': 'heart_condition',
  Arthritis: 'arthritis',
  'PCOD / PCOS': 'pcod_pcos',
  Endometriosis: 'endometriosis',
  Osteoporosis: 'osteoporosis',
  'Pregnancy / Postpartum': 'pregnancy_postpartum',
  'Low Testosterone (diagnosed)': 'low_testosterone',
  Hernia: 'hernia',
}

export function mapEnumLabels(labels: string[], map: Record<string, string>): string[] {
  return labels.map((l) => map[l]).filter((v): v is string => v != null)
}

export function mapEnumLabel(
  label: string | null | undefined,
  map: Record<string, string>
): string | undefined {
  if (!label) return undefined
  return map[label]
}

export interface InBodySourceData {
  body_fat_pct: number | null
  skeletal_muscle_mass: number | null
  body_fat_mass: number | null
  bmr: number | null
  visceral_fat_area: number | null
  total_body_water: number | null
}

// Odin's InBody schema requires body_fat_pct, skeletal_muscle_mass_kg, bmr, and
// visceral_fat_area together — a partial object fails the server's strict
// validation, so we only forward it once all four are present. Optional
// fields (body_fat_mass_kg, total_body_water_kg) are included whenever known,
// independently of whether the required set is complete.
export function buildInbodyPayload(
  inbodyData: InBodySourceData | null | undefined
): Record<string, number> | null {
  if (!inbodyData) return null
  const payload: Record<string, number> = {}
  if (inbodyData.body_fat_pct != null) payload.body_fat_pct = inbodyData.body_fat_pct
  if (inbodyData.skeletal_muscle_mass != null)
    payload.skeletal_muscle_mass_kg = inbodyData.skeletal_muscle_mass
  if (inbodyData.body_fat_mass != null) payload.body_fat_mass_kg = inbodyData.body_fat_mass
  if (inbodyData.visceral_fat_area != null) payload.visceral_fat_area = inbodyData.visceral_fat_area
  if (inbodyData.total_body_water != null) payload.total_body_water_kg = inbodyData.total_body_water
  if (inbodyData.bmr != null) payload.bmr = inbodyData.bmr

  const hasRequired =
    payload.body_fat_pct != null &&
    payload.skeletal_muscle_mass_kg != null &&
    payload.bmr != null &&
    payload.visceral_fat_area != null
  return hasRequired ? payload : null
}
