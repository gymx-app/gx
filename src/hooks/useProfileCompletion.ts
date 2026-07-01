import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'

export type OnboardingGateStatus = 'loading' | 'onboarding' | 'goal-only' | 'ready'

interface ProfileCompletionResult {
  status: OnboardingGateStatus
  error: string | null
}

// Mirrors the onboarding trigger logic: missing/incomplete profile sends the
// user through the full 3-step wizard; a completed profile with no goal yet
// (e.g. an existing user re-entering the funnel) only needs step 3.
export function useProfileCompletion(): ProfileCompletionResult {
  const { user } = useAuth()
  const [status, setStatus] = useState<OnboardingGateStatus>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    let cancelled = false

    const check = async () => {
      const [profileRes, healthRes] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('onboarding_completed')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase.from('user_health').select('goal').eq('user_id', user.id).maybeSingle(),
      ])

      if (cancelled) return

      if (profileRes.error && profileRes.error.code !== 'PGRST116') {
        setError('Failed to check profile')
        setStatus('ready')
        return
      }
      if (healthRes.error && healthRes.error.code !== 'PGRST116') {
        setError('Failed to check health data')
        setStatus('ready')
        return
      }

      const profile = profileRes.data
      if (!profile || !profile.onboarding_completed) {
        setStatus('onboarding')
        return
      }

      if (!healthRes.data?.goal) {
        setStatus('goal-only')
        return
      }

      setStatus('ready')
    }

    void check()
    return () => {
      cancelled = true
    }
  }, [user])

  return { status, error }
}
