import { useEffect, useState } from 'react'
import { colors } from '../../../styles/tokens'

const MESSAGES = [
  'Analysing your profile...',
  'Building your training strategy...',
  'Sequencing phases and sessions...',
  'Validating your programme...',
]

const MESSAGE_INTERVAL_MS = 10000

export function GenerationLoadingScreen() {
  const [messageIdx, setMessageIdx] = useState(0)

  useEffect(() => {
    if (messageIdx >= MESSAGES.length - 1) return
    const timer = setTimeout(() => setMessageIdx((i) => i + 1), MESSAGE_INTERVAL_MS)
    return () => clearTimeout(timer)
  }, [messageIdx])

  return (
    <div
      className="flex flex-col items-center justify-center h-full px-6"
      style={{ background: colors.bg }}
    >
      <div className="relative w-16 h-16 mb-8">
        <div
          className="absolute inset-0 rounded-full animate-ping"
          style={{ border: `2px solid ${colors.accent}`, opacity: 0.4 }}
        />
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: colors.accentMuted, border: `2px solid ${colors.accent}` }}
        />
      </div>
      <p
        className="text-[14px] font-['DM_Sans'] text-center"
        style={{ color: colors.textSecondary }}
        key={messageIdx}
      >
        {MESSAGES[messageIdx]}
      </p>
    </div>
  )
}
