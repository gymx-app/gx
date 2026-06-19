import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAuth } from '../auth/AuthContext'
import { logger } from '../lib/logger'
import { computePhaseAndWeek } from '../utils/programme'
import * as idbCache from '../services/idbCache'
import * as programmeService from '../services/programmeService'
import { enqueue, cancelAll, PRIORITY } from '../services/fetchQueue'
import {
  getFromCache,
  setInCache,
  fetchWeekData,
  prefetchAdjacentWeeks,
  invalidateWeekCache,
} from '../services/weekCache'

export { invalidateWeekCache }

const cacheKey = {
  programmeDay: (phaseId, dow) => `${phaseId}_${dow}`,
  programmeExercises: (dayId) => dayId,
  warmupItems: (programmeId) => programmeId,
  cooldownItems: (dayId) => dayId,
}

async function cachedFetch(store, key, queueId, priority, fetchFn) {
  const cached = await idbCache.get(store, key)
  if (cached) return cached
  const result = await enqueue(queueId, priority, fetchFn)
  const data = result?.data ?? result
  if (data) void idbCache.set(store, key, data)
  return data
}

export function useTodayData(dateStr, weekStartStr, weekEndStr, selectedDayLabel) {
  const { user } = useAuth()

  const [weekData, setWeekData] = useState(null)
  const [dayMeta, setDayMeta] = useState({
    dayData: null,
    programmeExercises: null,
    warmupItems: null,
    cooldownItems: null,
  })

  const [loading, setLoading] = useState(true)
  const [dayLoading, setDayLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hasCachedData, setHasCachedData] = useState(false)

  const revalidatingRef = useRef(false)
  const lastWeekRef = useRef('')
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Derive per-day data from week cache
  const logs = useMemo(() => weekData?.logsByDay?.[dateStr] ?? [], [weekData, dateStr])
  const warmupLogs = useMemo(() => weekData?.warmupByDay?.[dateStr] ?? [], [weekData, dateStr])
  const checklistLogs = useMemo(
    () => weekData?.checklistByDay?.[dateStr] ?? [],
    [weekData, dateStr]
  )
  const config = weekData?.config ?? null
  const sessions = weekData?.sessions ?? []
  const exerciseMap = weekData?.exerciseMap ?? {}
  const previousBests = weekData?.previousBests ?? {}
  const programme = weekData?.programme ?? null
  const phases = weekData?.phases ?? []

  // Resolve day-level programme data when selectedDayLabel or weekData changes
  useEffect(() => {
    if (!weekData || !selectedDayLabel) return
    let cancelled = false

    /* eslint-disable react-hooks/set-state-in-effect -- dayLoading tracks async resolution of this effect */
    setDayLoading(true)
    /* eslint-enable react-hooks/set-state-in-effect */

    async function resolveDayMeta() {
      const { config: cfg, sessions: sess, programme: prog, phases: phs } = weekData
      if (!prog || phs.length === 0 || !cfg) {
        if (!cancelled) {
          setDayMeta({
            dayData: null,
            programmeExercises: null,
            warmupItems: null,
            cooldownItems: null,
          })
          setDayLoading(false)
        }
        return
      }

      const phaseInfo = computePhaseAndWeek(sess, {
        start_date: cfg.start_date,
        phase_weeks: cfg.phase_weeks,
        min_active_days: cfg.min_active_days,
      })
      const currentPhase = phs.find((p) => p.phase_number === phaseInfo.phase)
      if (!currentPhase) {
        if (!cancelled) {
          setDayMeta({
            dayData: null,
            programmeExercises: null,
            warmupItems: null,
            cooldownItems: null,
          })
          setDayLoading(false)
        }
        return
      }

      const dayKey = cacheKey.programmeDay(currentPhase.id, selectedDayLabel)
      const freshDayData = await cachedFetch(
        'programme-day',
        dayKey,
        `day_${currentPhase.id}_${selectedDayLabel}`,
        PRIORITY.HIGH,
        () => programmeService.getProgrammeDay(currentPhase.id, selectedDayLabel)
      )

      if (cancelled) return

      let freshExercises = null
      let freshWarmup = null
      let freshCooldown = null

      if (freshDayData) {
        const isWorkout = freshDayData.workout_type === 'workout'
        const [exResult, wuResult, cdResult] = await Promise.all([
          isWorkout
            ? cachedFetch(
                'programme-exercises',
                cacheKey.programmeExercises(freshDayData.id),
                `progex_${freshDayData.id}`,
                PRIORITY.HIGH,
                () => programmeService.getProgrammeDayExercises(freshDayData.id)
              )
            : null,
          cachedFetch(
            'warmup-items',
            cacheKey.warmupItems(prog.id),
            `warmup_${prog.id}`,
            PRIORITY.HIGH,
            () => programmeService.getWarmupItems(prog.id)
          ),
          isWorkout && freshDayData.id
            ? cachedFetch(
                'cooldown-items',
                cacheKey.cooldownItems(freshDayData.id),
                `cooldown_${freshDayData.id}`,
                PRIORITY.HIGH,
                () => programmeService.getCooldownItems(freshDayData.id)
              )
            : null,
        ])
        freshExercises = exResult
        freshWarmup = wuResult
        freshCooldown = cdResult
      }

      if (!cancelled) {
        setDayMeta({
          dayData: freshDayData,
          programmeExercises: freshExercises,
          warmupItems: freshWarmup,
          cooldownItems: freshCooldown,
        })
        setDayLoading(false)
      }
    }

    void resolveDayMeta()
    return () => {
      cancelled = true
    }
  }, [weekData, selectedDayLabel])

  // Main week-level load effect
  useEffect(() => {
    if (!user?.id || !weekStartStr) return
    let cancelled = false

    const isNewWeek = lastWeekRef.current !== weekStartStr
    lastWeekRef.current = weekStartStr

    async function loadWeek() {
      setError(null)

      // 1. Check in-memory week cache
      const cached = getFromCache(user.id, weekStartStr)
      if (cached) {
        setWeekData(cached.data)
        setHasCachedData(true)
        setLoading(false)

        if (!cached.expired) {
          // Fresh cache — prefetch neighbors only
          setTimeout(() => {
            if (!cancelled) prefetchAdjacentWeeks(user.id, weekStartStr)
          }, 2000)
          return
        }

        // Stale — revalidate in background
        revalidatingRef.current = true
      } else if (isNewWeek) {
        setLoading(true)
      }

      // 2. Network fetch (foreground on miss, background on stale)
      try {
        const fresh = await fetchWeekData(user.id, weekStartStr)
        if (cancelled) return

        // Diff: only update if data changed
        const cachedAgain = getFromCache(user.id, weekStartStr)
        const freshFp = JSON.stringify({
          ll: fresh.logsByDay?.[dateStr]?.length,
          sl: fresh.sessions?.length,
          s0: fresh.sessions?.[0]?.id,
          bl: Object.keys(fresh.previousBests).length,
        })
        const cachedFp = cachedAgain
          ? JSON.stringify({
              ll: cachedAgain.data.logsByDay?.[dateStr]?.length,
              sl: cachedAgain.data.sessions?.length,
              s0: cachedAgain.data.sessions?.[0]?.id,
              bl: Object.keys(cachedAgain.data.previousBests ?? {}).length,
            })
          : ''

        setInCache(user.id, weekStartStr, fresh)

        if (freshFp !== cachedFp || !cachedAgain) {
          setWeekData(fresh)
        }

        setHasCachedData(true)
        setLoading(false)
        revalidatingRef.current = false

        // 3. Prefetch adjacent weeks
        setTimeout(() => {
          if (!cancelled) prefetchAdjacentWeeks(user.id, weekStartStr)
        }, 2000)
      } catch (err) {
        if (err?.name === 'AbortError') return
        logger.error('useTodayData week fetch error:', err)
        if (!cancelled) {
          setError(err.message ?? String(err))
          setLoading(false)
        }
      }
    }

    void loadWeek()

    return () => {
      cancelled = true
      cancelAll()
    }
  }, [user?.id, weekStartStr, dateStr])

  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- complex async callback cannot be auto-memoized
  const refetch = useCallback(async () => {
    if (!user?.id) return
    invalidateWeekCache(weekStartStr, user.id)
    try {
      const fresh = await fetchWeekData(user.id, weekStartStr)
      if (mountedRef.current) {
        setInCache(user.id, weekStartStr, fresh)
        setWeekData(fresh)
      }
    } catch (err) {
      logger.error('refetch error:', err)
    }
  }, [user?.id, weekStartStr])

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
    dayData: dayMeta.dayData,
    programmeExercises: dayMeta.programmeExercises,
    warmupItems: dayMeta.warmupItems,
    cooldownItems: dayMeta.cooldownItems,
    loading,
    dayLoading,
    hasCachedData,
    error,
    refetch,
  }
}
