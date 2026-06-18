let quality = 'good'
let listeners = []

function detect() {
  const conn = navigator.connection ?? navigator.mozConnection ?? navigator.webkitConnection
  if (!conn) return 'good'

  if (!conn.effectiveType || conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') {
    return 'poor'
  }
  if (conn.effectiveType === '3g' || (conn.downlink && conn.downlink < 1.5)) {
    return 'moderate'
  }
  return 'good'
}

function update() {
  const prev = quality
  quality = detect()
  if (prev !== quality) {
    listeners.forEach((fn) => fn(quality))
  }
}

export function initNetworkQuality() {
  quality = detect()
  const conn = navigator.connection ?? navigator.mozConnection ?? navigator.webkitConnection
  if (conn) {
    conn.addEventListener('change', update)
  }
  window.addEventListener('online', update)
  window.addEventListener('offline', () => {
    quality = 'offline'
    listeners.forEach((fn) => fn(quality))
  })
}

export function getNetworkQuality() {
  return quality
}

export function onQualityChange(fn) {
  listeners.push(fn)
  return () => {
    listeners = listeners.filter((l) => l !== fn)
  }
}

export function getTTLMultiplier() {
  if (quality === 'poor' || quality === 'offline') return 3
  if (quality === 'moderate') return 2
  return 1
}
