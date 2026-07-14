import { useCallback, useState } from 'react'
import { odinPost, OdinResponseError } from './useOdinGenerate'
import { callWithRetry, type CallResult } from './useOdinSwap'
import { supabase } from '../lib/supabase'

const NEXT_PRESCRIPTION_URL =
  'https://lzftkohidnykwnmekdyq.supabase.co/functions/v1/next-prescription'
const READINESS_CHECK_URL = 'https://lzftkohidnykwnmekdyq.supabase.co/functions/v1/readiness-check'

export interface CompletedSet {
  target_reps: number
  rpe_ceiling: number
  reps_achieved: number
  rpe_reported: number
}

export interface NextPrescriptionRequest {
  exercise_id: string
  current_target_reps: number
  progression_bounds: { rep_min: number; rep_max: number }
  completed_sets: CompletedSet[]
  athlete: unknown
}

export interface NextPrescriptionResponse {
  exercise_id: string
  next_target_reps: number
  increase_load: boolean
  rationale_codes: string[]
}

export interface ReadinessCheckRequest {
  recent_sessions: { completed_sets: CompletedSet[] }[]
  athlete: unknown
}

export interface ReadinessCheckResponse {
  deload_recommended: boolean
  triggered_reasons: string[]
  deload_adjustments: {
    volume_factor?: number
    intensity_factor?: number
    effort_factor?: number
    conditioning_factor?: number
  }
}

async function getAuthToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    throw new OdinResponseError('Not authenticated. Please sign in again.', false)
  }
  return session.access_token
}

export function useOdinProgression() {
  const [checkingPrescription, setCheckingPrescription] = useState(false)
  const [prescriptionAttempt, setPrescriptionAttempt] = useState(1)
  const [checkingReadiness, setCheckingReadiness] = useState(false)
  const [readinessAttempt, setReadinessAttempt] = useState(1)

  const getNextPrescription = useCallback(
    async (request: NextPrescriptionRequest): Promise<CallResult<NextPrescriptionResponse>> => {
      setCheckingPrescription(true)
      try {
        return await callWithRetry<NextPrescriptionResponse>(async (signal) => {
          const token = await getAuthToken()
          return (await odinPost(
            NEXT_PRESCRIPTION_URL,
            request,
            token,
            signal
          )) as NextPrescriptionResponse
        }, setPrescriptionAttempt)
      } finally {
        setCheckingPrescription(false)
      }
    },
    []
  )

  const checkReadiness = useCallback(
    async (request: ReadinessCheckRequest): Promise<CallResult<ReadinessCheckResponse>> => {
      setCheckingReadiness(true)
      try {
        return await callWithRetry<ReadinessCheckResponse>(async (signal) => {
          const token = await getAuthToken()
          return (await odinPost(
            READINESS_CHECK_URL,
            request,
            token,
            signal
          )) as ReadinessCheckResponse
        }, setReadinessAttempt)
      } finally {
        setCheckingReadiness(false)
      }
    },
    []
  )

  return {
    getNextPrescription,
    checkingPrescription,
    prescriptionAttempt,
    checkReadiness,
    checkingReadiness,
    readinessAttempt,
  }
}
