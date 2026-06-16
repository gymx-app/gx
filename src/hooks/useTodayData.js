import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../lib/supabase'
import { logger } from '../lib/logger'
import { toDateStr, computePhaseAndWeek } from '../utils/programme'
import * as idbCache from '../services/idbCache'
import * as programmeService from '../services/programmeService'
import { enqueue, cancelAll, PRIORITY } from '../services/fetchQueue'

const cacheKey = {
  workout: (uid, date) => `${uid}_${date}`,
  sessions: (uid, weekStart) => `${uid}_${weekStart}`,
  exercises: (uid) => uid,
  config: (uid) => uid,
  programmeDay: (phaseId, dow) => `${phaseId}_${dow}`,
  programmeExercises: (dayId) => dayId,
  warmupItems: (programmeId) => programmeId,
  cooldownItems: (dayId) => dayId,
}

/**
 * IDB-first fetch helper. Checks cache, falls back to queue-managed network fetch.
 * Writes result to cache on success.
 */
async function cachedFetch(store, key, queueId, priority, fetchFn) {
  const cached = await idbCache.get(store, key)
  if (cached) return cached

  const result = await enqueue(queueId, priority, fetchFn)
  const data = result?.data ?? result
  if (data) idbCache.set(store, key, data)
  return data
}

export function useTodayData(dateStr, weekStartStr, weekEndStr, selectedDayLabel) {
  const { user } = useAuth()

  const [config, setConfig] = useState(null)
  const [sessions, setSessions] = useState([])
  const [logs, setLogs] = useState([])
  const [warmupLogs, setWarmupLogs] = useState([])
  const [checklistLogs, setChecklistLogs] = useState([])
  const [exerciseMap, setExerciseMap] = useState({})
  const [previousBests, setPreviousBests] = useState({})

  const [programme, setProgramme] = useState(null)
  const [phases, setPhases] = useState([])
  const [dayData, setDayData] = useState(null)
  const [programmeExercises, setProgrammeExercises] = useState(null)
  const [warmupItems, setWarmupItems] = useState(null)
  const [cooldownItems, setCooldownItems] = useState(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hasCachedData, setHasCachedData] = useState(false)

  const snapshotRef = useRef('')
  const prefetchedRef = useRef(new Set())
  const isFirstMount = useRef(true)

  // ── STEP 1: Load from IDB cache (instant) ──
  const loadFromCache = useCallback(async () => {
    if (!user?.id || !dateStr) return false

    try {
      const [cachedDay, cachedSessions, cachedExercises, cachedConfig, cachedContext] = await Promise.all([
        idbCache.get('workout-data', cacheKey.workout(user.id, dateStr)),
        idbCache.get('week-sessions', cacheKey.sessions(user.id, weekStartStr)),
        idbCache.get('exercises', cacheKey.exercises(user.id)),
        idbCache.get('programme-config', cacheKey.config(user.id)),
        idbCache.get('programme-context', user.id),
      ])

      if (cachedDay && cachedConfig) {
        setLogs(cachedDay.logs || [])
        setWarmupLogs(cachedDay.warmupLogs || [])
        setChecklistLogs(cachedDay.checklistLogs || [])
        setPreviousBests(cachedDay.previousBests || {})

        if (cachedSessions) setSessions(cachedSessions)
        if (cachedExercises) setExerciseMap(cachedExercises)
        setConfig(cachedConfig)

        // Restore programme structure from cache
        if (cachedContext?.programme && cachedContext?.phases?.length > 0 && selectedDayLabel) {
          setProgramme(cachedContext.programme)
          setPhases(cachedContext.phases)

          const phaseInfo = computePhaseAndWeek(cachedSessions || [], {
            start_date: cachedConfig.start_date,
            phase_weeks: cachedConfig.phase_weeks,
            min_active_days: cachedConfig.min_active_days,
          })
          const currentPhase = cachedContext.phases.find(p => p.phase_number === phaseInfo.phase)

          if (currentPhase) {
            const cachedDayData = await idbCache.get('programme-day', cacheKey.programmeDay(currentPhase.id, selectedDayLabel))
            if (cachedDayData) {
              setDayData(cachedDayData)

              const isWorkout = cachedDayData.workout_type === 'workout'
              const [cachedProgExercises, cachedWarmup, cachedCooldown] = await Promise.all([
                isWorkout ? idbCache.get('programme-exercises', cacheKey.programmeExercises(cachedDayData.id)) : null,
                idbCache.get('warmup-items', cacheKey.warmupItems(cachedContext.programme.id)),
                isWorkout && cachedDayData.id ? idbCache.get('cooldown-items', cacheKey.cooldownItems(cachedDayData.id)) : null,
              ])

              if (cachedProgExercises) setProgrammeExercises(cachedProgExercises)
              if (cachedWarmup) setWarmupItems(cachedWarmup)
              if (cachedCooldown) setCooldownItems(cachedCooldown)
            }
          }
        }

        setHasCachedData(true)
        setLoading(false)
        return true
      }
    } catch {
      // Cache read failure — fall through to network
    }

    return false
  }, [user?.id, dateStr, weekStartStr, selectedDayLabel])

  // ── STEP 2: Priority-queued network fetch ──
  const fetchFromNetwork = useCallback(async () => {
    if (!user?.id || !dateStr) return

    try {
      setError(null)

      const monthAgo = new Date(dateStr + 'T00:00:00')
      monthAgo.setDate(monthAgo.getDate() - 30)

      // ── P0 CRITICAL: config + programme context (blocks render) ──
      const [cfgRes, ctxRes] = await Promise.all([
        enqueue(`config_${user.id}`, PRIORITY.CRITICAL, () =>
          supabase.from('programme_config').select('*').eq('user_id', user.id).single()
        ),
        enqueue(`ctx_${user.id}`, PRIORITY.CRITICAL, () =>
          programmeService.getFullProgrammeContext(user.id)
        ),
      ])

      if (cfgRes.error) throw cfgRes.error

      const freshConfig = cfgRes.data
      const freshProgramme = ctxRes.data?.programme || null
      const freshPhases = ctxRes.data?.phases || []

      // ── P0 CRITICAL: day logs (blocks render) ──
      const [logsRes, warmupLogsRes, checklistLogsRes] = await Promise.all([
        enqueue(`logs_${dateStr}`, PRIORITY.CRITICAL, () =>
          supabase.from('exercise_logs').select('*').eq('user_id', user.id).eq('date', dateStr)
        ),
        enqueue(`wulogs_${dateStr}`, PRIORITY.CRITICAL, () =>
          supabase.from('warmup_logs').select('*').eq('user_id', user.id).eq('date', dateStr)
        ),
        enqueue(`cklogs_${dateStr}`, PRIORITY.CRITICAL, () =>
          supabase.from('checklist_logs').select('*').eq('user_id', user.id).eq('date', dateStr)
        ),
      ])

      const freshLogs = logsRes.data || []
      const freshWarmupLogs = warmupLogsRes.data || []
      const freshChecklistLogs = checklistLogsRes.data || []

      // ── Resolve current phase + day ──
      let freshDayData = null
      let freshProgrammeExercises = null
      let freshWarmupItems = null
      let freshCooldownItems = null
      let sessionsFetched = null

      if (freshProgramme && freshPhases.length > 0 && selectedDayLabel) {
        // Need sessions to compute phase — fetch at P1 since we need it here
        const sessRes = await enqueue(`sessions_${user.id}`, PRIORITY.HIGH, () =>
          supabase.from('workout_sessions')
            .select('id, date, day_of_week, phase, completed_at')
            .eq('user_id', user.id)
            .order('date', { ascending: false })
            .limit(200)
        )
        sessionsFetched = sessRes.data || []
        const freshSessions = sessionsFetched

        const phaseInfo = computePhaseAndWeek(freshSessions, {
          start_date: freshConfig.start_date,
          phase_weeks: freshConfig.phase_weeks,
          min_active_days: freshConfig.min_active_days,
        })
        const currentPhase = freshPhases.find(p => p.phase_number === phaseInfo.phase)

        if (currentPhase) {
          // ── P1 HIGH: day data ──
          const dayKey = cacheKey.programmeDay(currentPhase.id, selectedDayLabel)
          freshDayData = await cachedFetch(
            'programme-day', dayKey,
            `day_${currentPhase.id}_${selectedDayLabel}`, PRIORITY.HIGH,
            () => programmeService.getProgrammeDay(currentPhase.id, selectedDayLabel)
          )

          if (freshDayData) {
            const isWorkout = freshDayData.workout_type === 'workout'

            // ── P1 HIGH: exercises, warmup, cooldown ──
            const [exResult, wuResult, cdResult] = await Promise.all([
              isWorkout
                ? cachedFetch(
                    'programme-exercises', cacheKey.programmeExercises(freshDayData.id),
                    `progex_${freshDayData.id}`, PRIORITY.HIGH,
                    () => programmeService.getProgrammeDayExercises(freshDayData.id)
                  )
                : null,
              cachedFetch(
                'warmup-items', cacheKey.warmupItems(freshProgramme.id),
                `warmup_${freshProgramme.id}`, PRIORITY.HIGH,
                () => programmeService.getWarmupItems(freshProgramme.id)
              ),
              isWorkout && freshDayData.id
                ? cachedFetch(
                    'cooldown-items', cacheKey.cooldownItems(freshDayData.id),
                    `cooldown_${freshDayData.id}`, PRIORITY.HIGH,
                    () => programmeService.getCooldownItems(freshDayData.id)
                  )
                : null,
            ])

            freshProgrammeExercises = exResult
            freshWarmupItems = wuResult
            freshCooldownItems = cdResult
          }
        }

        // Write sessions to cache and state (fetched above at P1)
        idbCache.set('week-sessions', cacheKey.sessions(user.id, weekStartStr), freshSessions)
        setSessions(freshSessions)
      }

      // ── P1 HIGH: exercise name→id map ──
      const exRes = await enqueue(`exercises_${user.id}`, PRIORITY.HIGH, () =>
        supabase.from('exercises').select('id, name')
      )
      const freshExMap = {}
      for (const row of (exRes.data || [])) {
        freshExMap[row.name] = row.id
      }

      // ── P2 NORMAL: previous bests (+ sessions if not already fetched at P1) ──
      const fetchPromises = [
        enqueue(`bests_${user.id}_${dateStr}`, PRIORITY.NORMAL, () =>
          supabase.from('exercise_logs')
            .select('exercise_name, weight_kg, reps, date')
            .eq('user_id', user.id)
            .eq('completed', true)
            .eq('is_mm_set', false)
            .gte('date', toDateStr(monthAgo))
            .lt('date', dateStr)
            .order('date', { ascending: false })
        ),
      ]
      if (!sessionsFetched) {
        fetchPromises.push(
          enqueue(`sessions_${user.id}`, PRIORITY.NORMAL, () =>
            supabase.from('workout_sessions')
              .select('id, date, day_of_week, phase, completed_at')
              .eq('user_id', user.id)
              .order('date', { ascending: false })
              .limit(200)
          )
        )
      }

      const fetchResults = await Promise.all(fetchPromises)
      const prevRes = fetchResults[0]

      const freshBests = {}
      for (const log of (prevRes.data || [])) {
        if (!freshBests[log.exercise_name]) {
          freshBests[log.exercise_name] = { weight_kg: log.weight_kg, reps: log.reps }
        }
      }

      const freshSessions = sessionsFetched || (fetchResults[1]?.data || [])

      // ── Write to IDB cache (non-blocking) ──
      const dayPayload = {
        logs: freshLogs,
        warmupLogs: freshWarmupLogs,
        checklistLogs: freshChecklistLogs,
        previousBests: freshBests,
      }
      idbCache.set('workout-data', cacheKey.workout(user.id, dateStr), dayPayload)
      idbCache.set('week-sessions', cacheKey.sessions(user.id, weekStartStr), freshSessions)
      idbCache.set('exercises', cacheKey.exercises(user.id), freshExMap)
      idbCache.set('programme-config', cacheKey.config(user.id), freshConfig)

      // ── Diff — only re-render if data changed ──
      const freshFingerprint = [
        freshConfig?.start_date, freshConfig?.phase_weeks,
        freshSessions.length, freshSessions[0]?.id,
        freshLogs.length, freshLogs[0]?.id, freshLogs[freshLogs.length - 1]?.id,
        freshWarmupLogs.length, freshChecklistLogs.length,
        Object.keys(freshExMap).length, Object.keys(freshBests).length,
        freshProgramme?.id, freshPhases.length,
        freshDayData?.id, freshProgrammeExercises?.length,
        freshWarmupItems?.length, freshCooldownItems?.length,
      ].join('|')

      if (freshFingerprint !== snapshotRef.current) {
        snapshotRef.current = freshFingerprint
        setConfig(freshConfig)
        setSessions(freshSessions)
        setLogs(freshLogs)
        setWarmupLogs(freshWarmupLogs)
        setChecklistLogs(freshChecklistLogs)
        setExerciseMap(freshExMap)
        setPreviousBests(freshBests)
        setProgramme(freshProgramme)
        setPhases(freshPhases)
        setDayData(freshDayData)
        setProgrammeExercises(freshProgrammeExercises)
        setWarmupItems(freshWarmupItems)
        setCooldownItems(freshCooldownItems)
      }

      setLoading(false)
      setHasCachedData(true)
    } catch (err) {
      if (err?.name === 'AbortError') return
      logger.error('useTodayData network error:', err)
      setError(err.message || String(err))
      setLoading(false)
    }
  }, [user?.id, dateStr, weekStartStr, selectedDayLabel])

  // ── STEP 3: P3 LOW — Prefetch adjacent days ──
  const prefetchAdjacent = useCallback(async () => {
    if (!user?.id || !dateStr) return

    const base = new Date(dateStr + 'T00:00:00')
    const tomorrow = new Date(base)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const yesterday = new Date(base)
    yesterday.setDate(yesterday.getDate() - 1)

    for (const d of [toDateStr(tomorrow), toDateStr(yesterday)]) {
      const k = cacheKey.workout(user.id, d)
      if (prefetchedRef.current.has(k)) continue

      const existing = await idbCache.get('workout-data', k)
      if (existing) {
        prefetchedRef.current.add(k)
        continue
      }

      try {
        const [logsRes, warmupRes, checklistRes] = await Promise.all([
          enqueue(`pflog_${d}`, PRIORITY.LOW, () =>
            supabase.from('exercise_logs').select('*').eq('user_id', user.id).eq('date', d)
          ),
          enqueue(`pfwu_${d}`, PRIORITY.LOW, () =>
            supabase.from('warmup_logs').select('*').eq('user_id', user.id).eq('date', d)
          ),
          enqueue(`pfck_${d}`, PRIORITY.LOW, () =>
            supabase.from('checklist_logs').select('*').eq('user_id', user.id).eq('date', d)
          ),
        ])

        const monthAgo = new Date(d + 'T00:00:00')
        monthAgo.setDate(monthAgo.getDate() - 30)
        const prevRes = await enqueue(`pfbest_${d}`, PRIORITY.LOW, () =>
          supabase.from('exercise_logs')
            .select('exercise_name, weight_kg, reps, date')
            .eq('user_id', user.id)
            .eq('completed', true)
            .eq('is_mm_set', false)
            .gte('date', toDateStr(monthAgo))
            .lt('date', d)
            .order('date', { ascending: false })
        )

        const bests = {}
        for (const log of (prevRes.data || [])) {
          if (!bests[log.exercise_name]) {
            bests[log.exercise_name] = { weight_kg: log.weight_kg, reps: log.reps }
          }
        }

        await idbCache.set('workout-data', k, {
          logs: logsRes.data || [],
          warmupLogs: warmupRes.data || [],
          checklistLogs: checklistRes.data || [],
          previousBests: bests,
        })
        prefetchedRef.current.add(k)
      } catch {
        // P3 prefetch failure is non-fatal
      }
    }
  }, [user?.id, dateStr])

  // ── Main effect: cache-first then network ──
  useEffect(() => {
    let cancelled = false

    async function load() {
      snapshotRef.current = ''

      if (isFirstMount.current) {
        const hasCache = await loadFromCache()
        isFirstMount.current = false
        if (!hasCache) {
          setLoading(true)
        }
      } else {
        setLoading(true)
        await loadFromCache()
      }

      if (!cancelled) {
        await fetchFromNetwork()
      }

      if (!cancelled) {
        setTimeout(() => {
          if (!cancelled) prefetchAdjacent()
        }, 2000)
      }
    }

    load()

    return () => {
      cancelled = true
      cancelAll()
    }
  }, [loadFromCache, fetchFromNetwork, prefetchAdjacent])

  // ── Public refetch (after writes) ──
  const refetch = useCallback(async () => {
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
    programme,
    phases,
    dayData,
    programmeExercises,
    warmupItems,
    cooldownItems,
    loading,
    hasCachedData,
    error,
    refetch,
  }
}
