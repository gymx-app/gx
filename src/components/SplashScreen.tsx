import { useEffect, useState, useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

const MESSAGES = [
  'Loading your programme',
  'Checking your progress',
  'Syncing workout data',
  'Almost ready',
]

const UPDATE_MESSAGE = 'Updating to latest version'
const BUILD_VERSION = __BUILD_VERSION__

export default function SplashScreen() {
  const [msgIndex, setMsgIndex] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const {
    needRefresh: [needRefresh],
  } = useRegisterSW()

  useEffect(() => {
    if (needRefresh) return

    intervalRef.current = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % MESSAGES.length)
    }, 600)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [needRefresh])

  const statusText = needRefresh ? UPDATE_MESSAGE : MESSAGES[msgIndex]

  return (
    <div className="fixed inset-0 z-[100]">
      <img
        src={`${import.meta.env.BASE_URL}splash.png`}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />

      <div
        className="absolute left-0 right-0 flex flex-col items-center gap-4"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 48px)' }}
      >
        <div
          className="w-9 h-9 rounded-full"
          style={{
            border: '2.5px solid var(--border-subtle)',
            borderTopColor: 'var(--accent)',
            animation: 'gx-spin 700ms linear infinite',
          }}
        />

        <p className="text-[11px] tracking-[3px] uppercase text-muted font-medium text-center font-['DM_Sans']">
          {statusText}
        </p>
        <p className="text-[9px] text-placeholder font-mono mt-1">v{BUILD_VERSION}</p>
      </div>

      <style>{`
        @keyframes gx-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
