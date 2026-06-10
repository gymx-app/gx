import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../lib/supabase'
import { toDateStr } from '../utils/programme'

/**
 * Custom hook — fetches all data the Today screen needs for a given date range.
 *
 * @param {string} dateStr - Selected date as YYYY-MM-DD
 * @param {string} weekStartStr - Monday of the displayed week as YYYY-MM-DD
 * @param {string} weekEndStr - Saturday of the displayed week as YYYY-MM-DD
 */
export function useTodayData(dateStr, weekStartStr, weekEndStr) {
  const { user } = useAuth()

  const [config, setConfig] = useState(null)
  const [sessions, setSessions] = useState([])
  const [logs, setLogs] = useState([])
  const [warmupLogs, setWarmupLogs] = useState([])
  const [checklistLogs, setChecklistLogs] = useState([])
  const [exerciseMap, setExerciseMap] = useState({}) // name -> id
  const [previousBests, setPreviousBests] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    if (!user?.id || !dateStr) return
    try {
      setError(null)

      // 1. Programme config
      const { data: cfg, error: cfgErr } = await supabase
        .from('programme_config')
        .select('*')
        .eq('user_id', user.id)
        .single()
      if (cfgErr) throw cfgErr
      setConfig(cfg)

      // 2. All workout sessions (for phase computation + week display)
      const { data: sess, error: sessErr } = await supabase
        .from('workout_sessions')
        .select('id, date, day_of_week, phase, is_travel, completed_at')
        .eq('user_id', user.id)
      if (sessErr) throw sessErr
      setSessions(sess || [])

      // 3. Exercise logs for selected date
      const { data: eLogs } = await supabase
        .from('exercise_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', dateStr)
      setLogs(eLogs || [])

      // 4. Warmup logs for selected date
      const { data: wLogs } = await supabase
        .from('warmup_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', dateStr)
      setWarmupLogs(wLogs || [])

      // 5. Checklist logs for selected date
      const { data: cLogs } = await supabase
        .from('checklist_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', dateStr)
      setChecklistLogs(cLogs || [])

      // 6. Exercises lookup (name -> id)
      const { data: exRows } = await supabase
        .from('exercises')
        .select('id, name')
      const map = {}
      for (const row of (exRows || [])) {
        map[row.name] = row.id
      }
      setExerciseMap(map)

      // 7. Previous bests (last 30 days, excluding selected date)
      const monthAgo = new Date(dateStr + 'T00:00:00')
      monthAgo.setDate(monthAgo.getDate() - 30)
      const { data: prevLogs } = await supabase
        .from('exercise_logs')
        .select('exercise_name, weight_kg, reps, date')
        .eq('user_id', user.id)
        .eq('completed', true)
        .eq('is_mm_set', false)
        .gte('date', toDateStr(monthAgo))
        .lt('date', dateStr)
        .order('date', { ascending: false })

      const bests = {}
      for (const log of (prevLogs || [])) {
        if (!bests[log.exercise_name]) {
          bests[log.exercise_name] = { weight_kg: log.weight_kg, reps: log.reps }
        }
      }
      setPreviousBests(bests)

      setLoading(false)
    } catch (err) {
      console.error('useTodayData error:', err)
      setError(err.message)
      setLoading(false)
    }
  }, [user?.id, dateStr])

  useEffect(() => {
    setLoading(true)
    refetch()
  }, [refetch])

  return {
    config,
    sessions,
    logs,
    warmupLogs,
    checklistLogs,
    exerciseMap,
    previousBests,
    loading,
    error,
    refetch,
  }
}
