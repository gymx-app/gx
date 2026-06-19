import { memo } from 'react'
import { Check } from 'lucide-react'

interface Props {
  pullProgress: number
  ptrState: 'idle' | 'pulling' | 'triggered' | 'refreshing' | 'done'
}

const PullToRefreshIndicator = memo(function PullToRefreshIndicator({
  pullProgress,
  ptrState,
}: Props) {
  if (ptrState === 'idle' && pullProgress === 0) return null

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-[6px]"
      style={{
        top: -40,
        width: 120,
        height: 32,
        background: '#141414',
        border: '1px solid #2a2a2a',
        borderRadius: 20,
        opacity: ptrState === 'idle' ? 0 : 1,
        transition: 'opacity 150ms ease',
      }}
    >
      <svg width={18} height={18} viewBox="0 0 18 18">
        <circle cx={9} cy={9} r={6} fill="none" stroke="#2a2a2a" strokeWidth={1.5} />
        {ptrState === 'refreshing' ? (
          <circle
            cx={9}
            cy={9}
            r={6}
            fill="none"
            stroke="#ff4520"
            strokeWidth={1.5}
            strokeDasharray="28 9.7"
            strokeLinecap="round"
            style={{ animation: 'ptr-spin 0.8s linear infinite', transformOrigin: '9px 9px' }}
          />
        ) : (
          <circle
            cx={9}
            cy={9}
            r={6}
            fill="none"
            stroke="#ff4520"
            strokeWidth={1.5}
            strokeDasharray={`${pullProgress * 37.7} 37.7`}
            strokeLinecap="round"
            transform="rotate(-90 9 9)"
          />
        )}
      </svg>
      <span
        className="text-[11px] font-medium tracking-[0.5px] uppercase"
        style={{ color: '#666666', fontFamily: "'DM Sans', sans-serif" }}
      >
        {ptrState === 'done' ? (
          <Check size={12} strokeWidth={2.5} color="#22c55e" />
        ) : ptrState === 'refreshing' ? (
          'SYNCING'
        ) : ptrState === 'triggered' ? (
          'RELEASE'
        ) : (
          'PULL'
        )}
      </span>
      <style>{`@keyframes ptr-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
})

export default PullToRefreshIndicator
