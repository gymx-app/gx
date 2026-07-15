import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'
import { odinPost, OdinResponseError } from './useOdinGenerate'

const SWAP_OPTIONS_URL = 'https://lzftkohidnykwnmekdyq.supabase.co/functions/v1/swap-options'
const CONFIRM_SWAP_URL = 'https://lzftkohidnykwnmekdyq.supabase.co/functions/v1/confirm-swap'
const TIMEOUT_MS = 20000
export const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 600

export interface SwapOption {
  exercise_id: string
  name: string
  equipment: string[]
  reasons: string[]
  score: number
}

interface SwapOptionsResponse {
  source_exercise_id: string
  used_fallback: boolean
  options: SwapOption[]
}

interface ConfirmSwapResponse {
  valid: true
  exercise_id: string
  chosen_alternative: { exercise_id: string; name: string; equipment: string[] }
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

// Timeouts and generic network failures are almost always transient — worth
// an automatic retry. A structured Odin validation error (e.g. this specific
// exercise has no valid substitution group) will never become valid by
// retrying the same request, so those fail immediately instead.
function isRetryable(err: unknown): boolean {
  if (err instanceof OdinResponseError) return !err.isValidationError
  return true
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export type CallResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: string | null }

// Retries up to MAX_ATTEMPTS times on timeout/infra failures. `onAttempt`
// reports the 1-based attempt number so the UI can show "Retrying… (2/3)"
// instead of sitting through a second multi-second wait with no feedback.
export async function callWithRetry<T>(
  call: (signal: AbortSignal) => Promise<T>,
  onAttempt: (attempt: number) => void
): Promise<CallResult<T>> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    onAttempt(attempt)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const data = await call(controller.signal)
      return { success: true, data }
    } catch (err) {
      if (attempt === MAX_ATTEMPTS || !isRetryable(err)) {
        return {
          success: false,
          error: describeError(err),
          code: err instanceof OdinResponseError ? err.code : null,
        }
      }
      await sleep(RETRY_DELAY_MS)
    } finally {
      clearTimeout(timeout)
    }
  }
  // Unreachable — the loop above always returns.
  return { success: false, error: 'Something went wrong. Please try again.', code: null }
}

export function useOdinSwap() {
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [optionsAttempt, setOptionsAttempt] = useState(1)
  const [confirming, setConfirming] = useState(false)
  const [confirmAttempt, setConfirmAttempt] = useState(1)

  const getSwapOptions = useCallback(
    async (
      exerciseId: string,
      substitutionOptions: { approved_exercise_ids: string[] } | null,
      athlete: unknown
    ): Promise<CallResult<SwapOptionsResponse>> => {
      setLoadingOptions(true)
      try {
        return await callWithRetry<SwapOptionsResponse>(async (signal) => {
          const token = await getAuthToken()
          return (await odinPost(
            SWAP_OPTIONS_URL,
            { exercise_id: exerciseId, substitution_options: substitutionOptions, athlete },
            token,
            signal
          )) as SwapOptionsResponse
        }, setOptionsAttempt)
      } finally {
        setLoadingOptions(false)
      }
    },
    []
  )

  const confirmSwap = useCallback(
    async (
      exerciseId: string,
      chosenAlternativeId: string,
      athlete: unknown
    ): Promise<CallResult<ConfirmSwapResponse>> => {
      setConfirming(true)
      try {
        return await callWithRetry<ConfirmSwapResponse>(async (signal) => {
          const token = await getAuthToken()
          return (await odinPost(
            CONFIRM_SWAP_URL,
            { exercise_id: exerciseId, chosen_alternative_id: chosenAlternativeId, athlete },
            token,
            signal
          )) as ConfirmSwapResponse
        }, setConfirmAttempt)
      } finally {
        setConfirming(false)
      }
    },
    []
  )

  return {
    getSwapOptions,
    confirmSwap,
    loadingOptions,
    optionsAttempt,
    confirming,
    confirmAttempt,
  }
}

function describeError(err: unknown): string {
  if ((err as Error)?.name === 'AbortError') return 'Connection timed out. Please try again.'
  if (err instanceof OdinResponseError) return err.message
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.'
}
