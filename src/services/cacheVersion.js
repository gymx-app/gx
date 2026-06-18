import { clearAll } from './idbCache'
import { memCache } from './memoryCache'

const CACHE_VERSION_KEY = 'gx-cache-version'
const CURRENT_VERSION = 1

export function checkCacheVersion() {
  const stored = localStorage.getItem(CACHE_VERSION_KEY)
  if (stored && Number(stored) === CURRENT_VERSION) return

  console.warn(`[cache] version mismatch: ${stored} → ${CURRENT_VERSION}, clearing`)
  void clearAll()
  memCache.clear()
  localStorage.setItem(CACHE_VERSION_KEY, String(CURRENT_VERSION))
}
