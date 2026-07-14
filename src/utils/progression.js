// Builds the `completed_sets` array next-prescription/readiness-check expect,
// by matching logged sets to the Odin-prescribed set (by set_number) that
// they were performed against. Only working sets that were actually
// completed with an RPE captured are included — myo-match sets and sets
// missing an RPE can't be echoed back, so they're silently dropped rather
// than sent with a made-up value.
export function buildCompletedSets(logs, odinSets) {
  const bySetNumber = new Map(odinSets.map((s) => [s.set_number, s]))
  const completedSets = []
  for (const log of logs) {
    if (!log.completed || log.is_mm_set || log.rpe == null || log.reps == null) continue
    const prescribed = bySetNumber.get(log.set_number)
    if (!prescribed) continue
    completedSets.push({
      target_reps: prescribed.target_reps,
      rpe_ceiling: prescribed.rpe_ceiling,
      reps_achieved: log.reps,
      rpe_reported: log.rpe,
    })
  }
  return completedSets
}

// programme_days/programme_exercises rows recur weekly within a phase (one
// row per day-of-week, no per-week table) — so a deload can't be applied by
// mutating those rows without deloading every remaining week of the phase.
// Instead it's applied at read time, gated to a 7-day window from when
// readiness-check flagged it, so it naturally stops applying once the
// "upcoming week" has passed without needing a revert step.
const DELOAD_WINDOW_DAYS = 7

export function isDeloadActive(pendingDeload, dateStr) {
  if (!pendingDeload?.checked_at) return false
  // Compare as plain YYYY-MM-DD strings (matches how dateStr is used
  // elsewhere in Today.jsx, e.g. isFutureDate) so this doesn't drift a day
  // depending on the browser's timezone vs. the UTC checked_at timestamp.
  const checkedAtDay = pendingDeload.checked_at.slice(0, 10)
  const windowEnd = new Date(checkedAtDay + 'T00:00:00Z')
  windowEnd.setUTCDate(windowEnd.getUTCDate() + DELOAD_WINDOW_DAYS)
  const windowEndDay = windowEnd.toISOString().slice(0, 10)
  return dateStr >= checkedAtDay && dateStr < windowEndDay
}

// volume_factor scales set count — the only prescription field gx can safely
// adjust client-side. intensity_factor/effort_factor would need a load or
// RPE-ceiling field gx doesn't track per exercise prescription; add that
// scaling once load tracking exists at the programme level.
export function applyVolumeFactor(setsReps, volumeFactor) {
  const [setsPart, repsPart] = (setsReps ?? '3×12').split('×')
  const sets = Math.max(1, Math.round((parseInt(setsPart, 10) || 1) * (volumeFactor ?? 1)))
  return `${sets}×${repsPart}`
}

// conditioning_items does carry duration_min/target_rpe, so conditioning_factor
// and effort_factor can scale those directly.
export function applyConditioningDeload(items, adjustments) {
  return items.map((item) => ({
    ...item,
    duration_min: adjustments.conditioning_factor
      ? Math.max(1, Math.round(item.duration_min * adjustments.conditioning_factor))
      : item.duration_min,
    target_rpe:
      adjustments.effort_factor && item.target_rpe
        ? Math.max(1, Math.round(item.target_rpe * adjustments.effort_factor))
        : item.target_rpe,
  }))
}
