import { useState, useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export default function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW()

  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!offlineReady) return
    const t = setTimeout(() => setDismissed(true), 3000)
    return () => clearTimeout(t)
  }, [offlineReady])

  // Apply and reload as soon as an update is detected — no confirmation prompt.
  useEffect(() => {
    if (needRefresh) void updateServiceWorker(true)
  }, [needRefresh, updateServiceWorker])

  const showOffline = offlineReady && !dismissed

  return (
    <>
      {showOffline && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] bg-surface border border-border px-4 py-2">
          <span className="text-[13px] text-text-secondary">App ready for offline use</span>
        </div>
      )}
    </>
  )
}
