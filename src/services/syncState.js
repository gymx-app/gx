let state = {
  activeWrites: 0,
  pendingQueue: 0,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
}

const listeners = new Set()

function notify() {
  for (const fn of listeners) fn(state)
}

export function getSyncState() {
  return state
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function incrementActiveWrites() {
  state = { ...state, activeWrites: state.activeWrites + 1 }
  notify()
}

export function decrementActiveWrites() {
  state = { ...state, activeWrites: Math.max(0, state.activeWrites - 1) }
  notify()
}

export function updatePendingQueue(count) {
  state = { ...state, pendingQueue: count }
  notify()
}

export function initSyncState() {
  const update = () => {
    state = { ...state, isOnline: navigator.onLine }
    notify()
  }
  window.addEventListener('online', update)
  window.addEventListener('offline', update)
}
