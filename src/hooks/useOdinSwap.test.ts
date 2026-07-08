import { describe, it, expect, vi } from 'vitest'

// useOdinSwap imports the real Supabase client at module load — irrelevant
// to callWithRetry, which takes no Supabase dependency directly.
vi.mock('../lib/supabase', () => ({ supabase: {} }))

import { callWithRetry, MAX_ATTEMPTS } from './useOdinSwap'
import { OdinResponseError } from './useOdinGenerate'

// callWithRetry backs both getSwapOptions and confirmSwap — this is the one
// piece of new logic (retry on transient failure, don't retry on a
// validation error that will never become valid) worth covering directly,
// without needing to render the hook.

describe('callWithRetry', () => {
  it('does not retry when the first attempt succeeds', async () => {
    const call = vi.fn().mockResolvedValue('ok')
    const onAttempt = vi.fn()

    const result = await callWithRetry(call, onAttempt)

    expect(result).toEqual({ success: true, data: 'ok' })
    expect(call).toHaveBeenCalledTimes(1)
    expect(onAttempt).toHaveBeenCalledWith(1)
  })

  it('retries on a timeout and succeeds once the transient failure clears', async () => {
    const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' })
    const call = vi
      .fn()
      .mockRejectedValueOnce(abortError)
      .mockRejectedValueOnce(abortError)
      .mockResolvedValueOnce('ok')
    const onAttempt = vi.fn()

    const result = await callWithRetry(call, onAttempt)

    expect(result).toEqual({ success: true, data: 'ok' })
    expect(call).toHaveBeenCalledTimes(3)
    expect(onAttempt).toHaveBeenNthCalledWith(1, 1)
    expect(onAttempt).toHaveBeenNthCalledWith(2, 2)
    expect(onAttempt).toHaveBeenNthCalledWith(3, 3)
  })

  it('gives up after MAX_ATTEMPTS consecutive timeouts', async () => {
    const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' })
    const call = vi.fn().mockRejectedValue(abortError)

    const result = await callWithRetry(call, () => {})

    expect(call).toHaveBeenCalledTimes(MAX_ATTEMPTS)
    expect(result).toEqual({
      success: false,
      error: 'Connection timed out. Please try again.',
      code: null,
    })
  })

  it('does not retry a validation error — the same input will never become valid', async () => {
    const validationError = new OdinResponseError(
      'No substitution group configured',
      true,
      false,
      'SUBSTITUTION_GROUP_INVALID'
    )
    const call = vi.fn().mockRejectedValue(validationError)

    const result = await callWithRetry(call, () => {})

    expect(call).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      success: false,
      error: 'No substitution group configured',
      code: 'SUBSTITUTION_GROUP_INVALID',
    })
  })

  it('retries a non-validation Odin error (5xx/infra failure)', async () => {
    const infraError = new OdinResponseError('HTTP 503', false)
    const call = vi.fn().mockRejectedValueOnce(infraError).mockResolvedValueOnce('ok')

    const result = await callWithRetry(call, () => {})

    expect(call).toHaveBeenCalledTimes(2)
    expect(result).toEqual({ success: true, data: 'ok' })
  })
})
