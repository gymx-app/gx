import { colors } from '../../../styles/tokens'
import type { WizardState } from '../useWizardState'
import { SelectableCard } from './shared'
import { WizardCta } from './WizardCta'

const GOALS = [
  {
    value: 'fat_loss',
    label: 'FAT LOSS',
    description:
      'Burn fat while preserving muscle. Moderate loads, shorter rest, strategic conditioning.',
    confirmation: "We'll preserve muscle while maximising fat expenditure.",
    cta: "FAT LOSS — LET'S GO →",
  },
  {
    value: 'muscle_gain',
    label: 'MUSCLE GAIN',
    description:
      'Build size through progressive overload. Higher volumes, heavier loads, longer rest.',
    confirmation: 'Progressive overload, higher volumes, longer rest.',
    cta: "BUILD MUSCLE — LET'S GO →",
  },
  {
    value: 'strength',
    label: 'STRENGTH',
    description:
      'Get stronger on the lifts that matter. Percentage-based loading and peaking protocols.',
    confirmation: 'Percentage-based loading anchored to your primary lift.',
    cta: "GET STRONGER — LET'S GO →",
  },
  {
    value: 'recomposition',
    label: 'RECOMPOSITION',
    description:
      'Lose fat and build muscle simultaneously. Precise programming — slower than either goal alone.',
    confirmation: 'Simultaneous fat loss and muscle gain. Slower but achievable.',
    cta: "RECOMPOSITION — LET'S GO →",
  },
  {
    value: 'general_fitness',
    label: 'GENERAL FITNESS',
    description: 'Build a well-rounded base. Balanced strength and conditioning.',
    confirmation: 'Balanced strength and conditioning. Built to last.',
    cta: "GENERAL FITNESS — LET'S GO →",
  },
]

interface Props {
  wizardState: WizardState
  setField: (key: string, value: unknown) => void
  onContinue: () => void
}

export function Screen5Commitment({ wizardState, setField, onContinue }: Props) {
  const selected = GOALS.find((g) => g.value === wizardState.goal)

  return (
    <>
      <h1 className="font-['Bebas_Neue'] text-[32px] tracking-[2px] text-text leading-none">
        WHAT ARE YOU TRAINING FOR?
      </h1>
      <p
        className="text-[14px] font-['DM_Sans'] mt-2 mb-6 leading-relaxed"
        style={{ color: colors.muted }}
      >
        This shapes everything. Choose the goal that matters most right now.
      </p>

      {GOALS.map((g) => (
        <SelectableCard
          key={g.value}
          title={g.label}
          description={g.description}
          active={wizardState.goal === g.value}
          onTap={() => setField('goal', g.value)}
        />
      ))}

      {selected && (
        <div className="p-3 mt-2" style={{ background: colors.surface2, borderRadius: 12 }}>
          <p className="text-[13px] font-['DM_Sans']" style={{ color: colors.textSecondary }}>
            {selected.confirmation}
          </p>
        </div>
      )}

      <WizardCta
        label={selected ? selected.cta : 'SELECT A GOAL TO CONTINUE'}
        disabled={!selected}
        onTap={onContinue}
      />
    </>
  )
}
