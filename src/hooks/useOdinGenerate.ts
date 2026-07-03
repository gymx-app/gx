import { useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

export const ODIN_URL =
  'https://lzftkohidnykwnmekdyq.supabase.co/functions/v1/generate-programme-v2'
const TIMEOUT_MS = 180000

export type OdinErrorType = 'API_ERROR' | 'VALIDATION_ERROR' | null

function stripNulls(obj: unknown): unknown {
  if (obj === null) return undefined
  if (Array.isArray(obj)) return obj.map(stripNulls)
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const stripped = stripNulls(v)
      if (stripped !== undefined) result[k] = stripped
    }
    return result
  }
  return obj
}

export interface OdinGenerateOutcome {
  success: boolean
  result: unknown
  error: string | null
  errorType: OdinErrorType
}

interface UseOdinGenerateReturn {
  generate: (athlete: unknown, timeoutMs?: number) => Promise<OdinGenerateOutcome>
  loading: boolean
  status: string
  result: unknown
  error: string | null
  errorType: OdinErrorType
  reset: () => void
}

class OdinResponseError extends Error {
  // A well-formed { success: false, error } response is Odin rejecting the
  // input (validation) — distinct from a network failure/timeout/5xx.
  isValidationError: boolean
  // 410 means this client is calling a deprecated/retired endpoint version —
  // distinct from validation and generic infra failures.
  isGone: boolean
  constructor(message: string, isValidationError: boolean, isGone = false) {
    super(message)
    this.isValidationError = isValidationError
    this.isGone = isGone
  }
}

async function odinPost(
  url: string,
  body: unknown,
  token: string,
  signal: AbortSignal
): Promise<unknown> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    signal,
  })

  if (res.status === 410) {
    console.error('V1 endpoint called — check useOdinGenerate endpoint URL')
    throw new OdinResponseError('App needs to be updated. Please refresh the page.', false, true)
  }

  let data: { success?: boolean; error?: { message?: string }; message?: string; data?: unknown }
  try {
    data = await res.json()
  } catch {
    throw new OdinResponseError(`HTTP ${res.status}`, false)
  }

  if (!res.ok || data.success === false) {
    const message = data?.error?.message ?? data?.message ?? `HTTP ${res.status}`
    // A 4xx with a structured error body is Odin telling us the input was bad;
    // anything else (5xx, malformed body) is an infrastructure failure.
    const isValidationError = res.status >= 400 && res.status < 500 && !!data?.error?.message
    throw new OdinResponseError(message, isValidationError)
  }

  return data.data
}

export function useOdinGenerate(): UseOdinGenerateReturn {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [result, setResult] = useState<unknown>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorType, setErrorType] = useState<OdinErrorType>(null)
  const abortRef = useRef<AbortController | null>(null)

  const generate = useCallback(
    async (athlete: unknown, timeoutMs: number = TIMEOUT_MS): Promise<OdinGenerateOutcome> => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setLoading(true)
      setError(null)
      setErrorType(null)
      setResult(null)

      const timeout = setTimeout(() => controller.abort(), timeoutMs)

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) {
          const msg = 'Not authenticated. Please sign in again.'
          setError(msg)
          setErrorType('API_ERROR')
          return { success: false, result: null, error: msg, errorType: 'API_ERROR' }
        }

        const token = session.access_token

        // Step 1: strategy
        setStatus('Analysing your profile…')
        const strategyResult = (await odinPost(
          ODIN_URL,
          { step: 'strategy', athlete },
          token,
          controller.signal
        )) as { strategy: unknown }

        // Step 2: build — strip nulls from strategy so Zod validation passes on the server
        setStatus('Building your programme…')
        const buildResult = await odinPost(
          ODIN_URL,
          { step: 'build', athlete, strategy: stripNulls(strategyResult.strategy) },
          token,
          controller.signal
        )

        setResult(buildResult)
        return { success: true, result: buildResult, error: null, errorType: null }
      } catch (err) {
        let msg: string
        let type: OdinErrorType
        if ((err as Error).name === 'AbortError') {
          msg = 'Connection timed out. Please try again.'
          type = 'API_ERROR'
        } else if (err instanceof OdinResponseError) {
          msg = err.message
          type = err.isValidationError ? 'VALIDATION_ERROR' : 'API_ERROR'
        } else {
          const inner = err instanceof Error ? err.message : 'Unknown error'
          msg = `Generation failed: ${inner}. Please try again.`
          type = 'API_ERROR'
        }
        setError(msg)
        setErrorType(type)
        return { success: false, result: null, error: msg, errorType: type }
      } finally {
        setLoading(false)
        setStatus('')
        clearTimeout(timeout)
      }
    },
    []
  )

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setLoading(false)
    setStatus('')
    setResult(null)
    setError(null)
    setErrorType(null)
  }, [])

  return { generate, loading, status, result, error, errorType, reset }
}
