import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../hooks/useToast'
import { Input, Skeleton, SectionLabel } from './ui'
import { colors, radius } from '../styles/tokens'
import { Lock } from 'lucide-react'
import { SearchableSelect } from '../features/onboarding/screens/shared'
import { COUNTRIES } from '../features/onboarding/screens/sharedUtils'

type Gender = 'male' | 'female' | 'other' | ''

interface ProfileForm {
  full_name: string
  date_of_birth: string
  gender: Gender
  nationality: string
  phone_number: string
}

interface ProfileEditSheetProps {
  open: boolean
  onClose: () => void
  onProfileUpdate: (profile: { full_name: string }) => void
}

// Same three options as onboarding's Screen2Identity — keep the two in sync.
const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
]

const EMPTY_FORM: ProfileForm = {
  full_name: '',
  date_of_birth: '',
  gender: '',
  nationality: '',
  phone_number: '',
}

function getMaxDOB(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 13)
  return d.toISOString().split('T')[0] ?? ''
}

export default function ProfileEditSheet({
  open,
  onClose,
  onProfileUpdate,
}: ProfileEditSheetProps) {
  const { user } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileForm, string>>>({})
  const [attempted, setAttempted] = useState(false)

  /* eslint-disable react-hooks/set-state-in-effect -- reset form state when sheet opens */
  useEffect(() => {
    if (!open || !user) return
    setAttempted(false)
    setErrors({})

    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('user_profiles')
        .select('full_name, date_of_birth, gender, nationality, phone_number')
        .eq('user_id', user.id)
        .single()
      const d = data
      setForm({
        full_name: d?.full_name ?? '',
        date_of_birth: d?.date_of_birth ?? '',
        gender: (d?.gender as Gender) ?? '',
        nationality: d?.nationality ?? '',
        phone_number: d?.phone_number ?? '',
      })
      setLoading(false)
    }
    void load()
  }, [open, user])
  /* eslint-enable react-hooks/set-state-in-effect */

  const updateField = useCallback(
    <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }))
      if (attempted) setErrors((prev) => ({ ...prev, [key]: undefined }))
    },
    [attempted]
  )

  const validate = useCallback((): boolean => {
    const errs: Partial<Record<keyof ProfileForm, string>> = {}
    if (!form.full_name.trim()) errs.full_name = 'Name is required'
    if (form.date_of_birth) {
      const dob = new Date(form.date_of_birth)
      const minAge = new Date()
      minAge.setFullYear(minAge.getFullYear() - 13)
      if (dob > minAge) errs.date_of_birth = 'Must be at least 13 years old'
    }
    if (form.phone_number.trim()) {
      const digits = form.phone_number.replace(/\D/g, '')
      if (digits.length < 7) errs.phone_number = 'Must be at least 7 digits'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }, [form])

  const handleSave = useCallback(async () => {
    setAttempted(true)
    if (!validate()) return

    setSaving(true)
    const { error } = await supabase.from('user_profiles').upsert(
      {
        user_id: user!.id,
        full_name: form.full_name.trim(),
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        nationality: form.nationality || null,
        phone_number: form.phone_number.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

    setSaving(false)

    if (error) {
      toast.show({ message: 'Failed to save profile', type: 'error' })
      return
    }

    onProfileUpdate({ full_name: form.full_name.trim() })
    onClose()
  }, [form, user, validate, toast, onProfileUpdate, onClose])

  if (!open) return null

  const canSave = form.full_name.trim().length > 0

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/85" onClick={onClose} aria-hidden="true" />

      <div
        className="relative w-full max-w-[480px] animate-slide-up overflow-y-auto"
        style={{
          background: colors.surface,
          borderRadius: radius.sheet,
          maxHeight: '90vh',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Edit Profile"
      >
        <div
          className="w-10 h-1 rounded-[2px] mx-auto mt-3 mb-2"
          style={{ background: colors.border }}
        />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <button
            onClick={onClose}
            className="font-['DM_Sans'] text-[14px] active:opacity-60"
            style={{ color: colors.muted, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <h3 className="font-['Bebas_Neue'] text-[20px] tracking-[2px] text-text">EDIT PROFILE</h3>
          <button
            onClick={() => void handleSave()}
            disabled={!canSave || saving}
            className="font-['DM_Sans'] text-[14px] font-semibold active:opacity-60"
            style={{
              color: canSave && !saving ? colors.accent : colors.muted,
              background: 'none',
              border: 'none',
              cursor: canSave ? 'pointer' : 'default',
              opacity: saving ? 0.5 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        {/* Form */}
        <div className="px-5 pb-4">
          {loading ? (
            <div className="flex flex-col gap-4 mt-4">
              <Skeleton height={52} />
              <Skeleton height={52} />
              <Skeleton height={52} />
              <Skeleton height={52} />
              <Skeleton height={52} />
            </div>
          ) : (
            <>
              {/* Full Name */}
              <div className="mt-4">
                <Input
                  label="FULL NAME"
                  value={form.full_name}
                  onChange={(e) => updateField('full_name', e.target.value)}
                  placeholder="Enter your full name"
                />
                {errors.full_name && (
                  <p className="text-[11px] mt-1 pl-1" style={{ color: colors.error }}>
                    {errors.full_name}
                  </p>
                )}
              </div>

              {/* Date of Birth */}
              <div className="mt-4">
                <SectionLabel label="DATE OF BIRTH" className="mb-2" />
                <input
                  type="date"
                  value={form.date_of_birth}
                  max={getMaxDOB()}
                  onChange={(e) => updateField('date_of_birth', e.target.value)}
                  className="h-[52px] w-full px-[14px] text-text text-[16px] font-['DM_Sans'] transition-all duration-150"
                  style={{
                    background: colors.surface2,
                    border: `1.5px solid ${colors.border}`,
                    borderRadius: radius.input,
                    colorScheme: 'dark',
                  }}
                  aria-label="Date of birth"
                />
                {errors.date_of_birth && (
                  <p className="text-[11px] mt-1 pl-1" style={{ color: colors.error }}>
                    {errors.date_of_birth}
                  </p>
                )}
              </div>

              {/* Gender */}
              <div className="mt-4">
                <SectionLabel label="GENDER" className="mb-2" />
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Gender">
                  {GENDER_OPTIONS.map((opt) => {
                    const isActive = form.gender === opt.value
                    return (
                      <button
                        key={opt.value}
                        onClick={() => updateField('gender', isActive ? '' : opt.value)}
                        role="radio"
                        aria-checked={isActive}
                        className="py-3 text-[12px] font-['DM_Sans'] font-medium tracking-[0.3px] transition-all duration-150 active:scale-[0.96]"
                        style={{
                          borderRadius: radius.button,
                          border: `1.5px solid ${isActive ? colors.accent : colors.border}`,
                          background: isActive ? colors.accentMuted : colors.surface2,
                          color: isActive ? colors.accent : colors.muted,
                        }}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Nationality */}
              <div className="mt-4">
                <SectionLabel label="NATIONALITY" className="mb-2" />
                <SearchableSelect
                  value={form.nationality}
                  onChange={(v) => updateField('nationality', v)}
                  options={COUNTRIES}
                />
              </div>

              {/* Email — read-only */}
              <div className="mt-6">
                <SectionLabel label="EMAIL" className="mb-2" />
                <div
                  className="h-[52px] w-full px-[14px] flex items-center justify-between"
                  style={{
                    background: colors.surface2,
                    border: `1.5px solid ${colors.border}`,
                    borderRadius: radius.input,
                    opacity: 0.6,
                  }}
                >
                  <span className="text-[16px] font-['DM_Sans'] text-text truncate">
                    {user?.email}
                  </span>
                  <Lock size={16} color={colors.muted} style={{ flexShrink: 0 }} />
                </div>
              </div>

              {/* Phone Number */}
              <div className="mt-4">
                <Input
                  label="PHONE NUMBER"
                  type="tel"
                  inputMode="tel"
                  value={form.phone_number}
                  onChange={(e) => updateField('phone_number', e.target.value)}
                  placeholder="Optional"
                />
                {errors.phone_number && (
                  <p className="text-[11px] mt-1 pl-1" style={{ color: colors.error }}>
                    {errors.phone_number}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
