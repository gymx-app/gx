// Translates the structured match reasons Odin returns (describeSubstitutionMatch
// in agent-odin — e.g. "same substitution group", "shared movement pattern: horizontal_push",
// "shared primary muscle: quadriceps, glutes") into short, plain-English phrases for
// display. Display-layer only — the underlying reasons/matching logic is untouched.

const MUSCLE_REGION_MAP: Record<string, string> = {
  quadriceps: 'legs',
  hamstrings: 'legs',
  glutes: 'legs',
  calves: 'legs',
  adductors: 'legs',
  abductors: 'legs',
  hip_flexors: 'legs',
  chest: 'chest',
  pectorals: 'chest',
  back: 'back',
  lats: 'back',
  traps: 'back',
  rhomboids: 'back',
  lower_back: 'back',
  upper_back: 'back',
  biceps: 'arms',
  triceps: 'arms',
  forearms: 'arms',
  shoulders: 'shoulders',
  deltoids: 'shoulders',
  front_delts: 'shoulders',
  rear_delts: 'shoulders',
  side_delts: 'shoulders',
  rotator_cuff: 'shoulders',
  abs: 'core',
  core: 'core',
  obliques: 'core',
  neck: 'neck',
}

function humanizeSlug(slug: string): string {
  return slug.replace(/_/g, ' ').trim()
}

function regionFor(muscle: string): string {
  return MUSCLE_REGION_MAP[muscle] ?? humanizeSlug(muscle)
}

function joinWithAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

const SAME_GROUP_REASON = 'same substitution group'
const MOVEMENT_PATTERN_PREFIX = 'shared movement pattern:'
const PRIMARY_MUSCLE_PREFIX = 'shared primary muscle:'

/**
 * Converts Odin's raw match reasons into up to 2 short, plain-English phrases.
 *
 * Mapping table:
 *   "same substitution group" (or a shared movement pattern, e.g.
 *   "shared movement pattern: horizontal_push") -> "Works the same muscles
 *   in a similar way"
 *
 *   "shared primary muscle: <slug list>" -> muscle slugs are mapped to a
 *   body region (quadriceps/hamstrings/glutes/... -> "legs", chest/pectorals
 *   -> "chest", back/lats/traps/rhomboids -> "back", biceps/triceps/forearms
 *   -> "arms", shoulders/deltoids -> "shoulders", abs/core/obliques ->
 *   "core") -> "Targets your <region[, region...] and region> the same way"
 *   (an unrecognized slug falls back to a humanized version of itself,
 *   e.g. "some_new_tag" -> "some new tag", rather than being dropped)
 *
 *   No fallback material other than the above is currently produced by
 *   the API (there is no equipment-based reason today), so no equipment
 *   phrase is generated here — see the accompanying note.
 *
 *   If neither of the above matched anything recognizable, falls back to
 *   a single generic phrase so the option never shows blank rationale.
 */
export function humanizeSwapReasons(reasons: string[]): string[] {
  const phrases: string[] = []

  const sameGroup = reasons.includes(SAME_GROUP_REASON)
  const patternReason = reasons.find((r) => r.startsWith(MOVEMENT_PATTERN_PREFIX))
  const patternList = patternReason?.slice(MOVEMENT_PATTERN_PREFIX.length).trim() ?? ''
  const hasPatternOverlap = patternList.length > 0

  if (sameGroup || hasPatternOverlap) {
    phrases.push('Works the same muscles in a similar way')
  }

  const muscleReason = reasons.find((r) => r.startsWith(PRIMARY_MUSCLE_PREFIX))
  if (muscleReason) {
    const muscles = muscleReason
      .slice(PRIMARY_MUSCLE_PREFIX.length)
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean)
    // Sorted so two options with the same regions in a different order
    // (Odin doesn't guarantee muscle-list order) produce the identical
    // phrase — otherwise "back, upper_back" vs "upper_back, back" would
    // read as different rationale and defeat same-rationale consolidation.
    const regions = [...new Set(muscles.map(regionFor))].sort()
    if (regions.length > 0) {
      phrases.push(`Targets your ${joinWithAnd(regions)} the same way`)
    }
  }

  if (phrases.length === 0) {
    phrases.push('A close alternative for this exercise')
  }

  return phrases.slice(0, 2)
}

/**
 * When every option's rationale collapses to the same phrase (common —
 * options are frequently all from the same substitution_group), repeating
 * it on every card is redundant. Returns that shared phrase so the caller
 * can show it once instead, or null if there's more than one distinct
 * rationale (or fewer than 2 options, where "shared" isn't meaningful).
 */
export function getSharedRationale(rationales: string[]): string | null {
  if (rationales.length < 2) return null
  return rationales.every((r) => r === rationales[0]) ? (rationales[0] ?? null) : null
}
