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

  const showOffline = offlineReady && !dismissed

  return (
    <>
      {needRefresh && (
        <div
          className="fixed bottom-0 left-0 right-0 z-[90] bg-[#111111] border-t border-[#2a2a2a] px-4 py-3 flex justify-between items-center"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
        >
          <span className="text-[13px] text-white">Update available</span>
          <button
            onClick={() => void updateServiceWorker(true)}
            className="text-[13px] font-semibold text-[#ff4520] active:opacity-70"
          >
            UPDATE NOW
          </button>
        </div>
      )}

      {showOffline && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] bg-[#1a1a1a] border border-[#2a2a2a] px-4 py-2">
          <span className="text-[13px] text-[#888888]">App ready for offline use</span>
        </div>
      )}
    </>
  )
}
