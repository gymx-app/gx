import { memo } from 'react'
import { Check } from 'lucide-react'

interface Props {
  pullProgress: number
  pullDistance: number
  ptrState: 'idle' | 'pulling' | 'triggered' | 'refreshing' | 'done'
}

const PullToRefreshIndicator = memo(function PullToRefreshIndicator({
  pullProgress,
  pullDistance,
  ptrState,
}: Props) {
  if (ptrState === 'idle' && pullProgress === 0) return null

  const visible = ptrState !== 'idle'
  const yOffset =
    ptrState === 'refreshing' || ptrState === 'done' ? 8 : Math.min(pullDistance - 40, 8)

  return (
    <div
      className="fixed left-1/2 z-50 flex items-center gap-2 px-4 py-[6px]"
      style={{
        top: 52,
        width: 120,
        height: 32,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        opacity: visible ? 1 : 0,
        transform: `translateX(-50%) translateY(${yOffset}px)`,
        transition:
          ptrState === 'pulling' || ptrState === 'triggered'
            ? 'opacity 150ms ease'
            : 'opacity 150ms ease, transform 320ms cubic-bezier(0.25, 1, 0.5, 1)',
        pointerEvents: 'none',
      }}
    >
      <svg width={18} height={18} viewBox="0 0 18 18">
        <circle cx={9} cy={9} r={6} fill="none" stroke="var(--border)" strokeWidth={1.5} />
        {ptrState === 'refreshing' ? (
          <circle
            cx={9}
            cy={9}
            r={6}
            fill="none"
            stroke="var(--accent)"
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
            stroke="var(--accent)"
            strokeWidth={1.5}
            strokeDasharray={`${pullProgress * 37.7} 37.7`}
            strokeLinecap="round"
            transform="rotate(-90 9 9)"
          />
        )}
      </svg>
      <span
        className="text-[11px] font-medium tracking-[0.5px] uppercase"
        style={{ color: 'var(--muted)', fontFamily: "'DM Sans', sans-serif" }}
      >
        {ptrState === 'done' ? (
          <Check size={12} strokeWidth={2.5} color="var(--success)" />
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
