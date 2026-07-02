import { supabase } from '../lib/supabase'
import { logger } from '../lib/logger'

const ACSM_PCT_BY_GOAL = {
  fat_loss: 0.65,
  muscle_gain: 0.725,
  strength: 0.825,
  body_recomposition: 0.7,
  general_fitness: 0.65,
  endurance: 0.65,
  maintenance: 0.65,
}

function roundTo(value, step) {
  return Math.round(value / step) * step
}

/**
 * Calculates estimated 1RM + prescribed working weight from a completed
 * baseline session's Set 3 logs (Epley formula + ACSM %1RM by goal),
 * and stores the result in strength_baselines.
 * @returns {Promise<Array<{ exercise_name: string, estimated_1rm_kg: number, working_weight_kg: number }>>}
 */
export async function calculateAndStoreBaseline(userId, programmeId, sessionId) {
  try {
    const { data: logs, error: logsErr } = await supabase
      .from('exercise_logs')
      .select('exercise_id, exercise_name, weight_kg, reps')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .eq('set_number', 3)
      .eq('completed', true)
    if (logsErr) throw logsErr
    if (!logs || logs.length === 0) return []

    let goalType = 'general_fitness'
    if (programmeId) {
      const { data: programme, error: progErr } = await supabase
        .from('programmes')
        .select('goal_type')
        .eq('id', programmeId)
        .single()
      if (progErr) throw progErr
      if (programme?.goal_type) goalType = programme.goal_type
    }

    const pct = ACSM_PCT_BY_GOAL[goalType] ?? 0.65

    const rows = logs.map((log) => {
      const weight = log.weight_kg ?? 0
      const reps = log.reps ?? 0
      const estimated1rm = roundTo(weight * (1 + reps / 30), 0.5)
      const workingWeight = roundTo(estimated1rm * pct, 2.5)

      return {
        user_id: userId,
        programme_id: programmeId,
        exercise_id: log.exercise_id,
        exercise_name: log.exercise_name,
        set3_weight_kg: weight,
        set3_reps: reps,
        estimated_1rm_kg: estimated1rm,
        working_weight_kg: workingWeight,
        goal_type: goalType,
      }
    })

    const { error: insertErr } = await supabase.from('strength_baselines').insert(rows)
    if (insertErr) throw insertErr

    return rows.map((r) => ({
      exercise_name: r.exercise_name,
      estimated_1rm_kg: r.estimated_1rm_kg,
      working_weight_kg: r.working_weight_kg,
    }))
  } catch (err) {
    logger.error('calculateAndStoreBaseline:', err)
    return []
  }
}
