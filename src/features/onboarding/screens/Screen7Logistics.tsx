import { colors } from '../../../styles/tokens'
import type { Equipment, WizardState, WorkoutTime } from '../useWizardState'
import { FieldHelper, PillButton, SectionLabel, SelectableCard, Stepper } from './shared'
import { WizardCta } from './WizardCta'

const EQUIPMENT_OPTIONS: { value: NonNullable<Equipment>; label: string; description: string }[] = [
  { value: 'full_gym', label: 'FULL GYM', description: 'Barbells, dumbbells, cables, machines.' },
  {
    value: 'dumbbells_only',
    label: 'DUMBBELLS ONLY',
    description: 'DB press, rows, lunges — effective and versatile.',
  },
  { value: 'home_gym', label: 'HOME GYM', description: 'Mixed equipment at home.' },
  {
    value: 'bodyweight_only',
    label: 'BODYWEIGHT ONLY',
    description: 'No equipment. Pure calisthenics.',
  },
]

const DURATIONS = [30, 45, 60, 75, 90]

const WORKOUT_TIMES: { value: NonNullable<WorkoutTime>; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
]

interface Props {
  wizardState: WizardState
  setField: (key: string, value: unknown) => void
  goToStep: (n: number) => void
  onContinue: () => void
}

export function Screen7Logistics({ wizardState, setField, goToStep, onContinue }: Props) {
  const valid =
    !!wizardState.equipment &&
    wizardState.available_days_per_week > 0 &&
    wizardState.session_duration_min > 0

  const handleEquipmentSelect = (value: NonNullable<Equipment>) => {
    setField('equipment', value)
    if (value === 'bodyweight_only') setField('baseline_path', 'skipped')
  }

  const handleContinue = () => {
    if (wizardState.equipment === 'bodyweight_only') {
      goToStep(9)
    } else {
      onContinue()
    }
  }

  return (
    <>
      <h1 className="font-['Bebas_Neue'] text-[32px] tracking-[2px] text-text leading-none">
        YOUR TRAINING SETUP
      </h1>
      <p
        className="text-[14px] font-['DM_Sans'] mt-2 mb-6 leading-relaxed"
        style={{ color: colors.muted }}
      >
        Practical decisions. Be realistic — a plan you follow beats a perfect plan you don't.
      </p>

      <div className="mb-6">
        <p
          className="text-[14px] font-['DM_Sans'] font-medium mb-1.5"
          style={{ color: colors.textSecondary }}
        >
          Equipment Access
        </p>
        <p
          className="text-[12px] font-['DM_Sans'] mb-3 leading-relaxed"
          style={{ color: colors.muted }}
        >
          Equipment determines which exercises are available. Be accurate — a gym programme done at
          home will not work.
        </p>
        {EQUIPMENT_OPTIONS.map((opt) => (
          <SelectableCard
            key={opt.value}
            title={opt.label}
            description={opt.description}
            active={wizardState.equipment === opt.value}
            onTap={() => handleEquipmentSelect(opt.value)}
          />
        ))}
      </div>

      <div className="mb-6">
        <SectionLabel label="DAYS PER WEEK" className="mb-2" />
        <Stepper
          value={wizardState.available_days_per_week}
          min={2}
          max={6}
          onChange={(v) => setField('available_days_per_week', v)}
        />
        <FieldHelper text="A 6-day programme followed 3 days loses to a 4-day programme completed every week." />
      </div>

      <div className="mb-6">
        <SectionLabel label="SESSION DURATION" className="mb-2" />
        <div className="flex gap-2">
          {DURATIONS.map((d) => (
            <PillButton
              key={d}
              label={`${d}m`}
              active={wizardState.session_duration_min === d}
              onTap={() => setField('session_duration_min', d)}
            />
          ))}
        </div>
        <FieldHelper text="Including warmup and cooldown." />
      </div>

      <div className="mb-2">
        <SectionLabel label="PREFERRED WORKOUT TIME (OPTIONAL)" className="mb-2" />
        <div className="flex gap-2">
          {WORKOUT_TIMES.map((opt) => (
            <PillButton
              key={opt.value}
              label={opt.label}
              active={wizardState.preferred_workout_time === opt.value}
              onTap={() =>
                setField(
                  'preferred_workout_time',
                  wizardState.preferred_workout_time === opt.value ? null : opt.value
                )
              }
            />
          ))}
        </div>
        <FieldHelper text="Morning sessions need a longer warmup — Odin adjusts the warmup protocol automatically." />
      </div>

      <WizardCta label="CONTINUE →" disabled={!valid} onTap={handleContinue} />
    </>
  )
}
