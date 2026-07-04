import { logger } from '../lib/logger'
import { memCache } from './memoryCache'

const DB_NAME = 'gx-cache'
const DB_VERSION = 4

const STORES = [
  'workout-data',
  'week-sessions',
  'exercises',
  'programme-config',
  // Programme structure caches
  'programme-context',
  'programme-day',
  'programme-exercises',
  'warmup-items',
  'cooldown-items',
  'conditioning-items',
]

/** TTL in milliseconds per store */
const TTL = {
  'workout-data': 5 * 60 * 1000, // 5 minutes
  'week-sessions': 10 * 60 * 1000, // 10 minutes
  exercises: 7 * 24 * 60 * 60 * 1000, // 7 days
  'programme-config': 30 * 60 * 1000, // 30 minutes
  'programme-context': 30 * 60 * 1000, // 30 minutes
  'programme-day': 60 * 60 * 1000, // 1 hour
  'programme-exercises': 60 * 60 * 1000, // 1 hour
  'warmup-items': 60 * 60 * 1000, // 1 hour
  'cooldown-items': 60 * 60 * 1000, // 1 hour
  'conditioning-items': 60 * 60 * 1000, // 1 hour
}

let dbPromise = null

/**
 * Open (or reuse) the IndexedDB connection.
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      for (const name of [...db.objectStoreNames]) {
        db.deleteObjectStore(name)
      }
      for (const name of STORES) {
        db.createObjectStore(name)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      logger.error('idbCache open error:', request.error)
      dbPromise = null
      reject(request.error ?? new Error('IDB open failed'))
    }
  })

  return dbPromise
}

/**
 * Get a value from cache. Returns null if missing or expired.
 * @param {string} store - Store name
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} The cached data, or null
 */
export async function get(store, key) {
  const memKey = `${store}:${key}`
  const memHit = memCache.get(memKey)
  if (memHit !== null) return memHit

  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(store, 'readonly')
      const req = tx.objectStore(store).get(key)

      req.onsuccess = () => {
        const entry = req.result
        if (!entry) return resolve(null)

        const ttl = TTL[store] ?? 0
        if (ttl > 0 && Date.now() - entry.timestamp > ttl) {
          resolve(null)
          return
        }

        memCache.set(memKey, entry.data, ttl ?? 5 * 60 * 1000)
        resolve(entry.data)
      }
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

/**
 * Set a value in cache with current timestamp.
 * @param {string} store - Store name
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 */
export async function set(store, key, data) {
  const memKey = `${store}:${key}`
  const ttl = TTL[store] ?? 5 * 60 * 1000
  memCache.set(memKey, data, ttl)

  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(store, 'readwrite')
      tx.objectStore(store).put({ data, timestamp: Date.now() }, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
  } catch {
    // Cache write failure is non-fatal
  }
}

/**
 * Remove a specific cache entry.
 * @param {string} store - Store name
 * @param {string} key - Cache key
 */
export async function invalidate(store, key) {
  memCache.delete(`${store}:${key}`)
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(store, 'readwrite')
      tx.objectStore(store).delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
  } catch {
    // Non-fatal
  }
}

/**
 * Clear all stores. Called on sign-out and user switch
 * to prevent data leaking between accounts on the same device.
 */
export async function clearAll() {
  memCache.clear()
  try {
    const db = await openDB()

    for (const storeName of STORES) {
      await new Promise((resolve) => {
        const tx = db.transaction(storeName, 'readwrite')
        tx.objectStore(storeName).clear()
        tx.oncomplete = () => resolve()
        tx.onerror = () => resolve()
      })
    }
  } catch {
    logger.error('clearAll failed')
  }
}

/**
 * @deprecated Use clearAll() instead
 */
export async function invalidateUserData() {
  return clearAll()
}
