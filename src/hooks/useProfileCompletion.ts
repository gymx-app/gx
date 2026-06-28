import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'

interface ProfileCompletionResult {
  profileComplete: boolean
  healthComplete: boolean
  loading: boolean
  error: string | null
}

export function useProfileCompletion(): ProfileCompletionResult {
  const { user } = useAuth()
  const [profileComplete, setProfileComplete] = useState(false)
  const [healthComplete, setHealthComplete] = useState(false)
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    let cancelled = false

    const check = async () => {
      const [profileRes, healthRes] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('full_name, age, gender, height_cm, current_weight_kg')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('user_health')
          .select('fitness_level, goal, available_days_per_week, session_duration_min, equipment')
          .eq('user_id', user.id)
          .maybeSingle(),
      ])

      if (cancelled) return

      if (profileRes.error && profileRes.error.code !== 'PGRST116') {
        setError('Failed to check profile')
        setChecked(true)
        return
      }
      if (healthRes.error && healthRes.error.code !== 'PGRST116') {
        setError('Failed to check health data')
        setChecked(true)
        return
      }

      const p = profileRes.data
      const pComplete = !!(
        p &&
        p.full_name &&
        p.age != null &&
        p.gender &&
        p.height_cm != null &&
        p.current_weight_kg != null
      )

      const h = healthRes.data
      const hComplete = !!(
        h &&
        h.fitness_level &&
        h.goal &&
        h.available_days_per_week != null &&
        h.session_duration_min != null &&
        h.equipment
      )

      setProfileComplete(pComplete)
      setHealthComplete(hComplete)
      setChecked(true)
    }

    void check()
    return () => {
      cancelled = true
    }
  }, [user])

  const loading = !checked && !!user

  return { profileComplete, healthComplete, loading, error }
}
