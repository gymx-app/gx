import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../lib/supabase'
import { logger } from '../lib/logger'

export default function useBaselineStatus() {
  const { user } = useAuth()
  const [state, setState] = useState({
    baselinePending: false,
    baselineSession: null,
    programmeId: null,
    loading: true,
    error: null,
  })

  const check = useCallback(async () => {
    if (!user?.id) return
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const { data: programme, error: progErr } = await supabase
        .from('programmes')
        .select('id, baseline_session')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
      if (progErr) throw progErr

      if (!programme?.baseline_session) {
        setState({
          baselinePending: false,
          baselineSession: null,
          programmeId: null,
          loading: false,
          error: null,
        })
        return
      }

      const { data: sessionRows, error: sessErr } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('session_type', 'baseline_assessment')
        .limit(1)
      if (sessErr) throw sessErr

      if (sessionRows && sessionRows.length > 0) {
        setState({
          baselinePending: false,
          baselineSession: null,
          programmeId: null,
          loading: false,
          error: null,
        })
      } else {
        setState({
          baselinePending: true,
          baselineSession: programme.baseline_session,
          programmeId: programme.id,
          loading: false,
          error: null,
        })
      }
    } catch (err) {
      logger.error('useBaselineStatus:', err)
      setState((prev) => ({ ...prev, loading: false, error: err.message ?? String(err) }))
    }
  }, [user?.id])

  useEffect(() => {
    void check()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- check is stable per user.id, re-running on identity change is intentional
  }, [user?.id])

  return { ...state, refetch: check }
}
