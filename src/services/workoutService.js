import { supabase } from '../lib/supabase'
import { logger } from '../lib/logger'
import * as idbCache from './idbCache'

/**
 * Get exercise logs for a user on a specific date.
 * @param {string} userId
 * @param {string} date - YYYY-MM-DD
 * @returns {Promise<{ data: Array|null, error: string|null }>}
 */
export async function getExerciseLogs(userId, date) {
  try {
    const { data, error } = await supabase
      .from('exercise_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
    if (error) throw error
    return { data: data || [], error: null }
  } catch (err) {
    logger.error('getExerciseLogs:', err)
    return { data: null, error: 'Failed to load exercise logs' }
  }
}

/**
 * Upsert an exercise log entry.
 * Invalidates IDB cache for that day after successful write.
 * @param {string} userId
 * @param {object} logData
 * @returns {Promise<{ data: object|null, error: string|null }>}
 */
export async function upsertExerciseLog(userId, logData) {
  try {
    const { data, error } = await supabase
      .from('exercise_logs')
      .upsert(
        { user_id: userId, ...logData },
        {
          onConflict: 'user_id,date,exercise_id,set_number,is_mm_set',
        }
      )
      .select()
      .single()
    if (error) throw error

    // Invalidate day cache so next revalidation fetches fresh
    if (logData.date) {
      void idbCache.invalidate('workout-data', `${userId}_${logData.date}`)
    }

    return { data, error: null }
  } catch (err) {
    logger.error('upsertExerciseLog:', err)
    return { data: null, error: 'Failed to save set. Tap to retry.' }
  }
}

/**
 * Get or create a workout session for a date.
 * @param {string} userId
 * @param {object} sessionData - { date, phase, day_of_week, workout_title }
 * @returns {Promise<{ data: object|null, error: string|null }>}
 */
export async function upsertWorkoutSession(userId, sessionData) {
  try {
    const { data, error } = await supabase
      .from('workout_sessions')
      .upsert(
        { user_id: userId, ...sessionData },
        {
          onConflict: 'user_id,date,day_of_week',
        }
      )
      .select('id')
      .single()
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    logger.error('upsertWorkoutSession:', err)
    return { data: null, error: 'Failed to create session' }
  }
}

/**
 * Get the most recently tested baseline working weight for an exercise.
 * @param {string} userId
 * @param {string} exerciseId
 * @returns {Promise<number|null>}
 */
export async function getBaselineWeight(userId, exerciseId) {
  try {
    const { data, error } = await supabase
      .from('strength_baselines')
      .select('working_weight_kg')
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId)
      .order('tested_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return data?.working_weight_kg ?? null
  } catch (err) {
    logger.error('getBaselineWeight:', err)
    return null
  }
}

/**
 * Get previous bests for all exercises within a date range.
 * @param {string} userId
 * @param {string} fromDate - YYYY-MM-DD
 * @param {string} beforeDate - YYYY-MM-DD (exclusive)
 * @returns {Promise<{ data: object|null, error: string|null }>}
 */
export async function getPreviousBests(userId, fromDate, beforeDate) {
  try {
    const { data, error } = await supabase
      .from('exercise_logs')
      .select('exercise_name, weight_kg, reps, date')
      .eq('user_id', userId)
      .eq('completed', true)
      .eq('is_mm_set', false)
      .gte('date', fromDate)
      .lt('date', beforeDate)
      .order('date', { ascending: false })
    if (error) throw error

    const bests = {}
    for (const log of data ?? []) {
      bests[log.exercise_name] ??= { weight_kg: log.weight_kg, reps: log.reps }
    }
    return { data: bests, error: null }
  } catch (err) {
    logger.error('getPreviousBests:', err)
    return { data: null, error: 'Failed to load previous bests' }
  }
}
