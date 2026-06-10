import { supabase } from '../lib/supabase'
import { logger } from '../lib/logger'

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
      .upsert({ user_id: userId, ...configData }, {
        onConflict: 'user_id',
      })
      .select()
      .single()
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    logger.error('upsertProgrammeConfig:', err)
    return { data: null, error: 'Failed to save programme config' }
  }
}
