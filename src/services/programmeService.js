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
 * Get warmup items for a programme.
 * @param {string} programmeId
 * @returns {Promise<{ data: Array|null, error: string|null }>}
 */
export async function getWarmupItems(programmeId) {
  try {
    const { data, error } = await supabase
      .from('warmup_items')
      .select('*')
      .eq('programme_id', programmeId)
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
