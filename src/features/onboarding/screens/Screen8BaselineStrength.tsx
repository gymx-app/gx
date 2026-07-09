import { useState } from 'react'
import { X } from 'lucide-react'
import { colors } from '../../../styles/tokens'
import type { BaselinePath, WizardState } from '../useWizardState'
import { FieldError, SelectableCard } from './shared'
import { INPUT_STYLE } from './sharedUtils'
import { WizardCta } from './WizardCta'

const LIFT_WEIGHT_MIN_KG = 1
const LIFT_WEIGHT_MAX_KG = 500
const LIFT_REPS_MIN = 1
const LIFT_REPS_MAX = 12

const BASELINE_OPTIONS: { value: NonNullable<BaselinePath>; label: string; description: string }[] =
  [
    {
      value: 'self_reported',
      label: 'I KNOW MY WORKING WEIGHTS',
      description:
        'Any recent set taken close to your limit. Odin uses the Epley formula to estimate your 1RM.',
    },
    {
      value: 'day_one_test',
      label: 'TEST ON DAY 1',
      description:
        'Your programme starts with a baseline session. Work up to a hard set of 5 reps on each compound lift — Odin calculates weights from Day 2.',
    },
    {
      value: 'skipped',
      label: 'SKIP — USE RPE ONLY',
      description:
        'Effort targets instead of specific weights. You choose the weight that feels right for each set.',
    },
  ]

const LIFT_OPTIONS: { value: string; label: string }[] = [
  { value: 'squat', label: 'Squat' },
  { value: 'bench_press', label: 'Bench Press' },
  { value: 'deadlift', label: 'Deadlift' },
  { value: 'overhead_press', label: 'Overhead Press' },
  { value: 'barbell_row', label: 'Barbell Row' },
]

interface Props {
  wizardState: WizardState
  setField: (key: string, value: unknown) => void
  onContinue: () => void
}

export function Screen8BaselineStrength({ wizardState, setField, onContinue }: Props) {
  const [weights, setWeights] = useState<Record<string, string>>({})
  const [reps, setReps] = useState<Record<string, string>>({})

  const updateLift = (exerciseId: string, weightKg: string, repCount: string) => {
    const lifts = wizardState.known_lifts.filter((l) => l.exercise_id !== exerciseId)
    const w = parseFloat(weightKg)
    const r = parseInt(repCount, 10)
    const weightValid = !isNaN(w) && w >= LIFT_WEIGHT_MIN_KG && w <= LIFT_WEIGHT_MAX_KG
    const repsValid = !isNaN(r) && r >= LIFT_REPS_MIN && r <= LIFT_REPS_MAX
    if (weightKg.trim() && repCount.trim() && weightValid && repsValid) {
      lifts.push({ exercise_id: exerciseId, weight_kg: w, reps: r })
    }
    setField('known_lifts', lifts)
  }

  const liftFieldInvalid = (raw: string | undefined, min: number, max: number) => {
    if (raw == null || raw.trim() === '') return false
    const n = parseFloat(raw)
    return isNaN(n) || n < min || n > max
  }

  const hasInvalidLiftInput = LIFT_OPTIONS.some(
    (lift) =>
      liftFieldInvalid(weights[lift.value], LIFT_WEIGHT_MIN_KG, LIFT_WEIGHT_MAX_KG) ||
      liftFieldInvalid(reps[lift.value], LIFT_REPS_MIN, LIFT_REPS_MAX)
  )

  return (
    <>
      <h1 className="font-['Bebas_Neue'] text-[32px] tracking-[2px] text-text leading-none">
        YOUR STARTING WEIGHTS
      </h1>
      <p
        className="text-[14px] font-['DM_Sans'] mt-2 mb-6 leading-relaxed"
        style={{ color: colors.muted }}
      >
        Known weights make your programme immediately actionable. Without them Odin uses effort
        targets — valid, but less precise.
      </p>

      {BASELINE_OPTIONS.map((opt) => (
        <div key={opt.value}>
          <SelectableCard
            title={opt.label}
            description={opt.description}
            active={wizardState.baseline_path === opt.value}
            onTap={() => setField('baseline_path', opt.value)}
          />
          {opt.value === 'self_reported' && wizardState.baseline_path === 'self_reported' && (
            <div className="mb-4 -mt-1 px-1">
              {LIFT_OPTIONS.map((lift) => {
                const existing = wizardState.known_lifts.find((l) => l.exercise_id === lift.value)
                const weightRaw = weights[lift.value] ?? String(existing?.weight_kg ?? '')
                const repsRaw = reps[lift.value] ?? String(existing?.reps ?? '')
                const weightInvalid = liftFieldInvalid(
                  weightRaw,
                  LIFT_WEIGHT_MIN_KG,
                  LIFT_WEIGHT_MAX_KG
                )
                const repsInvalid = liftFieldInvalid(repsRaw, LIFT_REPS_MIN, LIFT_REPS_MAX)
                return (
                  <div key={lift.value} className="mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[12px] font-['DM_Sans'] w-24 flex-shrink-0"
                        style={{ color: colors.textSecondary }}
                      >
                        {lift.label}
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={LIFT_WEIGHT_MIN_KG}
                        max={LIFT_WEIGHT_MAX_KG}
                        defaultValue={existing?.weight_kg ?? ''}
                        placeholder="kg"
                        onChange={(e) => {
                          setWeights((prev) => ({ ...prev, [lift.value]: e.target.value }))
                          updateLift(
                            lift.value,
                            e.target.value,
                            reps[lift.value] ?? String(existing?.reps ?? '')
                          )
                        }}
                        className="w-20 h-[40px] px-2 text-[13px] font-['DM_Sans'] text-text placeholder:text-placeholder"
                        style={INPUT_STYLE}
                      />
                      <span
                        className="text-[11px] font-['DM_Sans']"
                        style={{ color: colors.muted }}
                      >
                        for
                      </span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={LIFT_REPS_MIN}
                        max={LIFT_REPS_MAX}
                        defaultValue={existing?.reps ?? ''}
                        placeholder="reps"
                        onChange={(e) => {
                          setReps((prev) => ({ ...prev, [lift.value]: e.target.value }))
                          updateLift(
                            lift.value,
                            weights[lift.value] ?? String(existing?.weight_kg ?? ''),
                            e.target.value
                          )
                        }}
                        className="w-16 h-[40px] px-2 text-[13px] font-['DM_Sans'] text-text placeholder:text-placeholder"
                        style={INPUT_STYLE}
                      />
                    </div>
                    {weightInvalid && (
                      <FieldError
                        text={`Weight must be between ${LIFT_WEIGHT_MIN_KG} and ${LIFT_WEIGHT_MAX_KG} kg`}
                      />
                    )}
                    {repsInvalid && (
                      <FieldError
                        text={`Reps must be between ${LIFT_REPS_MIN} and ${LIFT_REPS_MAX}`}
                      />
                    )}
                  </div>
                )
              })}
              <p className="text-[11px] mt-1 pl-1" style={{ color: colors.muted }}>
                Any recent set taken close to your limit. Odin uses the Epley formula to estimate
                your 1RM.
              </p>
              {wizardState.known_lifts.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {wizardState.known_lifts.map((lift) => {
                    const label = LIFT_OPTIONS.find((o) => o.value === lift.exercise_id)?.label
                    return (
                      <span
                        key={lift.exercise_id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-['DM_Sans'] font-medium"
                        style={{
                          background: colors.surface2,
                          border: `1px solid ${colors.border}`,
                          borderRadius: 999,
                          color: colors.text,
                        }}
                      >
                        {label} — {lift.weight_kg}kg × {lift.reps}
                        <button
                          onClick={() =>
                            setField(
                              'known_lifts',
                              wizardState.known_lifts.filter(
                                (l) => l.exercise_id !== lift.exercise_id
                              )
                            )
                          }
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            lineHeight: 1,
                          }}
                        >
                          <X size={12} color={colors.muted} />
                        </button>
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      <WizardCta
        label="CONTINUE →"
        disabled={!wizardState.baseline_path || hasInvalidLiftInput}
        onTap={onContinue}
      />
    </>
  )
}
