import { useMemo, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { colors, radius } from '../../../styles/tokens'
import { supabase } from '../../../lib/supabase'
import type { Json } from '../../../types/supabase'
import type { InjuryModification, WizardState } from '../useWizardState'
import { FieldError, PillButton, TagPill } from './shared'
import { INPUT_STYLE } from './sharedUtils'
import { WizardCta } from './WizardCta'

const MEDICAL_ALL = [
  'Hypertension',
  'Type 2 Diabetes',
  'Thyroid Disorder',
  'Asthma',
  'Chronic Lower Back Pain',
  'Chronic Knee Pain',
  'Heart Condition (doctor cleared)',
  'Arthritis',
  'None',
]
const MEDICAL_FEMALE_OTHER = [
  'PCOD / PCOS',
  'Endometriosis',
  'Osteoporosis',
  'Pregnancy / Postpartum',
]
const MEDICAL_MALE_OTHER = ['Low Testosterone (diagnosed)', 'Hernia']
const PREGNANCY_LABEL = 'Pregnancy / Postpartum'

const INJURY_SUGGESTIONS = [
  'Shoulder',
  'Knee',
  'Lower Back',
  'Hip',
  'Ankle',
  'Wrist',
  'Elbow',
  'Neck',
  'Upper Back',
  'Hamstring',
  'Quad',
  'Calf',
]

interface Props {
  wizardState: WizardState
  setField: (key: string, value: unknown) => void
  userId: string
  onSaved: (step: number) => void
  onPregnancySaved: () => void
}

export function Screen9Constraints({
  wizardState,
  setField,
  userId,
  onSaved,
  onPregnancySaved,
}: Props) {
  const [injuryInput, setInjuryInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const medicalOptions = useMemo(() => {
    const list = [...MEDICAL_ALL]
    if (wizardState.gender === 'female' || wizardState.gender === 'other')
      list.push(...MEDICAL_FEMALE_OTHER)
    if (wizardState.gender === 'male' || wizardState.gender === 'other')
      list.push(...MEDICAL_MALE_OTHER)
    return list
  }, [wizardState.gender])

  const toggleMedical = (opt: string) => {
    if (opt === 'None') {
      setField(
        'medical_conditions',
        wizardState.medical_conditions.includes('None') ? [] : ['None']
      )
      return
    }
    const withoutNone = wizardState.medical_conditions.filter((v) => v !== 'None')
    setField(
      'medical_conditions',
      withoutNone.includes(opt) ? withoutNone.filter((v) => v !== opt) : [...withoutNone, opt]
    )
  }

  const isPregnant = wizardState.medical_conditions.includes(PREGNANCY_LABEL)

  const addInjury = (area: string) => {
    const trimmed = area.trim()
    if (!trimmed) return
    if (wizardState.injuries.some((i) => i.area.toLowerCase() === trimmed.toLowerCase())) return
    setField('injuries', [...wizardState.injuries, { area: trimmed, modification: null }])
    setInjuryInput('')
  }

  const removeInjury = (area: string) => {
    setField(
      'injuries',
      wizardState.injuries.filter((i) => i.area !== area)
    )
  }

  const setInjuryModification = (area: string, modification: InjuryModification) => {
    setField(
      'injuries',
      wizardState.injuries.map((i) => (i.area === area ? { ...i, modification } : i))
    )
  }

  const remainingSuggestions = INJURY_SUGGESTIONS.filter(
    (s) => !wizardState.injuries.some((i) => i.area.toLowerCase() === s.toLowerCase())
  )

  const injuriesComplete = wizardState.injuries.every((i) => i.modification !== null)

  const saveHealthAndProfile = async (extra: { onboarding_completed: boolean }) => {
    const injuriesV2 = wizardState.injuries.map((i) => ({
      area: i.area,
      modification: i.modification,
      notes: '',
    }))

    const { error: healthError } = await supabase.from('user_health').upsert(
      {
        user_id: userId,
        medical_conditions: wizardState.medical_conditions,
        injuries: wizardState.injuries.map((i) => i.area),
        injuries_v2: injuriesV2,
        goal: wizardState.goal,
        equipment: wizardState.equipment,
        available_days_per_week: wizardState.available_days_per_week,
        session_duration_min: wizardState.session_duration_min,
        preferred_workout_time: wizardState.preferred_workout_time,
        goal_sub_fields: wizardState.goal_sub_fields as unknown as Json,
        baseline_path: wizardState.baseline_path,
        known_lifts: wizardState.known_lifts as unknown as Json,
        target_weight_kg:
          wizardState.goal_sub_fields.target_muscle_gain_kg != null &&
          wizardState.current_weight_kg != null
            ? wizardState.current_weight_kg + wizardState.goal_sub_fields.target_muscle_gain_kg
            : null,
        target_body_fat_pct: wizardState.goal_sub_fields.target_body_fat_pct,
        target_timeframe_weeks: wizardState.goal_sub_fields.target_timeframe_weeks,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    if (healthError) return { error: healthError.message }

    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        onboarding_completed: extra.onboarding_completed,
        onboarding_step: 9,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
    if (profileError) return { error: profileError.message }

    return { error: null }
  }

  const handleContinue = async () => {
    if (!injuriesComplete) return
    setSaving(true)
    setError(null)

    const result = await saveHealthAndProfile({ onboarding_completed: true })
    setSaving(false)
    if (result.error) {
      setError('Failed to save your details. Please try again.')
      return
    }

    if (isPregnant) {
      onPregnancySaved()
    } else {
      onSaved(9)
    }
  }

  return (
    <>
      <h1 className="font-['Bebas_Neue'] text-[32px] tracking-[2px] text-text leading-none">
        LET'S WORK AROUND YOU
      </h1>
      <p
        className="text-[14px] font-['DM_Sans'] mt-2 mb-6 leading-relaxed"
        style={{ color: colors.muted }}
      >
        Not against you. These shape exercise selection — they don't stop you training.
      </p>

      <div className="mb-6">
        <p
          className="text-[14px] font-['DM_Sans'] font-medium mb-1.5"
          style={{ color: colors.textSecondary }}
        >
          Medical Conditions
        </p>
        <p
          className="text-[12px] font-['DM_Sans'] mb-3 leading-relaxed"
          style={{ color: colors.muted }}
        >
          Select anything that applies. Odin adjusts intensity, avoids contraindicated movements,
          and programmes around each condition.
        </p>
        <div className="flex flex-wrap gap-2">
          {medicalOptions.map((opt) => (
            <TagPill
              key={opt}
              label={opt}
              active={wizardState.medical_conditions.includes(opt)}
              onTap={() => toggleMedical(opt)}
            />
          ))}
        </div>

        {isPregnant && (
          <div
            className="mt-3 p-4"
            style={{
              background: 'rgba(245,158,11,0.1)',
              border: `1px solid ${colors.warning}`,
              borderRadius: radius.button,
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <AlertTriangle size={16} color={colors.warning} />
              <p
                className="text-[13px] font-['DM_Sans'] font-medium"
                style={{ color: colors.warning }}
              >
                Programme generation paused
              </p>
            </div>
            <p
              className="text-[13px] font-['DM_Sans'] leading-relaxed"
              style={{ color: colors.warning }}
            >
              Programme generation is not available during pregnancy or postpartum. Your profile
              will be saved and ready when you're cleared to train. Please consult a certified
              pre/postnatal trainer or your physician first.
            </p>
          </div>
        )}
      </div>

      <div className="mb-2">
        <p
          className="text-[14px] font-['DM_Sans'] font-medium mb-1.5"
          style={{ color: colors.textSecondary }}
        >
          Injuries
        </p>
        <p
          className="text-[12px] font-['DM_Sans'] mb-3 leading-relaxed"
          style={{ color: colors.muted }}
        >
          Injuries shape exercise selection more than any other factor. Tell us what's going on and
          whether to work around it or avoid it.
        </p>

        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={injuryInput}
            onChange={(e) => setInjuryInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addInjury(injuryInput)
              }
            }}
            placeholder="Type an area + press Enter"
            className="flex-1 h-[48px] px-[14px] text-[14px] font-['DM_Sans'] text-text placeholder:text-placeholder"
            style={INPUT_STYLE}
          />
          <button
            onClick={() => addInjury(injuryInput)}
            disabled={!injuryInput.trim()}
            className="h-[48px] px-4 text-[13px] font-['DM_Sans'] font-semibold"
            style={{
              borderRadius: radius.input,
              background: injuryInput.trim() ? colors.accent : colors.surface3,
              color: injuryInput.trim() ? colors.white : colors.muted,
              border: 'none',
              cursor: injuryInput.trim() ? 'pointer' : 'default',
            }}
          >
            Add
          </button>
        </div>

        {remainingSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {remainingSuggestions.map((s) => (
              <TagPill key={s} label={s} active={false} onTap={() => addInjury(s)} />
            ))}
          </div>
        )}

        {wizardState.injuries.map((injury) => (
          <div
            key={injury.area}
            className="mb-2.5 p-3"
            style={{
              background: colors.surface2,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.button,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-[13px] font-['DM_Sans'] font-semibold"
                style={{ color: colors.text }}
              >
                {injury.area}
              </span>
              <button
                onClick={() => removeInjury(injury.area)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  lineHeight: 1,
                }}
                aria-label={`Remove ${injury.area}`}
              >
                <X size={14} color={colors.muted} />
              </button>
            </div>
            <div className="flex gap-2">
              <PillButton
                label="Modify"
                active={injury.modification === 'modify'}
                onTap={() => setInjuryModification(injury.area, 'modify')}
              />
              <PillButton
                label="Avoid"
                active={injury.modification === 'avoid'}
                onTap={() => setInjuryModification(injury.area, 'avoid')}
              />
            </div>
            {!injury.modification && <FieldError text="Select Modify or Avoid" />}
          </div>
        ))}
      </div>

      {error && <FieldError text={error} />}

      <WizardCta
        label={isPregnant ? 'SAVE MY PROFILE' : 'ALMOST THERE →'}
        disabled={!injuriesComplete}
        saving={saving}
        onTap={() => void handleContinue()}
      />
    </>
  )
}
