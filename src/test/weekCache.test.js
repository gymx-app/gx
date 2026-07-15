import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getFromCache, setInCache, invalidateWeekCache } from '../services/weekCache'

// weekCache uses an internal Map (MEM_STORE). We test the public API only.
// No Supabase calls — we only test the in-memory cache layer.

// Mock supabase and other imports to prevent side effects on import
vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))
vi.mock('../services/idbCache', () => ({
  set: vi.fn(),
  get: vi.fn(),
  invalidate: vi.fn(),
}))
vi.mock('../services/programmeService', () => ({
  getFullProgrammeContext: vi.fn(),
}))
vi.mock('../services/fetchQueue', () => ({
  enqueue: vi.fn(),
  PRIORITY: { CRITICAL: 0, HIGH: 1, NORMAL: 2, LOW: 3 },
}))

const UID = 'user-123'
const WEEK = '2024-03-11'
const SAMPLE_DATA = { logsByDay: {}, sessions: [] }

describe('weekCache in-memory layer', () => {
  beforeEach(() => {
    // Clear cache between tests by invalidating known keys
    invalidateWeekCache(WEEK, UID)
    invalidateWeekCache('2024-03-04', UID)
    invalidateWeekCache('2024-03-18', UID)
  })

  describe('getFromCache', () => {
    it('returns null on cache miss', () => {
      expect(getFromCache(UID, WEEK)).toBeNull()
    })

    it('returns null for unknown user', () => {
      setInCache(UID, WEEK, SAMPLE_DATA)
      expect(getFromCache('other-user', WEEK)).toBeNull()
    })

    it('returns null for unknown week', () => {
      setInCache(UID, WEEK, SAMPLE_DATA)
      expect(getFromCache(UID, '2099-01-01')).toBeNull()
    })
  })

  describe('setInCache + getFromCache', () => {
    it('stores and retrieves data', () => {
      setInCache(UID, WEEK, SAMPLE_DATA)
      const result = getFromCache(UID, WEEK)
      expect(result).not.toBeNull()
      expect(result.data).toEqual(SAMPLE_DATA)
    })

    it('marks fresh entries as not expired', () => {
      setInCache(UID, WEEK, SAMPLE_DATA)
      const result = getFromCache(UID, WEEK)
      expect(result.expired).toBe(false)
    })

    it('overwrites existing data for same key', () => {
      setInCache(UID, WEEK, { old: true })
      setInCache(UID, WEEK, { new: true })
      const result = getFromCache(UID, WEEK)
      expect(result.data).toEqual({ new: true })
    })
  })

  describe('TTL expiry', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('marks entry as expired after 5 minutes', () => {
      setInCache(UID, WEEK, SAMPLE_DATA)

      // Advance time by 5 minutes + 1ms
      vi.advanceTimersByTime(5 * 60 * 1000 + 1)

      const result = getFromCache(UID, WEEK)
      expect(result).not.toBeNull()
      expect(result.expired).toBe(true)
    })

    it('is not expired at exactly 4:59', () => {
      setInCache(UID, WEEK, SAMPLE_DATA)
      vi.advanceTimersByTime(4 * 60 * 1000 + 59 * 1000)

      const result = getFromCache(UID, WEEK)
      expect(result.expired).toBe(false)
    })

    it('still returns data even when expired (stale-while-revalidate)', () => {
      setInCache(UID, WEEK, SAMPLE_DATA)
      vi.advanceTimersByTime(10 * 60 * 1000)

      const result = getFromCache(UID, WEEK)
      expect(result.data).toEqual(SAMPLE_DATA)
    })
  })

  describe('invalidateWeekCache', () => {
    it('removes a specific user+week entry', () => {
      setInCache(UID, WEEK, SAMPLE_DATA)
      invalidateWeekCache(WEEK, UID)
      expect(getFromCache(UID, WEEK)).toBeNull()
    })

    it('does not affect other weeks for the same user', () => {
      setInCache(UID, WEEK, SAMPLE_DATA)
      setInCache(UID, '2024-03-18', { other: true })

      invalidateWeekCache(WEEK, UID)

      expect(getFromCache(UID, WEEK)).toBeNull()
      expect(getFromCache(UID, '2024-03-18')).not.toBeNull()
    })

    it('does not affect other users for the same week', () => {
      setInCache(UID, WEEK, SAMPLE_DATA)
      setInCache('user-456', WEEK, { other: true })

      invalidateWeekCache(WEEK, UID)

      expect(getFromCache(UID, WEEK)).toBeNull()
      expect(getFromCache('user-456', WEEK)).not.toBeNull()

      // cleanup
      invalidateWeekCache(WEEK, 'user-456')
    })

    it('without uid removes all entries containing that week string', () => {
      setInCache(UID, WEEK, SAMPLE_DATA)
      setInCache('user-456', WEEK, { other: true })

      invalidateWeekCache(WEEK)

      expect(getFromCache(UID, WEEK)).toBeNull()
      expect(getFromCache('user-456', WEEK)).toBeNull()
    })
  })
})
