import { supabase } from '../lib/supabase'
import { logger } from '../lib/logger'
import * as idbCache from './idbCache'

/**
 * Sign in with email + password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ data: { user: object, session: object }|null, error: string|null }>}
 */
export async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    logger.error('signIn:', err)
    return { data: null, error: err.message || 'Sign in failed' }
  }
}

/**
 * Sign out current user.
 * Clears all personal data from IDB cache before signing out.
 * @param {string} [userId] - If provided, clears user-specific cache
 * @returns {Promise<{ data: null, error: string|null }>}
 */
export async function signOut(userId) {
  try {
    // Clear personal data from device cache
    if (userId) {
      await idbCache.invalidateUserData(userId)
    }

    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { data: null, error: null }
  } catch (err) {
    logger.error('signOut:', err)
    return { data: null, error: 'Sign out failed' }
  }
}

/**
 * Get the current session.
 * @returns {Promise<{ data: { session: object|null }, error: string|null }>}
 */
export async function getSession() {
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    logger.error('getSession:', err)
    return { data: null, error: 'Failed to restore session' }
  }
}

/**
 * Subscribe to auth state changes.
 * @param {function} callback - ({ event, session }) => void
 * @returns {{ data: { subscription: { unsubscribe: () => void } } }}
 */
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback({ event: _event, session })
  })
}
