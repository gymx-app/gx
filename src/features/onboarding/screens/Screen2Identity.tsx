import { useState } from 'react'
import { colors } from '../../../styles/tokens'
import { supabase } from '../../../lib/supabase'
import { calculateAge, getMaxDobForMinAge } from '../../../utils/dateUtils'
import type { WizardState } from '../useWizardState'
import { FieldError, FieldHelper, PillButton, SearchableSelect, SectionLabel } from './shared'
import { INPUT_STYLE, COUNTRIES } from './sharedUtils'
import { WizardCta } from './WizardCta'

const MIN_AGE = 13

interface Props {
  wizardState: WizardState
  setField: (key: string, value: unknown) => void
  userId: string
  onSaved: (step: number) => void
}

export function Screen2Identity({ wizardState, setField, userId, onSaved }: Props) {
  const [attempted, setAttempted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const age = calculateAge(wizardState.date_of_birth)
  const maxDob = getMaxDobForMinAge(MIN_AGE)
  const validDob = !wizardState.date_of_birth || (age !== null && age >= MIN_AGE)

  const valid =
    wizardState.full_name.trim().length > 0 &&
    !!wizardState.gender &&
    !!wizardState.date_of_birth &&
    validDob

  const handleContinue = async () => {
    setAttempted(true)
    if (!valid) return
    setSaving(true)
    setError(null)

    const { error: dbError } = await supabase.from('user_profiles').upsert(
      {
        user_id: userId,
        full_name: wizardState.full_name.trim(),
        gender: wizardState.gender as 'male' | 'female' | 'other',
        date_of_birth: wizardState.date_of_birth,
        nationality: wizardState.nationality || null,
        onboarding_step: 2,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

    setSaving(false)
    if (dbError) {
      setError('Failed to save your details. Please try again.')
      return
    }
    onSaved(2)
  }

  return (
    <>
      <h1 className="font-['Bebas_Neue'] text-[32px] tracking-[2px] text-[#f0ede8] leading-none">
        LET'S START WITH YOU
      </h1>
      <p
        className="text-[14px] font-['DM_Sans'] mt-2 mb-6 leading-relaxed"
        style={{ color: colors.muted }}
      >
        Your training identity. Takes about 30 seconds.
      </p>

      <div className="mb-5">
        <SectionLabel label="FULL NAME" className="mb-2" />
        <input
          type="text"
          value={wizardState.full_name}
          onChange={(e) => setField('full_name', e.target.value)}
          placeholder="Enter your full name"
          className="h-[52px] w-full px-[14px] text-[#f0ede8] text-[16px] font-['DM_Sans'] placeholder:text-[#444444]"
          style={INPUT_STYLE}
        />
        {attempted && !wizardState.full_name.trim() ? (
          <FieldError text="Name is required" />
        ) : (
          <FieldHelper text="Used across your profile and programme." />
        )}
      </div>

      <div className="mb-5">
        <SectionLabel label="GENDER" className="mb-2" />
        <div className="flex gap-3">
          <PillButton
            label="M"
            active={wizardState.gender === 'male'}
            onTap={() => setField('gender', 'male')}
          />
          <PillButton
            label="F"
            active={wizardState.gender === 'female'}
            onTap={() => setField('gender', 'female')}
          />
          <PillButton
            label="O"
            active={wizardState.gender === 'other'}
            onTap={() => setField('gender', 'other')}
          />
        </div>
        {attempted && !wizardState.gender ? (
          <FieldError text="Please select your gender" />
        ) : (
          <FieldHelper text="Determines which health questions appear in a later step." />
        )}
      </div>

      <div className="mb-5">
        <SectionLabel label="DATE OF BIRTH" className="mb-2" />
        <input
          type="date"
          value={wizardState.date_of_birth ?? ''}
          max={maxDob}
          onChange={(e) => setField('date_of_birth', e.target.value)}
          className="h-[52px] w-full px-[14px] text-[#f0ede8] text-[16px] font-['DM_Sans']"
          style={{ ...INPUT_STYLE, colorScheme: 'dark' }}
        />
        {attempted && !wizardState.date_of_birth && <FieldError text="Date of birth is required" />}
        {wizardState.date_of_birth && !validDob && (
          <FieldError text={`You must be at least ${MIN_AGE} years old`} />
        )}
        {wizardState.date_of_birth && validDob && age !== null && (
          <p className="text-[11px] mt-1.5 pl-1" style={{ color: colors.textSecondary }}>
            You are {age} years old
          </p>
        )}
        <FieldHelper text="We calculate your age automatically — you never update it manually. Age affects training volume tolerance and recovery speed." />
      </div>

      <div className="mb-2">
        <SectionLabel label="NATIONALITY (OPTIONAL)" className="mb-2" />
        <SearchableSelect
          value={wizardState.nationality}
          onChange={(v) => setField('nationality', v)}
          options={COUNTRIES}
        />
        <FieldHelper text="Provides regional context where relevant." />
      </div>

      {error && (
        <div
          className="mt-4 p-3 rounded-[10px]"
          style={{ background: 'rgba(239,68,68,0.12)', border: `1px solid ${colors.error}` }}
        >
          <p className="text-[13px] font-['DM_Sans']" style={{ color: colors.error }}>
            {error}
          </p>
        </div>
      )}

      <WizardCta
        label="CONTINUE →"
        disabled={!valid}
        saving={saving}
        onTap={() => void handleContinue()}
      />
    </>
  )
}
