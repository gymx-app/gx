import { resolveOdinDayNode, resolveOdinPhaseNode } from './programmeHydrator'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = any

// narratives.phases[] carries Odin's own phase_id, which hydrateProgramme never
// persists (programme_phases only keeps phase_number) — so matching falls back
// to array position (both lists come from the same odinData.programme.phases
// order) whenever phase_id isn't present on the raw Odin phase node.
export function findPhaseNarrative(
  narratives: AnyData,
  programmeData: AnyData,
  phaseIndex: number
): AnyData {
  const list: AnyData[] = narratives?.phases ?? []
  const rawPhase = resolveOdinPhaseNode(programmeData, phaseIndex)
  if (rawPhase?.phase_id) {
    const byId = list.find((n) => n.phase_id === rawPhase.phase_id)
    if (byId) return byId
  }
  return list[phaseIndex] ?? null
}

// A day's "pattern" isn't a stored field anywhere — resolved by matching the
// pattern_label text against the raw Odin day node's day_type/title, since
// that's the only descriptive text a day carries.
export function findDayPatternNarrative(
  narratives: AnyData,
  programmeData: AnyData,
  phaseIndex: number,
  dayOfWeek: string
): AnyData {
  const list: AnyData[] = narratives?.day_patterns ?? []
  if (list.length === 0) return null
  const rawDay = resolveOdinDayNode(programmeData, phaseIndex, dayOfWeek)
  if (!rawDay) return null

  const haystack = `${rawDay.day_type ?? ''} ${rawDay.title ?? ''}`.toLowerCase()
  return (
    list.find((n) => {
      const label = (n.pattern_label ?? '').toLowerCase()
      return label && (haystack.includes(label) || label.includes(rawDay.day_type ?? '__none__'))
    }) ?? null
  )
}

export function findConditioningNarrative(
  narratives: AnyData,
  programmeData: AnyData,
  phaseIndex: number,
  dayOfWeek: string
): AnyData {
  const list: AnyData[] = narratives?.conditioning_finishers ?? []
  if (list.length === 0) return null
  const rawDay = resolveOdinDayNode(programmeData, phaseIndex, dayOfWeek)
  if (!rawDay?.day_id) return null
  return list.find((n) => n.day_id === rawDay.day_id) ?? null
}

// Turns citation.referenced_by[] entries (whatever id shape Odin used —
// "overall", a phase_id, a pattern_label, or a day_id) into a readable label
// for the Evidence tab, falling back to the raw id if nothing matches.
export function describeReference(ref: string, narratives: AnyData, phases: AnyData[]): string {
  if (!narratives) return ref
  if (ref === 'overall') return 'Overview'

  const phaseIdx = (narratives.phases ?? []).findIndex((n: AnyData) => n.phase_id === ref)
  if (phaseIdx !== -1) return phases[phaseIdx]?.name ?? `Phase ${phaseIdx + 1}`

  const pattern = (narratives.day_patterns ?? []).find((n: AnyData) => n.pattern_label === ref)
  if (pattern) return pattern.pattern_label

  const finisher = (narratives.conditioning_finishers ?? []).find((n: AnyData) => n.day_id === ref)
  if (finisher) return 'Conditioning'

  return ref
}
