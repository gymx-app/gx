const QUEUE_KEY = 'gx-sync-queue'

function loadQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export function queueSync(operation) {
  const queue = loadQueue()
  queue.push({
    ...operation,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    retries: 0,
  })
  saveQueue(queue)
}

export async function flushSyncQueue(supabase) {
  const queue = loadQueue()
  if (!queue.length) return

  const failed = []
  for (const op of queue) {
    try {
      const { table, type, data, match } = op
      if (type === 'upsert') {
        const { error } = await supabase.from(table).upsert(data)
        if (error) throw error
      } else if (type === 'insert') {
        const { error } = await supabase.from(table).insert(data)
        if (error) throw error
      } else if (type === 'update') {
        const { error } = await supabase.from(table).update(data).match(match)
        if (error) throw error
      }
    } catch (err) {
      op.retries++
      if (op.retries < 5) {
        failed.push(op)
      } else {
        console.error('[syncQueue] dropping after 5 retries:', op, err)
      }
    }
  }
  saveQueue(failed)
}

export function getPendingCount() {
  return loadQueue().length
}

export function clearSyncQueue() {
  localStorage.removeItem(QUEUE_KEY)
}
