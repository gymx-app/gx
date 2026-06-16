export const PRIORITY = { CRITICAL: 0, HIGH: 1, NORMAL: 2, LOW: 3 }

let seq = 0

// Min-heap sorted by (priority, enqueueTime)
const heap = []
const inFlight = new Map()
let running = 0
const MAX_CONCURRENCY = 4

function heapPush(item) {
  heap.push(item)
  let i = heap.length - 1
  while (i > 0) {
    const parent = (i - 1) >> 1
    if (cmp(heap[i], heap[parent]) < 0) {
      ;[heap[i], heap[parent]] = [heap[parent], heap[i]]
      i = parent
    } else break
  }
}

function heapPop() {
  if (heap.length === 0) return null
  const top = heap[0]
  const last = heap.pop()
  if (heap.length > 0) {
    heap[0] = last
    let i = 0
    while (true) {
      let smallest = i
      const l = 2 * i + 1
      const r = 2 * i + 2
      if (l < heap.length && cmp(heap[l], heap[smallest]) < 0) smallest = l
      if (r < heap.length && cmp(heap[r], heap[smallest]) < 0) smallest = r
      if (smallest === i) break
      ;[heap[i], heap[smallest]] = [heap[smallest], heap[i]]
      i = smallest
    }
  }
  return top
}

function cmp(a, b) {
  if (a.priority !== b.priority) return a.priority - b.priority
  return a.seq - b.seq
}

function cancelLowPriority() {
  for (let i = heap.length - 1; i >= 0; i--) {
    if (heap[i].priority === PRIORITY.LOW) {
      heap[i].abort.abort()
      heap[i].reject(new DOMException('Cancelled', 'AbortError'))
      heap.splice(i, 1)
    }
  }
  // Rebuild heap after removals
  if (heap.length > 1) {
    const items = heap.splice(0)
    for (const item of items) heapPush(item)
  }
}

async function execute(item) {
  running++
  try {
    const result = await item.fn(item.abort.signal)

    if (result?.error) {
      throw result.error
    }

    item.resolve(result)
  } catch (err) {
    if (err?.name === 'AbortError') {
      item.reject(err)
    } else if (item.priority <= PRIORITY.HIGH && !item.retried) {
      item.retried = true
      await new Promise(r => setTimeout(r, 300))
      if (!item.abort.signal.aborted) {
        try {
          const result = await item.fn(item.abort.signal)
          if (result?.error) throw result.error
          item.resolve(result)
        } catch (retryErr) {
          item.reject(retryErr)
        }
      } else {
        item.reject(err)
      }
    } else {
      item.reject(err)
    }
  } finally {
    running--
    inFlight.delete(item.id)
    drain()
  }
}

function drain() {
  while (running < MAX_CONCURRENCY && heap.length > 0) {
    const item = heapPop()
    if (item.abort.signal.aborted) {
      item.reject(new DOMException('Cancelled', 'AbortError'))
      continue
    }
    inFlight.set(item.id, item)
    execute(item)
  }
}

export function enqueue(id, priority, fn) {
  const existing = inFlight.get(id)
  if (existing) {
    return new Promise((resolve, reject) => {
      const origResolve = existing.resolve
      const origReject = existing.reject
      existing.resolve = (v) => { origResolve(v); resolve(v) }
      existing.reject = (e) => { origReject(e); reject(e) }
    })
  }

  const queued = heap.find(item => item.id === id)
  if (queued) {
    return new Promise((resolve, reject) => {
      const origResolve = queued.resolve
      const origReject = queued.reject
      queued.resolve = (v) => { origResolve(v); resolve(v) }
      queued.reject = (e) => { origReject(e); reject(e) }
    })
  }

  if (priority <= PRIORITY.HIGH) {
    cancelLowPriority()
  }

  return new Promise((resolve, reject) => {
    const abort = new AbortController()
    heapPush({
      id,
      priority,
      fn,
      resolve,
      reject,
      abort,
      seq: seq++,
      retried: false,
    })
    drain()
  })
}

export function cancelAll() {
  for (const item of heap) {
    item.abort.abort()
    item.reject(new DOMException('Cancelled', 'AbortError'))
  }
  heap.length = 0

  for (const [, item] of inFlight) {
    item.abort.abort()
  }
}
