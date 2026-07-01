import { useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

const ODIN_URL = 'https://agent-odin.vercel.app/api/v2/odin/generate-programme'
const TIMEOUT_MS = 180000

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

interface UseOdinGenerateReturn {
  generate: (athlete: unknown) => Promise<void>
  loading: boolean
  status: string
  result: unknown
  error: string | null
  reset: () => void
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

  const data = await res.json()

  if (!res.ok || data.success === false) {
    throw new Error(data?.error?.message ?? data?.message ?? `HTTP ${res.status}`)
  }

  return data.data
}

export function useOdinGenerate(): UseOdinGenerateReturn {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [result, setResult] = useState<unknown>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const generate = useCallback(async (athlete: unknown) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    setResult(null)

    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated. Please sign in again.')
        return
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
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setError('Request timed out — Odin may be under heavy load. Please try again.')
      } else {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setError(`Generation failed: ${msg}. Please try again.`)
      }
    } finally {
      setLoading(false)
      setStatus('')
      clearTimeout(timeout)
    }
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setLoading(false)
    setStatus('')
    setResult(null)
    setError(null)
  }, [])

  return { generate, loading, status, result, error, reset }
}
