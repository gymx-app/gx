import { colors, radius } from '../../../styles/tokens'

export function Screen1Hook({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex items-center justify-center px-6">
        <div
          className="relative w-full overflow-hidden p-4"
          style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.cardLg,
          }}
        >
          <p
            className="font-['Bebas_Neue'] text-[11px] tracking-[2px]"
            style={{ color: colors.disabled }}
          >
            PHASE 1 — FOUNDATION
          </p>
          <div className="mt-3 space-y-2">
            {['Week 1', 'Week 2', 'Week 3'].map((wk) => (
              <div key={wk} className="flex items-center gap-2">
                <span className="text-[11px] font-['DM_Sans']" style={{ color: colors.disabled }}>
                  {wk}
                </span>
                <div className="flex gap-1.5">
                  {['Push', 'Pull', 'Legs'].map((day) => (
                    <span
                      key={day}
                      className="text-[10px] font-['DM_Sans'] px-2 py-1"
                      style={{
                        background: colors.surface3,
                        color: colors.disabled,
                        borderRadius: 6,
                      }}
                    >
                      {day}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div
            className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
            style={{ background: `linear-gradient(transparent, ${colors.bg})` }}
          />
        </div>
      </div>

      <div className="px-6 pb-4">
        <h1 className="font-['Bebas_Neue'] text-[36px] tracking-[1px] text-text leading-[1.05]">
          YOUR PROGRAMME.
          <br />
          BUILT BY <span style={{ color: colors.accent }}>AI</span>.
          <br />
          BACKED BY SCIENCE.
        </h1>
        <p
          className="text-[14px] font-['DM_Sans'] mt-4 leading-relaxed"
          style={{ color: colors.muted }}
        >
          Answer a few questions. Odin builds a personalised training programme in under 60 seconds.
        </p>

        <button
          onClick={onContinue}
          className="w-full mt-6 py-4 font-['Bebas_Neue'] text-[18px] tracking-[2px] transition-all duration-150 active:scale-[0.98]"
          style={{
            borderRadius: radius.button,
            background: colors.accent,
            color: colors.white,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          LET'S BUILD IT →
        </button>
      </div>
    </div>
  )
}
