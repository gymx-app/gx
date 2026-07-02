import { useState } from 'react'
import { colors } from '../../../styles/tokens'
import { supabase } from '../../../lib/supabase'
import type { FitnessLevel, WizardState } from '../useWizardState'
import { FieldError, FieldHelper, MultiSelectPills, PillButton } from './shared'
import { INPUT_STYLE } from './sharedUtils'
import { WizardCta } from './WizardCta'

const FITNESS_LEVEL_OPTIONS: {
  value: NonNullable<FitnessLevel>
  label: string
  description: string
}[] = [
  {
    value: 'beginner',
    label: 'Beginner',
    description: 'Under 1 year consistent training. Technique and base-building come first.',
  },
  {
    value: 'intermediate',
    label: 'Intermediate',
    description: '1–3 years. Ready for periodisation and progressive overload.',
  },
  {
    value: 'advanced',
    label: 'Advanced',
    description: '3+ years serious training. High intensity, high specificity.',
  },
]

const LIFESTYLE_OPTIONS = [
  'Sedentary (desk job, minimal movement)',
  'Lightly Active (walk occasionally)',
  'Moderately Active (on feet most of day)',
  'Very Active (physical work or sport regularly)',
  'Shift Worker (irregular hours)',
  'Frequently Travelling',
  'High Stress / Low Sleep',
]

const OCCUPATION_OPTIONS = [
  'Student',
  'Desk Job / Office Worker',
  'Field / On-site Worker',
  'Healthcare Professional',
  'Athlete / Coach',
  'Homemaker',
  'Business Owner / Entrepreneur',
  'Creative / Freelancer',
  'Retired',
  'Other',
]

interface Props {
  wizardState: WizardState
  setField: (key: string, value: unknown) => void
  userId: string
  onSaved: (step: number) => void
}

export function Screen4Capability({ wizardState, setField, userId, onSaved }: Props) {
  const [attempted, setAttempted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const valid = !!wizardState.fitness_level && wizardState.lifestyle.length > 0
  const description = FITNESS_LEVEL_OPTIONS.find(
    (o) => o.value === wizardState.fitness_level
  )?.description

  const handleContinue = async () => {
    setAttempted(true)
    if (!valid) return
    setSaving(true)
    setError(null)

    const { error: dbError } = await supabase.from('user_health').upsert(
      {
        user_id: userId,
        fitness_level: wizardState.fitness_level,
        lifestyle: wizardState.lifestyle,
        occupation: wizardState.occupation ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({ onboarding_step: 4, updated_at: new Date().toISOString() })
      .eq('user_id', userId)

    setSaving(false)
    if (dbError || profileError) {
      setError('Failed to save your details. Please try again.')
      return
    }
    onSaved(4)
  }

  return (
    <>
      <h1 className="font-['Bebas_Neue'] text-[32px] tracking-[2px] text-[#f0ede8] leading-none">
        HOW HARD CAN WE PUSH YOU?
      </h1>
      <p
        className="text-[14px] font-['DM_Sans'] mt-2 mb-6 leading-relaxed"
        style={{ color: colors.muted }}
      >
        Your fitness level and lifestyle tell Odin how much volume and intensity your body can
        handle and recover from.
      </p>

      <div className="mb-6">
        <p
          className="text-[10px] font-['DM_Sans'] font-bold tracking-[2px] uppercase mb-2"
          style={{ color: colors.muted }}
        >
          FITNESS LEVEL
        </p>
        <div className="flex gap-2">
          {FITNESS_LEVEL_OPTIONS.map((opt) => (
            <PillButton
              key={opt.value}
              label={opt.label}
              active={wizardState.fitness_level === opt.value}
              onTap={() => setField('fitness_level', opt.value)}
            />
          ))}
        </div>
        {attempted && !wizardState.fitness_level && <FieldError text="Select your fitness level" />}
        {description && <FieldHelper text={description} />}
      </div>

      <div className="mb-6">
        <p
          className="text-[14px] font-['DM_Sans'] font-medium mb-1.5"
          style={{ color: colors.textSecondary }}
        >
          Your Daily Activity
        </p>
        <p
          className="text-[12px] font-['DM_Sans'] mb-3 leading-relaxed"
          style={{ color: colors.muted }}
        >
          Outside the gym, how active are you? This affects recovery capacity — even with identical
          training goals.
        </p>
        <MultiSelectPills
          options={LIFESTYLE_OPTIONS}
          values={wizardState.lifestyle}
          onChange={(v) => setField('lifestyle', v)}
        />
        {attempted && wizardState.lifestyle.length === 0 && (
          <FieldError text="Select at least one" />
        )}
      </div>

      <div className="mb-2">
        <p
          className="text-[14px] font-['DM_Sans'] font-medium mb-1.5"
          style={{ color: colors.textSecondary }}
        >
          Your Occupation (Optional)
        </p>
        <p
          className="text-[12px] font-['DM_Sans'] mb-3 leading-relaxed"
          style={{ color: colors.muted }}
        >
          Daily mental and physical load both affect training capacity and recovery.
        </p>
        <select
          value={wizardState.occupation ?? ''}
          onChange={(e) => setField('occupation', e.target.value || null)}
          className="h-[52px] w-full px-[14px] text-[#f0ede8] text-[15px] font-['DM_Sans']"
          style={INPUT_STYLE}
        >
          <option value="">Select (optional)</option>
          {OCCUPATION_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {error && <FieldError text={error} />}

      <WizardCta
        label="CONTINUE →"
        disabled={!valid}
        saving={saving}
        onTap={() => void handleContinue()}
      />
    </>
  )
}
