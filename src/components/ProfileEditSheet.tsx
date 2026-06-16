import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../hooks/useToast'
import { Input, Skeleton } from './ui'
import { SectionLabel } from './ui'
import { colors, radius } from '../styles/tokens'
import { Lock } from 'lucide-react'

type Gender = 'male' | 'female' | 'prefer_not_to_say' | ''

interface ProfileForm {
  first_name: string
  last_name: string
  date_of_birth: string
  gender: Gender
  phone_number: string
}

interface ProfileData {
  first_name: string
  last_name: string
  date_of_birth: string | null
  gender: string | null
  phone_number: string | null
}

interface ProfileEditSheetProps {
  open: boolean
  onClose: () => void
  onProfileUpdate: (profile: { first_name: string; last_name: string }) => void
}

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

const EMPTY_FORM: ProfileForm = {
  first_name: '',
  last_name: '',
  date_of_birth: '',
  gender: '',
  phone_number: '',
}

function getMaxDOB(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 13)
  return d.toISOString().split('T')[0]
}

export default function ProfileEditSheet({ open, onClose, onProfileUpdate }: ProfileEditSheetProps) {
  const { user } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileForm, string>>>({})
  const [attempted, setAttempted] = useState(false)

  useEffect(() => {
    if (!open || !user) return
    setLoading(true)
    setAttempted(false)
    setErrors({})

    supabase
      .from('user_profiles')
      .select('first_name, last_name, date_of_birth, gender, phone_number')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        const d = data as ProfileData | null
        setForm({
          first_name: d?.first_name ?? '',
          last_name: d?.last_name ?? '',
          date_of_birth: d?.date_of_birth ?? '',
          gender: (d?.gender as Gender) ?? '',
          phone_number: d?.phone_number ?? '',
        })
        setLoading(false)
      })
  }, [open, user])

  const updateField = useCallback(<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (attempted) setErrors(prev => ({ ...prev, [key]: undefined }))
  }, [attempted])

  const validate = useCallback((): boolean => {
    const errs: Partial<Record<keyof ProfileForm, string>> = {}
    if (!form.first_name.trim()) errs.first_name = 'First name is required'
    if (!form.last_name.trim()) errs.last_name = 'Last name is required'
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
    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: user!.id,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        phone_number: form.phone_number.trim() || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    setSaving(false)

    if (error) {
      toast.show({ message: 'Failed to save profile', type: 'error' })
      return
    }

    onProfileUpdate({ first_name: form.first_name.trim(), last_name: form.last_name.trim() })
    onClose()
  }, [form, user, validate, toast, onProfileUpdate, onClose])

  if (!open) return null

  const canSave = form.first_name.trim().length > 0 && form.last_name.trim().length > 0

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
        <div className="w-10 h-1 rounded-[2px] mx-auto mt-3 mb-2" style={{ background: colors.border }} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <button
            onClick={onClose}
            className="font-['DM_Sans'] text-[14px] active:opacity-60"
            style={{ color: colors.muted, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <h3 className="font-['Bebas_Neue'] text-[20px] tracking-[2px] text-[#f0ede8]">
            EDIT PROFILE
          </h3>
          <button
            onClick={handleSave}
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
              {/* First Name */}
              <div className="mt-4">
                <Input
                  label="FIRST NAME"
                  value={form.first_name}
                  onChange={e => updateField('first_name', e.target.value)}
                  placeholder="Enter first name"
                />
                {errors.first_name && (
                  <p className="text-[11px] mt-1 pl-1" style={{ color: colors.error }}>{errors.first_name}</p>
                )}
              </div>

              {/* Last Name */}
              <div className="mt-4">
                <Input
                  label="LAST NAME"
                  value={form.last_name}
                  onChange={e => updateField('last_name', e.target.value)}
                  placeholder="Enter last name"
                />
                {errors.last_name && (
                  <p className="text-[11px] mt-1 pl-1" style={{ color: colors.error }}>{errors.last_name}</p>
                )}
              </div>

              {/* Date of Birth */}
              <div className="mt-4">
                <SectionLabel label="DATE OF BIRTH" className="mb-2" />
                <input
                  type="date"
                  value={form.date_of_birth}
                  max={getMaxDOB()}
                  onChange={e => updateField('date_of_birth', e.target.value)}
                  className="h-[52px] w-full px-[14px] text-[#f0ede8] text-[16px] font-['DM_Sans'] transition-all duration-150"
                  style={{
                    background: colors.surface2,
                    border: `1.5px solid ${colors.border}`,
                    borderRadius: radius.input,
                    colorScheme: 'dark',
                  }}
                  aria-label="Date of birth"
                />
                {errors.date_of_birth && (
                  <p className="text-[11px] mt-1 pl-1" style={{ color: colors.error }}>{errors.date_of_birth}</p>
                )}
              </div>

              {/* Gender */}
              <div className="mt-4">
                <SectionLabel label="GENDER" className="mb-2" />
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Gender">
                  {GENDER_OPTIONS.map(opt => {
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
                  <span className="text-[16px] font-['DM_Sans'] text-[#f0ede8] truncate">
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
                  onChange={e => updateField('phone_number', e.target.value)}
                  placeholder="Optional"
                />
                {errors.phone_number && (
                  <p className="text-[11px] mt-1 pl-1" style={{ color: colors.error }}>{errors.phone_number}</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
