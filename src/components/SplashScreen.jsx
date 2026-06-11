import { useEffect, useState, useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

const MESSAGES = [
  'Loading your programme',
  'Checking your progress',
  'Syncing workout data',
  'Almost ready',
]

const UPDATE_MESSAGE = 'Updating to latest version'

export default function SplashScreen() {
  const [msgIndex, setMsgIndex] = useState(0)
  const intervalRef = useRef(null)

  // PWA update detection
  const {
    needRefresh: [needRefresh],
  } = useRegisterSW()

  // Cycle status messages every 600ms
  useEffect(() => {
    if (needRefresh) return // Don't cycle when updating

    intervalRef.current = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % MESSAGES.length)
    }, 600)

    return () => clearInterval(intervalRef.current)
  }, [needRefresh])

  const statusText = needRefresh ? UPDATE_MESSAGE : MESSAGES[msgIndex]

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Splash image — covers entire screen */}
      <img
        src={`${import.meta.env.BASE_URL}splash.png`}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />

      {/* Loading indicator + status message */}
      <div className="absolute bottom-16 left-0 right-0 flex flex-col items-center gap-4">
        {/* Circular spinner */}
        <div
          className="w-8 h-8 rounded-full"
          style={{
            border: '2px solid #2a2a2a',
            borderTop: '2px solid #ff4520',
            animation: 'gx-spin 800ms linear infinite',
          }}
        />

        {/* Status message */}
        <p className="text-[11px] tracking-[0.12em] uppercase text-[#555555] font-medium text-center">
          {statusText}
        </p>
      </div>

      {/* Keyframes for spinner */}
      <style>{`
        @keyframes gx-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
