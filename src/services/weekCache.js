import * as idbCache from './idbCache'
import { supabase } from '../lib/supabase'
import { logger } from '../lib/logger'
import { toDateStr } from '../utils/programme'
import * as programmeService from './programmeService'
import { enqueue, PRIORITY } from './fetchQueue'

const WEEK_TTL = 5 * 60 * 1000 // 5 minutes
const MEM_STORE = new Map()

function weekMemKey(uid, weekStart) {
  return `week:${uid}:${weekStart}`
}

function isExpired(entry) {
  return Date.now() - entry.timestamp > WEEK_TTL
}

function getWeekDates(weekStartStr) {
  const dates = []
  const base = new Date(weekStartStr + 'T00:00:00')
  for (let i = 0; i < 7; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    dates.push(toDateStr(d))
  }
  return dates
}

export function getFromCache(uid, weekStartStr) {
  const key = weekMemKey(uid, weekStartStr)
  const entry = MEM_STORE.get(key)
  if (!entry) return null
  return { data: entry.data, expired: isExpired(entry) }
}

export function setInCache(uid, weekStartStr, data) {
  MEM_STORE.set(weekMemKey(uid, weekStartStr), { data, timestamp: Date.now() })
}

export function invalidateWeekCache(weekStartStr, uid) {
  if (uid) {
    MEM_STORE.delete(weekMemKey(uid, weekStartStr))
  } else {
    for (const key of MEM_STORE.keys()) {
      if (key.includes(weekStartStr)) MEM_STORE.delete(key)
    }
  }
}

async function fetchWeekLogs(uid, dates) {
  const weekStart = dates[0]
  const weekEndPlusOne = new Date(dates[6] + 'T00:00:00')
  weekEndPlusOne.setDate(weekEndPlusOne.getDate() + 1)
  const weekEndStr = toDateStr(weekEndPlusOne)

  const [logsRes, warmupRes, checklistRes, sessionsRes] = await Promise.all([
    enqueue(`wk_logs_${weekStart}`, PRIORITY.HIGH, () =>
      supabase.from('exercise_logs').select('*')
        .eq('user_id', uid).gte('date', weekStart).lt('date', weekEndStr)
    ),
    enqueue(`wk_warmup_${weekStart}`, PRIORITY.HIGH, () =>
      supabase.from('warmup_logs').select('*')
        .eq('user_id', uid).gte('date', weekStart).lt('date', weekEndStr)
    ),
    enqueue(`wk_checklist_${weekStart}`, PRIORITY.HIGH, () =>
      supabase.from('checklist_logs').select('*')
        .eq('user_id', uid).gte('date', weekStart).lt('date', weekEndStr)
    ),
    enqueue(`wk_sessions_${weekStart}`, PRIORITY.HIGH, () =>
      supabase.from('workout_sessions')
        .select('id, date, day_of_week, phase, completed_at')
        .eq('user_id', uid)
        .order('date', { ascending: false })
        .limit(200)
    ),
  ])

  const monthAgo = new Date(weekStart + 'T00:00:00')
  monthAgo.setDate(monthAgo.getDate() - 30)
  const bestsRes = await enqueue(`wk_bests_${weekStart}`, PRIORITY.NORMAL, () =>
    supabase.from('exercise_logs')
      .select('exercise_name, weight_kg, reps, date')
      .eq('user_id', uid).eq('completed', true).eq('is_mm_set', false)
      .gte('date', toDateStr(monthAgo)).lt('date', weekEndStr)
      .order('date', { ascending: false })
  )

  const logsByDay = {}
  const warmupByDay = {}
  const checklistByDay = {}
  for (const d of dates) {
    logsByDay[d] = []
    warmupByDay[d] = []
    checklistByDay[d] = []
  }
  for (const l of (logsRes.data || [])) {
    if (logsByDay[l.date]) logsByDay[l.date].push(l)
  }
  for (const l of (warmupRes.data || [])) {
    if (warmupByDay[l.date]) warmupByDay[l.date].push(l)
  }
  for (const l of (checklistRes.data || [])) {
    if (checklistByDay[l.date]) checklistByDay[l.date].push(l)
  }

  const bestsByExercise = {}
  for (const log of (bestsRes.data || [])) {
    if (!bestsByExercise[log.exercise_name]) {
      bestsByExercise[log.exercise_name] = { weight_kg: log.weight_kg, reps: log.reps }
    }
  }

  return {
    logsByDay,
    warmupByDay,
    checklistByDay,
    sessions: sessionsRes.data || [],
    previousBests: bestsByExercise,
  }
}

export async function fetchWeekData(uid, weekStartStr) {
  const dates = getWeekDates(weekStartStr)

  const [cfgRes, ctxRes, exRes] = await Promise.all([
    enqueue(`config_${uid}`, PRIORITY.CRITICAL, () =>
      supabase.from('programme_config').select('*').eq('user_id', uid).single()
    ),
    enqueue(`ctx_${uid}`, PRIORITY.CRITICAL, () =>
      programmeService.getFullProgrammeContext(uid)
    ),
    enqueue(`exercises_${uid}`, PRIORITY.HIGH, () =>
      supabase.from('exercises').select('id, name')
    ),
  ])

  if (cfgRes.error) throw cfgRes.error

  const config = cfgRes.data
  const programme = ctxRes.data?.programme || null
  const phases = ctxRes.data?.phases || []
  const exerciseMap = {}
  for (const row of (exRes.data || [])) {
    exerciseMap[row.name] = row.id
  }

  const weekLogs = await fetchWeekLogs(uid, dates)

  idbCache.set('programme-config', uid, config)
  idbCache.set('programme-context', uid, ctxRes.data)
  idbCache.set('exercises', uid, exerciseMap)
  idbCache.set('week-sessions', `${uid}_${weekStartStr}`, weekLogs.sessions)

  return {
    config,
    programme,
    phases,
    exerciseMap,
    ...weekLogs,
  }
}

export function prefetchAdjacentWeeks(uid, weekStartStr) {
  const base = new Date(weekStartStr + 'T00:00:00')
  const prev = new Date(base)
  prev.setDate(prev.getDate() - 7)
  const next = new Date(base)
  next.setDate(next.getDate() + 7)

  for (const d of [toDateStr(prev), toDateStr(next)]) {
    const cached = getFromCache(uid, d)
    if (cached && !cached.expired) continue

    fetchWeekData(uid, d)
      .then(data => setInCache(uid, d, data))
      .catch(() => {})
  }
}
