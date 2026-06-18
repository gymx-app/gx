import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { memCache } from '../services/memoryCache'

describe('memoryCache', () => {
  beforeEach(() => {
    memCache.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('get/set', () => {
    it('returns null on cache miss', () => {
      expect(memCache.get('nonexistent')).toBeNull()
    })

    it('stores and retrieves a value', () => {
      memCache.set('key1', { foo: 'bar' }, 60_000)
      expect(memCache.get('key1')).toEqual({ foo: 'bar' })
    })

    it('stores different data types', () => {
      memCache.set('string', 'hello', 60_000)
      memCache.set('number', 42, 60_000)
      memCache.set('array', [1, 2, 3], 60_000)
      memCache.set('null-val', null, 60_000)

      expect(memCache.get('string')).toBe('hello')
      expect(memCache.get('number')).toBe(42)
      expect(memCache.get('array')).toEqual([1, 2, 3])
      // null stored value: get returns null (indistinguishable from miss)
      expect(memCache.get('null-val')).toBeNull()
    })

    it('overwrites existing key with new value', () => {
      memCache.set('key1', 'old', 60_000)
      memCache.set('key1', 'new', 60_000)
      expect(memCache.get('key1')).toBe('new')
    })
  })

  describe('TTL expiry', () => {
    it('returns value before TTL expires', () => {
      memCache.set('key1', 'val', 5_000)
      vi.advanceTimersByTime(4_999)
      expect(memCache.get('key1')).toBe('val')
    })

    it('returns null after TTL expires', () => {
      memCache.set('key1', 'val', 5_000)
      vi.advanceTimersByTime(5_001)
      expect(memCache.get('key1')).toBeNull()
    })

    it('expired entry is deleted from store on access', () => {
      memCache.set('key1', 'val', 1_000)
      vi.advanceTimersByTime(1_001)
      memCache.get('key1')
      expect(memCache.size()).toBe(0)
    })
  })

  describe('delete', () => {
    it('removes a specific key', () => {
      memCache.set('a', 1, 60_000)
      memCache.set('b', 2, 60_000)
      memCache.delete('a')
      expect(memCache.get('a')).toBeNull()
      expect(memCache.get('b')).toBe(2)
    })

    it('no-ops on nonexistent key', () => {
      expect(() => memCache.delete('ghost')).not.toThrow()
    })
  })

  describe('invalidatePrefix', () => {
    it('removes all keys starting with prefix', () => {
      memCache.set('user:1:data', 'a', 60_000)
      memCache.set('user:1:prefs', 'b', 60_000)
      memCache.set('user:2:data', 'c', 60_000)

      memCache.invalidatePrefix('user:1:')

      expect(memCache.get('user:1:data')).toBeNull()
      expect(memCache.get('user:1:prefs')).toBeNull()
      expect(memCache.get('user:2:data')).toBe('c')
    })

    it('no-ops when no keys match', () => {
      memCache.set('keep', 'val', 60_000)
      memCache.invalidatePrefix('remove:')
      expect(memCache.get('keep')).toBe('val')
    })
  })

  describe('clear', () => {
    it('removes all entries', () => {
      memCache.set('a', 1, 60_000)
      memCache.set('b', 2, 60_000)
      memCache.set('c', 3, 60_000)
      memCache.clear()
      expect(memCache.size()).toBe(0)
      expect(memCache.get('a')).toBeNull()
    })
  })

  describe('size', () => {
    it('returns 0 for empty cache', () => {
      expect(memCache.size()).toBe(0)
    })

    it('tracks entry count', () => {
      memCache.set('a', 1, 60_000)
      memCache.set('b', 2, 60_000)
      expect(memCache.size()).toBe(2)
    })

    it('does not double-count overwrites', () => {
      memCache.set('a', 1, 60_000)
      memCache.set('a', 2, 60_000)
      expect(memCache.size()).toBe(1)
    })
  })

  describe('LRU eviction', () => {
    it('evicts least recently accessed entry when at capacity (100)', () => {
      // Fill to MAX_ENTRIES, advancing time between each set
      // so each entry has a distinct lastAccessed timestamp
      for (let i = 0; i < 100; i++) {
        memCache.set(`key-${i}`, i, 600_000)
        vi.advanceTimersByTime(1)
      }
      expect(memCache.size()).toBe(100)

      // key-0 has the oldest lastAccessed (set at t=0, now at t=99)
      // Access key-0 to make it recently used (t=100)
      vi.advanceTimersByTime(1)
      memCache.get('key-0')

      // Add one more — should evict the LRU (key-1, set at t=1, never re-accessed)
      vi.advanceTimersByTime(1)
      memCache.set('key-100', 100, 600_000)
      expect(memCache.size()).toBe(100)

      // key-0 should survive (recently accessed)
      expect(memCache.get('key-0')).toBe(0)
      // key-100 should exist
      expect(memCache.get('key-100')).toBe(100)
      // key-1 should be evicted (oldest lastAccessed that wasn't refreshed)
      expect(memCache.get('key-1')).toBeNull()
    })
  })
})
