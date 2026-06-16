const store = new Map()
const MAX_ENTRIES = 100

export const memCache = {
  get(key) {
    const entry = store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      store.delete(key)
      return null
    }
    entry.lastAccessed = Date.now()
    return entry.data
  },

  set(key, data, ttlMs) {
    if (store.size >= MAX_ENTRIES) {
      let lruKey = null
      let lruTime = Infinity
      for (const [k, v] of store) {
        if (v.lastAccessed < lruTime) {
          lruTime = v.lastAccessed
          lruKey = k
        }
      }
      if (lruKey) store.delete(lruKey)
    }
    store.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
      lastAccessed: Date.now(),
    })
  },

  delete(key) { store.delete(key) },

  invalidatePrefix(prefix) {
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) store.delete(key)
    }
  },

  clear() { store.clear() },

  size() { return store.size },
}
