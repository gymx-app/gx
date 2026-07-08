import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'
import { odinPost, OdinResponseError } from './useOdinGenerate'

const SWAP_OPTIONS_URL = 'https://lzftkohidnykwnmekdyq.supabase.co/functions/v1/swap-options'
const CONFIRM_SWAP_URL = 'https://lzftkohidnykwnmekdyq.supabase.co/functions/v1/confirm-swap'
const TIMEOUT_MS = 20000

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

export function useOdinSwap() {
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const getSwapOptions = useCallback(
    async (
      exerciseId: string,
      substitutionOptions: { approved_exercise_ids: string[] } | null,
      athlete: unknown
    ): Promise<
      { success: true; data: SwapOptionsResponse } | { success: false; error: string }
    > => {
      setLoadingOptions(true)
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
      try {
        const token = await getAuthToken()
        const data = (await odinPost(
          SWAP_OPTIONS_URL,
          { exercise_id: exerciseId, substitution_options: substitutionOptions, athlete },
          token,
          controller.signal
        )) as SwapOptionsResponse
        return { success: true, data }
      } catch (err) {
        return { success: false, error: describeError(err) }
      } finally {
        clearTimeout(timeout)
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
    ): Promise<
      | { success: true; data: ConfirmSwapResponse }
      | { success: false; error: string; code: string | null }
    > => {
      setConfirming(true)
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
      try {
        const token = await getAuthToken()
        const data = (await odinPost(
          CONFIRM_SWAP_URL,
          { exercise_id: exerciseId, chosen_alternative_id: chosenAlternativeId, athlete },
          token,
          controller.signal
        )) as ConfirmSwapResponse
        return { success: true, data }
      } catch (err) {
        return {
          success: false,
          error: describeError(err),
          code: err instanceof OdinResponseError ? err.code : null,
        }
      } finally {
        clearTimeout(timeout)
        setConfirming(false)
      }
    },
    []
  )

  return { getSwapOptions, confirmSwap, loadingOptions, confirming }
}

function describeError(err: unknown): string {
  if ((err as Error)?.name === 'AbortError') return 'Connection timed out. Please try again.'
  if (err instanceof OdinResponseError) return err.message
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.'
}
