import { describe, it, expect } from 'vitest'
import { createMockSupabaseClient } from './supabase'

describe('createMockSupabaseClient', () => {
  it('supports .from().select().eq() chain', async () => {
    const client = createMockSupabaseClient({ data: [{ id: 1 }], error: null })
    const result = await client.from('users').select('*').eq('id', '1')
    expect(result.data).toEqual([{ id: 1 }])
    expect(result.error).toBeNull()
  })

  it('supports .from().insert().select().single() chain', async () => {
    const client = createMockSupabaseClient({
      data: { id: 'abc', name: 'Test' },
      error: null,
    })
    const result = await client.from('users').insert({ name: 'Test' }).select().single()
    expect(result.data).toEqual({ id: 'abc', name: 'Test' })
  })

  it('tracks from() calls', () => {
    const client = createMockSupabaseClient()
    client.from('exercises')
    client.from('workout_sessions')
    expect(client.from).toHaveBeenCalledTimes(2)
    expect(client.from).toHaveBeenCalledWith('exercises')
    expect(client.from).toHaveBeenCalledWith('workout_sessions')
  })

  it('simulates network errors', async () => {
    const client = createMockSupabaseClient()
    client._simulateNetworkError()
    const result = await client.from('users').select('*')
    expect(result.error).toEqual({
      message: 'Network error',
      code: 'NETWORK_ERROR',
    })
    expect(result.data).toBeNull()
  })

  it('resets after _simulateNetworkError', async () => {
    const client = createMockSupabaseClient({ data: [{ id: 1 }], error: null })
    client._simulateNetworkError()
    client._reset()
    const result = await client.from('users').select('*')
    expect(result.data).toEqual([{ id: 1 }])
  })

  it('supports .delete().eq() chain', async () => {
    const client = createMockSupabaseClient({ data: null, error: null })
    const result = await client.from('users').delete().eq('id', '1')
    expect(result.error).toBeNull()
  })

  it('supports .update().eq() chain', async () => {
    const client = createMockSupabaseClient({
      data: { id: '1', name: 'Updated' },
      error: null,
    })
    const result = await client.from('users').update({ name: 'Updated' }).eq('id', '1')
    expect(result.data).toEqual({ id: '1', name: 'Updated' })
  })
})
