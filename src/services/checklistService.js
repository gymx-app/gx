import { supabase } from '../lib/supabase'
import { logger } from '../lib/logger'
import * as idbCache from './idbCache'

/**
 * Get all checklist logs for a user on a date.
 * @param {string} userId
 * @param {string} date - YYYY-MM-DD
 * @returns {Promise<{ data: Array|null, error: string|null }>}
 */
export async function getChecklistLogs(userId, date) {
  try {
    const { data, error } = await supabase
      .from('checklist_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
    if (error) throw error
    return { data: data || [], error: null }
  } catch (err) {
    logger.error('getChecklistLogs:', err)
    return { data: null, error: 'Failed to load checklist' }
  }
}

/**
 * Upsert a checklist log entry (warmup, cooldown, LISS, finisher).
 * Invalidates IDB cache for that day after successful write.
 * @param {string} userId
 * @param {object} logData - { date, item_key, completed, notes }
 * @returns {Promise<{ data: object|null, error: string|null }>}
 */
export async function upsertChecklistLog(userId, logData) {
  try {
    const { data, error } = await supabase
      .from('checklist_logs')
      .upsert({ user_id: userId, ...logData }, {
        onConflict: 'user_id,date,item_key',
      })
      .select()
      .single()
    if (error) throw error

    // Invalidate day cache
    if (logData.date) {
      idbCache.invalidate('workout-data', `${userId}_${logData.date}`)
    }

    return { data, error: null }
  } catch (err) {
    logger.error('upsertChecklistLog:', err)
    return { data: null, error: 'Failed to save checklist entry' }
  }
}

/**
 * Get warmup logs for a user on a date.
 * @param {string} userId
 * @param {string} date - YYYY-MM-DD
 * @returns {Promise<{ data: Array|null, error: string|null }>}
 */
export async function getWarmupLogs(userId, date) {
  try {
    const { data, error } = await supabase
      .from('warmup_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
    if (error) throw error
    return { data: data || [], error: null }
  } catch (err) {
    logger.error('getWarmupLogs:', err)
    return { data: null, error: 'Failed to load warmup logs' }
  }
}

/**
 * Upsert a warmup log entry.
 * Invalidates IDB cache for that day after successful write.
 * @param {string} userId
 * @param {object} logData - { date, item_key, completed }
 * @returns {Promise<{ data: object|null, error: string|null }>}
 */
export async function upsertWarmupLog(userId, logData) {
  try {
    const { data, error } = await supabase
      .from('warmup_logs')
      .upsert({ user_id: userId, ...logData }, {
        onConflict: 'user_id,date,item_key',
      })
      .select()
      .single()
    if (error) throw error

    // Invalidate day cache
    if (logData.date) {
      idbCache.invalidate('workout-data', `${userId}_${logData.date}`)
    }

    return { data, error: null }
  } catch (err) {
    logger.error('upsertWarmupLog:', err)
    return { data: null, error: 'Failed to save warmup log' }
  }
}
