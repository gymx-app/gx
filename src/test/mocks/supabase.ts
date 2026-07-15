import { vi } from 'vitest'

interface MockResponse {
  data: unknown
  error: unknown
}

function createChain(response: MockResponse = { data: null, error: null }) {
  const chain: Record<string, unknown> = {}

  const methods = [
    'select',
    'insert',
    'update',
    'upsert',
    'delete',
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'in',
    'order',
    'limit',
    'range',
    'single',
    'maybeSingle',
  ]

  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain)
  }

  chain.then = vi.fn((resolve: (v: MockResponse) => void) => {
    resolve(response)
    return Promise.resolve(response)
  })

  // Make the chain itself a thenable so await works
  Object.defineProperty(chain, Symbol.toStringTag, { value: 'Promise' })

  return chain as Record<string, ReturnType<typeof vi.fn>>
}

export function createMockSupabaseClient(defaultResponse?: MockResponse) {
  const response = defaultResponse ?? { data: [], error: null }
  let currentChain = createChain(response)

  const client = {
    from: vi.fn().mockImplementation(() => {
      currentChain = createChain(response)
      return currentChain
    }),

    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      signUp: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },

    _getChain: () => currentChain,

    _setResponse: (newResponse: MockResponse) => {
      Object.assign(response, newResponse)
    },

    _simulateNetworkError: () => {
      const errorResponse = {
        data: null,
        error: { message: 'Network error', code: 'NETWORK_ERROR' },
      }
      client.from.mockImplementation(() => createChain(errorResponse))
    },

    _reset: () => {
      client.from.mockImplementation(() => {
        currentChain = createChain(response)
        return currentChain
      })
    },
  }

  return client
}

export const mockSupabase = createMockSupabaseClient()
