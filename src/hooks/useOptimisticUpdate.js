import {
  incrementActiveWrites,
  decrementActiveWrites,
  updatePendingQueue,
} from '../services/syncState'
import { getPendingCount } from '../services/syncQueue'
import { logger } from '../lib/logger'

export default function useOptimisticUpdate() {
  const execute = async ({
    optimisticUpdate,
    idbWrite,
    supabaseWrite,
    rollback: _rollback,
    syncKey,
  }) => {
    optimisticUpdate()

    try {
      await idbWrite()
    } catch (err) {
      console.warn('IDB write failed:', err)
    }

    incrementActiveWrites()
    supabaseWrite()
      .then(() => {
        decrementActiveWrites()
        updatePendingQueue(getPendingCount())
      })
      .catch((err) => {
        decrementActiveWrites()
        logger.warn('Supabase write failed:', syncKey, err)
        updatePendingQueue(getPendingCount())
      })
  }

  return { execute }
}
