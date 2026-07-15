import { useEffect, useState } from 'react'
import { ODIN_URL } from './useOdinGenerate'

export type OdinInfra = 'S' | 'V'
export type OdinStatusState = 'loading' | 'ready' | 'failed'

export interface OdinStatus {
  infra: OdinInfra
  model: string
  status: OdinStatusState
}

const MODEL_ABBREVIATIONS: [RegExp, string][] = [
  [/^claude-opus-4/, 'Opus 4'],
  [/^claude-sonnet-4/, 'Sonnet 4'],
  [/^gpt-4o/, 'GPT-4o'],
  [/^gpt-5/, 'GPT-5'],
]

function abbreviateModel(model: string): string {
  for (const [pattern, label] of MODEL_ABBREVIATIONS) {
    if (pattern.test(model)) return label
  }
  return model.slice(0, 10)
}

const INFRA: OdinInfra = ODIN_URL.includes('supabase.co') ? 'S' : 'V'

// Supabase edge functions live at .../functions/v1/<name>; the old Vercel
// deployment used .../api/v2/odin/<name> — health is a sibling either way.
const HEALTH_URL =
  INFRA === 'S'
    ? ODIN_URL.replace(/\/generate-programme-v2$/, '/health')
    : ODIN_URL.replace(/\/api\/v2\/odin\/generate-programme$/, '/api/health')

export function useOdinStatus(): OdinStatus {
  const [status, setStatus] = useState<OdinStatus>({ infra: INFRA, model: '', status: 'loading' })

  useEffect(() => {
    let cancelled = false

    fetch(HEALTH_URL)
      .then((res) => res.json())
      .then((json: { data?: { model?: unknown } }) => {
        if (cancelled) return
        const model = json?.data?.model
        if (typeof model !== 'string' || !model) {
          setStatus({ infra: INFRA, model: '', status: 'failed' })
          return
        }
        setStatus({ infra: INFRA, model: abbreviateModel(model), status: 'ready' })
      })
      .catch(() => {
        if (!cancelled) setStatus({ infra: INFRA, model: '', status: 'failed' })
      })

    return () => {
      cancelled = true
    }
  }, [])

  return status
}
