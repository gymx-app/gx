import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import {
  buildReturningUserOdinPayload,
  type ReturningUserHealth,
  type ReturningUserProfile,
} from '../features/programme/buildReturningUserOdinPayload'

// Fetches exactly what buildReturningUserOdinPayload needs (profile, health,
// latest InBody) and builds the AthleteInputV2-shaped payload — the same
// construction GenerateProgrammeView.tsx uses for programme generation, so
// any other caller needing an "athlete" payload for Odin (e.g. exercise
// swap) sends the identical shape rather than a hand-rolled subset.
// `enabled` defers the fetch until actually needed — a caller that mounts
// this unconditionally (e.g. a sheet that's usually closed) shouldn't hit
// Supabase on every render.
export function useAthleteOdinPayload(enabled = true) {
  const { user } = useAuth()
  const [payload, setPayload] = useState<ReturnType<typeof buildReturningUserOdinPayload> | null>(
    null
  )
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !enabled) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      const [profileRes, healthRes, inbodyRes] = await Promise.all([
        supabase
          .from('user_profiles')
          .select(
            'full_name, date_of_birth, gender, height_cm, current_weight_kg, target_weight_kg, nationality'
          )
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('user_health')
          .select(
            'current_weight_kg, fitness_level, goal, available_days_per_week, session_duration_min, equipment, injuries, injuries_v2, preferred_workout_time, lifestyle, occupation, medical_conditions, goal_sub_fields, baseline_path, known_lifts, target_body_fat_pct, target_timeframe_weeks, body_fat_pct'
          )
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('inbody_logs')
          .select(
            'body_fat_pct, skeletal_muscle_mass, body_fat_mass, bmr, visceral_fat_area, total_body_water'
          )
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      if (cancelled) return

      const profile = profileRes.data as unknown as ReturningUserProfile | null
      const health = healthRes.data as unknown as ReturningUserHealth | null
      const inbody = inbodyRes.data ?? null

      if (!profile || !health) {
        setError('Could not load your profile.')
        setLoading(false)
        return
      }

      setPayload(buildReturningUserOdinPayload(profile, health, profile.target_weight_kg, inbody))
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [user, enabled])

  return { payload, loading, error }
}
