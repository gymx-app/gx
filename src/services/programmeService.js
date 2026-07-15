import { supabase } from '../lib/supabase'
import { logger } from '../lib/logger'
import * as idbCache from './idbCache'

// ─────────────────────────────────────────────────
// Legacy: programme_config (kept for backward compat)
// ─────────────────────────────────────────────────

/**
 * Get programme config for a user.
 * @param {string} userId
 * @returns {Promise<{ data: object|null, error: string|null }>}
 */
export async function getProgrammeConfig(userId) {
  try {
    const { data, error } = await supabase
      .from('programme_config')
      .select('*')
      .eq('user_id', userId)
      .single()
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    logger.error('getProgrammeConfig:', err)
    return { data: null, error: 'Failed to load programme' }
  }
}

/**
 * Upsert programme config (start date, current phase, etc.).
 * @param {string} userId
 * @param {object} configData
 * @returns {Promise<{ data: object|null, error: string|null }>}
 */
export async function upsertProgrammeConfig(userId, configData) {
  try {
    const { data, error } = await supabase
      .from('programme_config')
      .upsert(
        { user_id: userId, ...configData },
        {
          onConflict: 'user_id',
        }
      )
      .select()
      .single()
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    logger.error('upsertProgrammeConfig:', err)
    return { data: null, error: 'Failed to save programme config' }
  }
}

// ─────────────────────────────────────────────────
// New: Programme structure queries
// ─────────────────────────────────────────────────

/**
 * Get the active programme for a user.
 * @param {string} userId
 * @returns {Promise<{ data: object|null, error: string|null }>}
 */
export async function getActiveProgramme(userId) {
  try {
    const { data, error } = await supabase
      .from('programmes')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
    if (error) throw error
    if (data && data.user_id !== userId) return { data: null, error: null }
    return { data: data ?? null, error: null }
  } catch (err) {
    logger.error('getActiveProgramme:', err)
    return { data: null, error: 'Failed to load programme' }
  }
}

/**
 * Get all phases for a programme, ordered by phase_number.
 * @param {string} programmeId
 * @returns {Promise<{ data: Array|null, error: string|null }>}
 */
export async function getProgrammePhases(programmeId) {
  try {
    const { data, error } = await supabase
      .from('programme_phases')
      .select('*')
      .eq('programme_id', programmeId)
      .order('phase_number', { ascending: true })
    if (error) throw error
    return { data: data || [], error: null }
  } catch (err) {
    logger.error('getProgrammePhases:', err)
    return { data: null, error: 'Failed to load phases' }
  }
}

/**
 * Get a single programme day by phase + day of week.
 * @param {string} phaseId
 * @param {string} dayOfWeek - 'MON', 'TUE', etc.
 * @returns {Promise<{ data: object|null, error: string|null }>}
 */
export async function getProgrammeDay(phaseId, dayOfWeek) {
  try {
    const { data, error } = await supabase
      .from('programme_days')
      .select('*')
      .eq('phase_id', phaseId)
      .eq('day_of_week', dayOfWeek)
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    logger.error('getProgrammeDay:', err)
    return { data: null, error: 'Failed to load day data' }
  }
}

/**
 * Get exercises for a programme day, joined with exercise details.
 * @param {string} dayId
 * @returns {Promise<{ data: Array|null, error: string|null }>}
 */
export async function getProgrammeDayExercises(dayId) {
  try {
    const { data, error } = await supabase
      .from('programme_exercises')
      .select(
        `
        *,
        exercises:exercise_id (
          name,
          gif_url,
          equipment,
          body_part,
          target_muscle
        )
      `
      )
      .eq('day_id', dayId)
      .order('display_order', { ascending: true })
    if (error) throw error
    return { data: data || [], error: null }
  } catch (err) {
    logger.error('getProgrammeDayExercises:', err)
    return { data: null, error: 'Failed to load exercises' }
  }
}

/**
 * Update the exercise on a single programme_exercises row (e.g. after a
 * validated swap) and return the row re-joined with exercise details, so
 * callers can splice it straight into local state without a second fetch.
 * @param {string} prescriptionId - programme_exercises.id
 * @param {string} exerciseId - exercises.id (gx UUID) to swap in
 * @returns {Promise<{ data: object|null, error: string|null }>}
 */
export async function updateProgrammeExerciseId(prescriptionId, exerciseId) {
  try {
    const { data, error } = await supabase
      .from('programme_exercises')
      .update({ exercise_id: exerciseId })
      .eq('id', prescriptionId)
      .select(
        `
        *,
        exercises:exercise_id (
          name,
          gif_url,
          equipment,
          body_part,
          target_muscle
        )
      `
      )
      .single()
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    logger.error('updateProgrammeExerciseId:', err)
    return { data: null, error: 'Failed to save the swap' }
  }
}

/**
 * Apply a next-prescription result to a programme_exercises row: rewrites
 * the reps portion of sets_reps (e.g. "3×8" -> "3×9") and, when Odin says
 * to increase load, sets a warn badge telling the athlete to bump weight
 * and reset reps to the bottom of the range next time. Reuses the existing
 * sets_reps/warn fields instead of adding progression-state columns — the
 * row already recurs weekly within a phase, so this is picked up automatically.
 * @param {string} prescriptionId - programme_exercises.id
 * @param {string} currentSetsReps - existing sets_reps string, e.g. "3×8"
 * @param {{ next_target_reps: number, increase_load: boolean }} result
 * @returns {Promise<{ data: object|null, error: string|null }>}
 */
export async function applyNextPrescription(prescriptionId, currentSetsReps, result) {
  try {
    const setCount = parseInt(currentSetsReps?.split('×')[0], 10) || 1
    const update = {
      sets_reps: `${setCount}×${result.next_target_reps}`,
      warn: result.increase_load ? 'Increase load this session' : null,
    }
    const { data, error } = await supabase
      .from('programme_exercises')
      .update(update)
      .eq('id', prescriptionId)
      .select()
      .single()
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    logger.error('applyNextPrescription:', err)
    return { data: null, error: 'Failed to save progression' }
  }
}

/**
 * Get the last N completed sessions with their logged sets, oldest first,
 * for the readiness-check endpoint (which needs 2+ recent sessions).
 * @param {string} userId
 * @param {number} limit
 * @returns {Promise<{ data: Array|null, error: string|null }>}
 */
export async function getRecentCompletedSessionsWithLogs(userId, limit = 3) {
  try {
    const { data: sessions, error: sErr } = await supabase
      .from('workout_sessions')
      .select('id, date, phase, day_of_week')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .order('date', { ascending: false })
      .limit(limit)
    if (sErr) throw sErr
    if (!sessions || sessions.length === 0) return { data: [], error: null }

    const { data: logs, error: lErr } = await supabase
      .from('exercise_logs')
      .select('session_id, exercise_index, set_number, reps, rpe, completed, is_mm_set')
      .in(
        'session_id',
        sessions.map((s) => s.id)
      )
    if (lErr) throw lErr

    const logsBySession = {}
    for (const log of logs ?? []) {
      logsBySession[log.session_id] ??= []
      logsBySession[log.session_id].push(log)
    }

    return {
      data: sessions
        .slice()
        .reverse()
        .map((s) => ({ ...s, logs: logsBySession[s.id] ?? [] })),
      error: null,
    }
  } catch (err) {
    logger.error('getRecentCompletedSessionsWithLogs:', err)
    return { data: null, error: 'Failed to load session history' }
  }
}

/**
 * Persist a readiness-check result onto the programme so the upcoming week
 * can pick up the deload adjustment instead of waiting for the pre-scheduled
 * phase-transition deload.
 * @param {string} programmeId
 * @param {{ triggered_reasons: string[], deload_adjustments: object } | null} result - null clears it
 * @returns {Promise<{ data: object|null, error: string|null }>}
 */
export async function setPendingDeload(programmeId, result) {
  try {
    const pending_deload = result
      ? {
          reasons: result.triggered_reasons,
          adjustments: result.deload_adjustments,
          checked_at: new Date().toISOString(),
        }
      : null
    const { data, error } = await supabase
      .from('programmes')
      .update({ pending_deload })
      .eq('id', programmeId)
      .select()
      .single()
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    logger.error('setPendingDeload:', err)
    return { data: null, error: 'Failed to save readiness check' }
  }
}

/**
 * Get warmup items for a programme day.
 * @param {string} dayId
 * @returns {Promise<{ data: Array|null, error: string|null }>}
 */
export async function getWarmupItems(dayId) {
  try {
    const { data, error } = await supabase
      .from('warmup_items')
      .select('*')
      .eq('day_id', dayId)
      .order('display_order', { ascending: true })
    if (error) throw error
    return { data: data || [], error: null }
  } catch (err) {
    logger.error('getWarmupItems:', err)
    return { data: null, error: 'Failed to load warmup items' }
  }
}

/**
 * Get cooldown items for a programme day.
 * @param {string} dayId
 * @returns {Promise<{ data: Array|null, error: string|null }>}
 */
export async function getCooldownItems(dayId) {
  try {
    const { data, error } = await supabase
      .from('cooldown_items')
      .select('*')
      .eq('day_id', dayId)
      .order('display_order', { ascending: true })
    if (error) throw error
    return { data: data || [], error: null }
  } catch (err) {
    logger.error('getCooldownItems:', err)
    return { data: null, error: 'Failed to load cooldown items' }
  }
}

/**
 * Get conditioning items for a programme day.
 * @param {string} dayId
 * @returns {Promise<{ data: Array|null, error: string|null }>}
 */
export async function getConditioningItems(dayId) {
  try {
    const { data, error } = await supabase
      .from('conditioning_items')
      .select('*')
      .eq('day_id', dayId)
      .order('display_order', { ascending: true })
    if (error) throw error
    return { data: data || [], error: null }
  } catch (err) {
    logger.error('getConditioningItems:', err)
    return { data: null, error: 'Failed to load conditioning items' }
  }
}

/**
 * Get full programme context — programme + phases.
 * Cached in IDB under 'programme-context', TTL 30 minutes.
 * @param {string} userId
 * @returns {Promise<{ data: { programme: object, phases: Array }|null, error: string|null }>}
 */
/**
 * Get all days for a phase, ordered MON→SUN.
 * @param {string} phaseId
 * @returns {Promise<{ data: Array|null, error: string|null }>}
 */
export async function getProgrammeDays(phaseId) {
  const DAY_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
  try {
    const { data, error } = await supabase
      .from('programme_days')
      .select('id, day_of_week, workout_type, title, duration_min')
      .eq('phase_id', phaseId)
    if (error) throw error
    const sorted = (data ?? []).sort(
      (a, b) => DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week)
    )
    return { data: sorted, error: null }
  } catch (err) {
    logger.error('getProgrammeDays:', err)
    return { data: null, error: 'Failed to load days' }
  }
}

export async function getFullProgrammeContext(userId) {
  try {
    // Check IDB cache first
    const cached = await idbCache.get('programme-context', userId)
    if (cached) return { data: cached, error: null }

    // Fetch programme
    const { data: programme, error: pErr } = await getActiveProgramme(userId)
    if (pErr) {
      return { data: null, error: pErr }
    }
    if (!programme) {
      return { data: { programme: null, phases: [] }, error: null }
    }

    // Fetch phases
    const { data: phases, error: phErr } = await getProgrammePhases(programme.id)
    if (phErr) {
      return { data: null, error: phErr }
    }

    const result = { programme, phases }

    // Cache (fire-and-forget)
    void idbCache.set('programme-context', userId, result)

    return { data: result, error: null }
  } catch (err) {
    logger.error('getFullProgrammeContext:', err)
    return { data: null, error: 'Failed to load programme context' }
  }
}
