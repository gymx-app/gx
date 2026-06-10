import { useEffect, useState } from 'react'

export default function SplashScreen() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Trigger CSS transition on next frame
    requestAnimationFrame(() => setProgress(100))
  }, [])

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center">
      <span className="text-[72px] font-black tracking-[-0.05em] text-[#ff4520] leading-none">
        GX
      </span>
      <span className="text-[11px] tracking-[0.15em] uppercase text-[#333333] font-medium mt-2">
        BUILT FOR DISCIPLINE
      </span>

      {/* Loading bar */}
      <div className="fixed bottom-12 left-8 right-8 h-[2px] bg-[#1a1a1a]">
        <div
          className="h-full bg-[#ff4520]"
          style={{
            width: `${progress}%`,
            transition: 'width 1.5s ease-out',
          }}
        />
      </div>
    </div>
  )
}
