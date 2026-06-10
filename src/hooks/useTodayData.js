import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../lib/supabase'
import { logger } from '../lib/logger'
import { toDateStr } from '../utils/programme'
import * as idbCache from '../services/idbCache'

/**
 * Cache key helpers — all scoped to userId.
 */
const cacheKey = {
  workout: (uid, date) => `${uid}_${date}`,
  sessions: (uid, weekStart) => `${uid}_${weekStart}`,
  exercises: () => 'global',
  config: (uid) => uid,
}

/**
 * Fetch all data for a single day from Supabase (no cache interaction).
 * Used for both main load and background prefetch.
 */
async function fetchDayData(userId, dateStr) {
  const [logsRes, warmupRes, checklistRes] = await Promise.all([
    supabase.from('exercise_logs').select('*').eq('user_id', userId).eq('date', dateStr),
    supabase.from('warmup_logs').select('*').eq('user_id', userId).eq('date', dateStr),
    supabase.from('checklist_logs').select('*').eq('user_id', userId).eq('date', dateStr),
  ])

  return {
    logs: logsRes.data || [],
    warmupLogs: warmupRes.data || [],
    checklistLogs: checklistRes.data || [],
  }
}

/**
 * Custom hook — fetches all data the Today screen needs.
 * Implements Stale-While-Revalidate (SWR) pattern with IndexedDB caching.
 *
 * Flow:
 *   1. Check IDB cache — if hit, render immediately (< 5ms)
 *   2. Fire all Supabase fetches in parallel
 *   3. Update cache with fresh data
 *   4. Update UI only if data actually changed
 *
 * @param {string} dateStr - Selected date as YYYY-MM-DD
 * @param {string} weekStartStr - Monday of the displayed week
 * @param {string} weekEndStr - Saturday of the displayed week
 */
export function useTodayData(dateStr, weekStartStr, weekEndStr) {
  const { user } = useAuth()

  const [config, setConfig] = useState(null)
  const [sessions, setSessions] = useState([])
  const [logs, setLogs] = useState([])
  const [warmupLogs, setWarmupLogs] = useState([])
  const [checklistLogs, setChecklistLogs] = useState([])
  const [exerciseMap, setExerciseMap] = useState({})
  const [previousBests, setPreviousBests] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Track whether we've shown cached data (to avoid skeleton)
  const [hasCachedData, setHasCachedData] = useState(false)

  // Track last rendered data snapshot for diffing
  const snapshotRef = useRef('')
  // Track prefetched dates to avoid repeat work
  const prefetchedRef = useRef(new Set())

  // ── STEP 1: Load from IDB cache (instant) ──
  const loadFromCache = useCallback(async () => {
    if (!user?.id || !dateStr) return false

    try {
      const [cachedDay, cachedSessions, cachedExercises, cachedConfig] = await Promise.all([
        idbCache.get('workout-data', cacheKey.workout(user.id, dateStr)),
        idbCache.get('week-sessions', cacheKey.sessions(user.id, weekStartStr)),
        idbCache.get('exercises', cacheKey.exercises()),
        idbCache.get('programme-config', cacheKey.config(user.id)),
      ])

      if (cachedDay && cachedConfig) {
        setLogs(cachedDay.logs || [])
        setWarmupLogs(cachedDay.warmupLogs || [])
        setChecklistLogs(cachedDay.checklistLogs || [])
        setPreviousBests(cachedDay.previousBests || {})

        if (cachedSessions) setSessions(cachedSessions)
        if (cachedExercises) setExerciseMap(cachedExercises)
        setConfig(cachedConfig)

        setHasCachedData(true)
        setLoading(false)
        return true // cache hit
      }
    } catch {
      // Cache read failure — fall through to network
    }

    return false // cache miss
  }, [user?.id, dateStr, weekStartStr])

  // ── STEP 2 + 3 + 4: Network fetch, cache, diff-update ──
  const fetchFromNetwork = useCallback(async () => {
    if (!user?.id || !dateStr) return

    try {
      setError(null)

      // Fire ALL fetches in parallel
      const monthAgo = new Date(dateStr + 'T00:00:00')
      monthAgo.setDate(monthAgo.getDate() - 30)

      const [
        cfgRes,
        sessRes,
        dayData,
        exRes,
        prevRes,
      ] = await Promise.all([
        supabase.from('programme_config').select('*').eq('user_id', user.id).single(),
        supabase.from('workout_sessions')
          .select('id, date, day_of_week, phase, is_travel, completed_at')
          .eq('user_id', user.id),
        fetchDayData(user.id, dateStr),
        supabase.from('exercises').select('id, name'),
        supabase.from('exercise_logs')
          .select('exercise_name, weight_kg, reps, date')
          .eq('user_id', user.id)
          .eq('completed', true)
          .eq('is_mm_set', false)
          .gte('date', toDateStr(monthAgo))
          .lt('date', dateStr)
          .order('date', { ascending: false }),
      ])

      if (cfgRes.error) throw cfgRes.error

      const freshConfig = cfgRes.data
      const freshSessions = sessRes.data || []
      const freshLogs = dayData.logs
      const freshWarmupLogs = dayData.warmupLogs
      const freshChecklistLogs = dayData.checklistLogs

      // Build exercise map
      const freshExMap = {}
      for (const row of (exRes.data || [])) {
        freshExMap[row.name] = row.id
      }

      // Build previous bests
      const freshBests = {}
      for (const log of (prevRes.data || [])) {
        if (!freshBests[log.exercise_name]) {
          freshBests[log.exercise_name] = { weight_kg: log.weight_kg, reps: log.reps }
        }
      }

      // ── STEP 3: Write to IDB cache (non-blocking) ──
      const dayPayload = {
        logs: freshLogs,
        warmupLogs: freshWarmupLogs,
        checklistLogs: freshChecklistLogs,
        previousBests: freshBests,
      }

      // Fire-and-forget cache writes
      idbCache.set('workout-data', cacheKey.workout(user.id, dateStr), dayPayload)
      idbCache.set('week-sessions', cacheKey.sessions(user.id, weekStartStr), freshSessions)
      idbCache.set('exercises', cacheKey.exercises(), freshExMap)
      idbCache.set('programme-config', cacheKey.config(user.id), freshConfig)

      // ── STEP 4: Diff — only re-render if data changed ──
      const freshSnapshot = JSON.stringify({
        config: freshConfig,
        sessions: freshSessions,
        logs: freshLogs,
        warmupLogs: freshWarmupLogs,
        checklistLogs: freshChecklistLogs,
        exerciseMap: freshExMap,
        previousBests: freshBests,
      })

      if (freshSnapshot !== snapshotRef.current) {
        snapshotRef.current = freshSnapshot
        setConfig(freshConfig)
        setSessions(freshSessions)
        setLogs(freshLogs)
        setWarmupLogs(freshWarmupLogs)
        setChecklistLogs(freshChecklistLogs)
        setExerciseMap(freshExMap)
        setPreviousBests(freshBests)
      }

      setLoading(false)
      setHasCachedData(true)
    } catch (err) {
      logger.error('useTodayData network error:', err)
      setError(err.message)
      setLoading(false)
    }
  }, [user?.id, dateStr, weekStartStr])

  // ── STEP 5: Prefetch adjacent days ──
  const prefetchAdjacent = useCallback(async () => {
    if (!user?.id || !dateStr) return

    const base = new Date(dateStr + 'T00:00:00')
    const tomorrow = new Date(base)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const yesterday = new Date(base)
    yesterday.setDate(yesterday.getDate() - 1)

    const dates = [toDateStr(tomorrow), toDateStr(yesterday)]

    for (const d of dates) {
      const k = cacheKey.workout(user.id, d)
      if (prefetchedRef.current.has(k)) continue

      // Check if already cached and fresh
      const existing = await idbCache.get('workout-data', k)
      if (existing) {
        prefetchedRef.current.add(k)
        continue
      }

      // Fetch and cache — background only, no state updates
      try {
        const dayData = await fetchDayData(user.id, d)

        // Fetch previous bests for that day too
        const monthAgo = new Date(d + 'T00:00:00')
        monthAgo.setDate(monthAgo.getDate() - 30)
        const { data: prevLogs } = await supabase
          .from('exercise_logs')
          .select('exercise_name, weight_kg, reps, date')
          .eq('user_id', user.id)
          .eq('completed', true)
          .eq('is_mm_set', false)
          .gte('date', toDateStr(monthAgo))
          .lt('date', d)
          .order('date', { ascending: false })

        const bests = {}
        for (const log of (prevLogs || [])) {
          if (!bests[log.exercise_name]) {
            bests[log.exercise_name] = { weight_kg: log.weight_kg, reps: log.reps }
          }
        }

        await idbCache.set('workout-data', k, { ...dayData, previousBests: bests })
        prefetchedRef.current.add(k)
      } catch {
        // Prefetch failure is non-fatal
      }
    }
  }, [user?.id, dateStr])

  // ── Main effect: cache-first then network ──
  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      snapshotRef.current = ''

      // Step 1: try cache
      const hit = await loadFromCache()

      // Step 2: always revalidate from network
      if (!cancelled) {
        await fetchFromNetwork()
      }

      // Step 5: prefetch neighbors after 2s
      if (!cancelled) {
        setTimeout(() => {
          if (!cancelled) prefetchAdjacent()
        }, 2000)
      }
    }

    load()

    return () => { cancelled = true }
  }, [loadFromCache, fetchFromNetwork, prefetchAdjacent])

  // ── Public refetch (after writes) ──
  const refetch = useCallback(async () => {
    // Invalidate cache for this day so next load fetches fresh
    if (user?.id) {
      await idbCache.invalidate('workout-data', cacheKey.workout(user.id, dateStr))
    }
    await fetchFromNetwork()
  }, [user?.id, dateStr, fetchFromNetwork])

  return {
    config,
    sessions,
    logs,
    warmupLogs,
    checklistLogs,
    exerciseMap,
    previousBests,
    loading,
    hasCachedData,
    error,
    refetch,
  }
}
