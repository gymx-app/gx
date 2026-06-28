import { useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

const ODIN_URL = 'https://agent-odin.vercel.app/api/v1/odin/generate-programme'
const TIMEOUT_MS = 90000

interface UseOdinGenerateReturn {
  generate: (athletePayload: unknown) => Promise<void>
  loading: boolean
  result: unknown
  error: string | null
  reset: () => void
}

export function useOdinGenerate(): UseOdinGenerateReturn {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<unknown>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const generate = useCallback(async (athletePayload: unknown) => {
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
        setLoading(false)
        clearTimeout(timeout)
        return
      }

      const res = await fetch(ODIN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(athletePayload),
        signal: controller.signal,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data?.error?.message ?? data?.message ?? 'Generation failed. Please try again.')
        setLoading(false)
        clearTimeout(timeout)
        return
      }

      if (data.success === false) {
        setError(data?.error?.message ?? 'Generation failed. Please try again.')
        setLoading(false)
        clearTimeout(timeout)
        return
      }

      setResult(data)
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setError('Connection timed out. Please try again.')
      } else {
        setError('Connection timed out. Please try again.')
      }
    } finally {
      setLoading(false)
      clearTimeout(timeout)
    }
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setLoading(false)
    setResult(null)
    setError(null)
  }, [])

  return { generate, loading, result, error, reset }
}
