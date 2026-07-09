import { memo } from 'react'
import { BottomSheet, Button, SectionLabel } from '../ui'

function PhaseBottomSheet({
  isOpen,
  onClose,
  programme,
  phases,
  currentPhase,
  weekInPhase: _weekInPhase,
  phaseWeeks,
}) {
  const totalPhases = phases?.length ?? phaseWeeks?.length ?? 5

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} height="90vh">
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="px-6 pt-2">
            <SectionLabel label="YOUR PROGRAMME" />
            <h2 className="text-[20px] font-black tracking-[-0.03em] text-white mt-1">
              {programme?.name ?? 'Programme'}
            </h2>
            {programme?.goal && (
              <p className="text-[13px] text-disabled mt-1 leading-relaxed">{programme.goal}</p>
            )}
          </div>

          {/* Phase list */}
          <div className="px-6 mt-6">
            {Array.from({ length: totalPhases }, (_, i) => {
              const p = i + 1
              const phaseDef = phases?.find((ph) => ph.phase_number === p)
              const isCurrent = p === currentPhase
              const isCompleted = p < currentPhase
              const isFuture = p > currentPhase
              const name = phaseDef?.name ?? `Phase ${p}`
              const goal = phaseDef?.description ?? ''
              const wks = phaseDef?.weeks_count ?? phaseWeeks?.[i] ?? 4
              const isOngoing = wks === 999

              let startWk = 1
              for (let j = 0; j < i; j++) {
                const pw = phaseWeeks?.[j] ?? 4
                if (pw !== 999) startWk += pw
              }
              const weekRange = isOngoing ? 'ONGOING' : `WK ${startWk}–${startWk + wks - 1}`

              return (
                <div
                  key={p}
                  className="flex items-start gap-4 py-4 border-b border-surface"
                  style={isCompleted ? { opacity: 0.6 } : undefined}
                >
                  <div
                    className="w-8 h-8 flex items-center justify-center shrink-0"
                    style={{
                      background: isCompleted
                        ? 'var(--success)'
                        : isCurrent
                          ? 'var(--accent)'
                          : 'var(--surface)',
                    }}
                  >
                    <span
                      className="text-[13px] font-black"
                      style={{ color: isFuture ? 'var(--placeholder)' : 'var(--white)' }}
                    >
                      {p}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <span
                      className="text-[16px] font-bold block"
                      style={{ color: isFuture ? 'var(--disabled)' : 'var(--white)' }}
                    >
                      {name.toUpperCase()}
                    </span>
                    {goal && (
                      <span
                        className="text-[13px] mt-0.5 leading-relaxed block"
                        style={{ color: isFuture ? 'var(--placeholder)' : 'var(--text-secondary)' }}
                      >
                        {goal}
                      </span>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-disabled">{weekRange}</span>
                      {isCurrent && (
                        <span className="text-[11px] text-accent font-semibold">● CURRENT</span>
                      )}
                      {isCompleted && (
                        <span className="text-[11px] text-success font-semibold">✓ COMPLETE</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Close button */}
        <div className="px-6 pb-8 pt-4 shrink-0">
          <Button variant="secondary" label="CLOSE" onPress={onClose} />
        </div>
      </div>
    </BottomSheet>
  )
}

export default memo(PhaseBottomSheet)
