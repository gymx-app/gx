import { useState, useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export default function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW()

  const [showOffline, setShowOffline] = useState(false)

  // Show offline toast briefly
  useEffect(() => {
    if (offlineReady) {
      setShowOffline(true)
      const t = setTimeout(() => setShowOffline(false), 3000)
      return () => clearTimeout(t)
    }
  }, [offlineReady])

  return (
    <>
      {/* Update banner */}
      {needRefresh && (
        <div className="fixed bottom-0 left-0 right-0 z-[90] bg-[#111111] border-t border-[#2a2a2a] px-4 py-3 flex justify-between items-center safe-area-bottom">
          <span className="text-[13px] text-white">Update available</span>
          <button
            onClick={() => updateServiceWorker(true)}
            className="text-[13px] font-semibold text-[#ff4520] active:opacity-70"
          >
            UPDATE NOW
          </button>
        </div>
      )}

      {/* Offline ready toast */}
      {showOffline && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] bg-[#1a1a1a] border border-[#2a2a2a] px-4 py-2">
          <span className="text-[13px] text-[#888888]">App ready for offline use</span>
        </div>
      )}
    </>
  )
}
