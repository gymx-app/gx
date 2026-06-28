import { useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'
import { colors, radius } from '../../styles/tokens'
import { SectionLabel } from '../../components/ui'
import { ChevronLeft, X, Loader2 } from 'lucide-react'

// ── Unit conversions ──
const ftInToCm = (ft: number, inches: number) => Math.round(ft * 30.48 + inches * 2.54)
const lbsToKg = (lbs: number) => Math.round((lbs / 2.205) * 10) / 10

function calcAge(dob: string): number | null {
  if (!dob) return null
  const birth = new Date(dob)
  if (isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

// ── Types ──
interface ProfileForm {
  full_name: string
  dob: string
  sex: 'male' | 'female' | ''
  height_value: string
  height_ft: string
  height_in: string
  height_unit: 'cm' | 'ft'
  weight_value: string
  weight_unit: 'kg' | 'lbs'
  target_weight_value: string
}

interface HealthForm {
  fitness_level: string
  goal: string
  available_days_per_week: number
  session_duration_min: number
  equipment: string
  injuries: string[]
}

const GOAL_OPTIONS = [
  { value: 'fat_loss', label: 'Fat Loss' },
  { value: 'muscle_gain', label: 'Muscle Gain' },
  { value: 'strength', label: 'Strength' },
  { value: 'general_fitness', label: 'General Fitness' },
]

const EQUIPMENT_OPTIONS = [
  { value: 'full_gym', label: 'Full Gym' },
  { value: 'dumbbells_only', label: 'Dumbbells Only' },
  { value: 'bodyweight_only', label: 'Bodyweight Only' },
  { value: 'home_gym', label: 'Home Gym' },
]

const DURATION_OPTIONS = [30, 45, 60, 75, 90]

const FITNESS_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

const INPUT_STYLE: React.CSSProperties = {
  background: colors.surface2,
  border: `1.5px solid ${colors.border}`,
  borderRadius: radius.input,
}

// ── Pill Button ──
function PillButton({
  label,
  active,
  onTap,
}: {
  label: string
  active: boolean
  onTap: () => void
}) {
  return (
    <button
      onClick={onTap}
      className="flex-1 py-3.5 text-[14px] font-['DM_Sans'] font-medium tracking-[0.3px] transition-all duration-150 active:scale-[0.96]"
      style={{
        borderRadius: radius.button,
        border: `1.5px solid ${active ? colors.accent : colors.border}`,
        background: active ? colors.accentMuted : colors.surface2,
        color: active ? colors.accent : colors.muted,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}

// ── Select Picker ──
function SelectPicker({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <SectionLabel label={label} className="mb-2" />
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => (
          <PillButton
            key={opt.value}
            label={opt.label}
            active={value === opt.value}
            onTap={() => onChange(value === opt.value ? '' : opt.value)}
          />
        ))}
      </div>
    </div>
  )
}

// ── Unit Toggle ──
function UnitToggle<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div
      className="flex rounded-[8px] overflow-hidden"
      style={{ border: `1px solid ${colors.border}` }}
    >
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="px-3 py-1 text-[11px] font-['DM_Sans'] font-semibold tracking-[0.5px] transition-colors"
            style={{
              background: active ? colors.accent : 'transparent',
              color: active ? '#fff' : colors.muted,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ════════════════════════════════════════════════════
// STEP 1 — Personal Profile
// ════════════════════════════════════════════════════

function Step1ProfileForm({
  form,
  onUpdate,
  attempted,
}: {
  form: ProfileForm
  onUpdate: <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => void
  attempted: boolean
}) {
  const dobAge = calcAge(form.dob)
  const validDob = form.dob === '' || (dobAge !== null && dobAge >= 13 && dobAge <= 80)

  return (
    <>
      <h1 className="font-['Bebas_Neue'] text-[32px] tracking-[2px] text-[#f0ede8] leading-none">
        TELL US ABOUT YOU
      </h1>
      <p
        className="text-[14px] font-['DM_Sans'] mt-2 mb-6 leading-relaxed"
        style={{ color: colors.muted }}
      >
        We'll use this to build your training plan.
      </p>

      {/* Full Name */}
      <div className="mb-4">
        <SectionLabel label="FULL NAME" className="mb-2" />
        <input
          type="text"
          value={form.full_name}
          onChange={(e) => onUpdate('full_name', e.target.value)}
          placeholder="Enter your full name"
          className="h-[52px] w-full px-[14px] text-[#f0ede8] text-[16px] font-['DM_Sans'] placeholder:text-[#444444]"
          style={INPUT_STYLE}
        />
        {attempted && !form.full_name.trim() && (
          <p className="text-[11px] mt-1 pl-1" style={{ color: colors.error }}>
            Name is required
          </p>
        )}
      </div>

      {/* Date of Birth */}
      <div className="mb-4">
        <SectionLabel label="DATE OF BIRTH" className="mb-2" />
        <input
          type="date"
          value={form.dob}
          onChange={(e) => onUpdate('dob', e.target.value)}
          className="h-[52px] w-full px-[14px] text-[#f0ede8] text-[16px] font-['DM_Sans']"
          style={{ ...INPUT_STYLE, colorScheme: 'dark' }}
        />
        {attempted && !form.dob && (
          <p className="text-[11px] mt-1 pl-1" style={{ color: colors.error }}>
            Date of birth is required
          </p>
        )}
        {form.dob && !validDob && (
          <p className="text-[11px] mt-1 pl-1" style={{ color: colors.error }}>
            Age must be between 13 and 80
          </p>
        )}
      </div>

      {/* Sex */}
      <div className="mb-4">
        <SectionLabel label="SEX" className="mb-2" />
        <div className="flex gap-3">
          <PillButton
            label="Male"
            active={form.sex === 'male'}
            onTap={() => onUpdate('sex', 'male')}
          />
          <PillButton
            label="Female"
            active={form.sex === 'female'}
            onTap={() => onUpdate('sex', 'female')}
          />
        </div>
        {attempted && !form.sex && (
          <p className="text-[11px] mt-1 pl-1" style={{ color: colors.error }}>
            Please select your sex
          </p>
        )}
      </div>

      {/* Height */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <SectionLabel label="HEIGHT" />
          <UnitToggle
            value={form.height_unit}
            options={[
              { value: 'cm' as const, label: 'cm' },
              { value: 'ft' as const, label: 'ft' },
            ]}
            onChange={(v) => onUpdate('height_unit', v)}
          />
        </div>
        {form.height_unit === 'cm' ? (
          <input
            type="number"
            inputMode="decimal"
            value={form.height_value}
            onChange={(e) => onUpdate('height_value', e.target.value)}
            placeholder="170"
            className="w-full h-[52px] px-[14px] text-[16px] font-['DM_Sans'] text-[#f0ede8] placeholder:text-[#444444]"
            style={INPUT_STYLE}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                value={form.height_ft}
                onChange={(e) => onUpdate('height_ft', e.target.value)}
                placeholder="5"
                className="w-full h-[52px] px-[14px] pr-10 text-[16px] font-['DM_Sans'] text-[#f0ede8] placeholder:text-[#444444]"
                style={INPUT_STYLE}
              />
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-['DM_Sans']"
                style={{ color: colors.muted }}
              >
                ft
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                value={form.height_in}
                onChange={(e) => onUpdate('height_in', e.target.value)}
                placeholder="7"
                className="w-full h-[52px] px-[14px] pr-10 text-[16px] font-['DM_Sans'] text-[#f0ede8] placeholder:text-[#444444]"
                style={INPUT_STYLE}
              />
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-['DM_Sans']"
                style={{ color: colors.muted }}
              >
                in
              </span>
            </div>
          </div>
        )}
        {attempted && !getHeightCm(form) && (
          <p className="text-[11px] mt-1 pl-1" style={{ color: colors.error }}>
            Height is required
          </p>
        )}
      </div>

      {/* Current Weight */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <SectionLabel label="CURRENT WEIGHT" />
          <UnitToggle
            value={form.weight_unit}
            options={[
              { value: 'kg' as const, label: 'kg' },
              { value: 'lbs' as const, label: 'lbs' },
            ]}
            onChange={(v) => onUpdate('weight_unit', v)}
          />
        </div>
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          value={form.weight_value}
          onChange={(e) => onUpdate('weight_value', e.target.value)}
          placeholder={form.weight_unit === 'kg' ? '75' : '165'}
          className="w-full h-[52px] px-[14px] text-[16px] font-['DM_Sans'] text-[#f0ede8] placeholder:text-[#444444]"
          style={INPUT_STYLE}
        />
        {attempted && !form.weight_value && (
          <p className="text-[11px] mt-1 pl-1" style={{ color: colors.error }}>
            Weight is required
          </p>
        )}
      </div>

      {/* Target Weight */}
      <div className="mb-4">
        <SectionLabel label="TARGET WEIGHT (OPTIONAL)" className="mb-2" />
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          value={form.target_weight_value}
          onChange={(e) => onUpdate('target_weight_value', e.target.value)}
          placeholder={form.weight_unit === 'kg' ? '70' : '154'}
          className="w-full h-[52px] px-[14px] text-[16px] font-['DM_Sans'] text-[#f0ede8] placeholder:text-[#444444]"
          style={INPUT_STYLE}
        />
        <p className="text-[11px] mt-1 pl-1" style={{ color: colors.muted }}>
          Uses same unit as current weight ({form.weight_unit})
        </p>
      </div>
    </>
  )
}

// ════════════════════════════════════════════════════
// STEP 2 — Health & Training
// ════════════════════════════════════════════════════

function Step2HealthForm({
  form,
  onUpdate,
  attempted,
}: {
  form: HealthForm
  onUpdate: <K extends keyof HealthForm>(key: K, value: HealthForm[K]) => void
  attempted: boolean
}) {
  const [injuryInput, setInjuryInput] = useState('')

  const addInjury = useCallback(() => {
    const tag = injuryInput.trim()
    if (!tag || form.injuries.includes(tag)) return
    onUpdate('injuries', [...form.injuries, tag])
    setInjuryInput('')
  }, [injuryInput, form.injuries, onUpdate])

  const removeInjury = useCallback(
    (tag: string) => {
      onUpdate(
        'injuries',
        form.injuries.filter((t) => t !== tag)
      )
    },
    [form.injuries, onUpdate]
  )

  const handleInjuryKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault()
        addInjury()
      }
    },
    [addInjury]
  )

  return (
    <>
      <h1 className="font-['Bebas_Neue'] text-[32px] tracking-[2px] text-[#f0ede8] leading-none">
        YOUR TRAINING SETUP
      </h1>
      <p
        className="text-[14px] font-['DM_Sans'] mt-2 mb-6 leading-relaxed"
        style={{ color: colors.muted }}
      >
        Help us personalise your programme.
      </p>

      {/* Fitness Level */}
      <div className="mb-5">
        <SectionLabel label="FITNESS LEVEL" className="mb-2" />
        <div className="flex gap-2">
          {FITNESS_LEVELS.map((opt) => (
            <PillButton
              key={opt.value}
              label={opt.label}
              active={form.fitness_level === opt.value}
              onTap={() =>
                onUpdate('fitness_level', form.fitness_level === opt.value ? '' : opt.value)
              }
            />
          ))}
        </div>
        {attempted && !form.fitness_level && (
          <p className="text-[11px] mt-1 pl-1" style={{ color: colors.error }}>
            Select fitness level
          </p>
        )}
      </div>

      {/* Primary Goal */}
      <div className="mb-5">
        <SelectPicker
          label="PRIMARY GOAL"
          options={GOAL_OPTIONS}
          value={form.goal}
          onChange={(v) => onUpdate('goal', v)}
        />
        {attempted && !form.goal && (
          <p className="text-[11px] mt-1 pl-1" style={{ color: colors.error }}>
            Select a goal
          </p>
        )}
      </div>

      {/* Days per week */}
      <div className="mb-5">
        <SectionLabel label="DAYS PER WEEK" className="mb-2" />
        <div className="flex items-center gap-4 justify-center">
          <button
            onClick={() =>
              onUpdate('available_days_per_week', Math.max(2, form.available_days_per_week - 1))
            }
            disabled={form.available_days_per_week <= 2}
            className="w-14 h-14 flex items-center justify-center text-[22px] font-['Bebas_Neue'] active:scale-[0.9] transition-transform"
            style={{
              borderRadius: radius.button,
              border: `1.5px solid ${colors.border}`,
              background: colors.surface2,
              color: form.available_days_per_week <= 2 ? colors.muted : colors.text,
              cursor: form.available_days_per_week <= 2 ? 'default' : 'pointer',
            }}
          >
            −
          </button>
          <span className="font-['Bebas_Neue'] text-[48px] text-[#f0ede8] leading-none w-16 text-center">
            {form.available_days_per_week}
          </span>
          <button
            onClick={() =>
              onUpdate('available_days_per_week', Math.min(6, form.available_days_per_week + 1))
            }
            disabled={form.available_days_per_week >= 6}
            className="w-14 h-14 flex items-center justify-center text-[22px] font-['Bebas_Neue'] active:scale-[0.9] transition-transform"
            style={{
              borderRadius: radius.button,
              border: `1.5px solid ${colors.border}`,
              background: colors.surface2,
              color: form.available_days_per_week >= 6 ? colors.muted : colors.text,
              cursor: form.available_days_per_week >= 6 ? 'default' : 'pointer',
            }}
          >
            +
          </button>
        </div>
      </div>

      {/* Session Duration */}
      <div className="mb-5">
        <SectionLabel label="SESSION DURATION" className="mb-2" />
        <div className="flex gap-2">
          {DURATION_OPTIONS.map((d) => (
            <PillButton
              key={d}
              label={`${d}m`}
              active={form.session_duration_min === d}
              onTap={() => onUpdate('session_duration_min', d)}
            />
          ))}
        </div>
      </div>

      {/* Equipment */}
      <div className="mb-5">
        <SelectPicker
          label="EQUIPMENT ACCESS"
          options={EQUIPMENT_OPTIONS}
          value={form.equipment}
          onChange={(v) => onUpdate('equipment', v)}
        />
        {attempted && !form.equipment && (
          <p className="text-[11px] mt-1 pl-1" style={{ color: colors.error }}>
            Select equipment access
          </p>
        )}
      </div>

      {/* Injuries */}
      <div className="mb-5">
        <SectionLabel label="INJURIES (OPTIONAL)" className="mb-2" />
        <div className="flex gap-2">
          <input
            type="text"
            value={injuryInput}
            onChange={(e) => setInjuryInput(e.target.value)}
            onKeyDown={handleInjuryKeyDown}
            placeholder="Type + press Enter"
            className="flex-1 h-[48px] px-[14px] text-[14px] font-['DM_Sans'] text-[#f0ede8] placeholder:text-[#444444]"
            style={INPUT_STYLE}
          />
          <button
            onClick={addInjury}
            disabled={!injuryInput.trim()}
            className="h-[48px] px-4 text-[13px] font-['DM_Sans'] font-semibold active:scale-[0.95] transition-transform"
            style={{
              borderRadius: radius.input,
              background: injuryInput.trim() ? colors.accent : colors.surface3,
              color: injuryInput.trim() ? '#fff' : colors.muted,
              border: 'none',
              cursor: injuryInput.trim() ? 'pointer' : 'default',
            }}
          >
            Add
          </button>
        </div>
        {form.injuries.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {form.injuries.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-['DM_Sans'] font-medium"
                style={{
                  background: colors.surface2,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.chip,
                  color: colors.text,
                }}
              >
                {tag}
                <button
                  onClick={() => removeInjury(tag)}
                  className="active:opacity-60"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    lineHeight: 1,
                  }}
                  aria-label={`Remove ${tag}`}
                >
                  <X size={12} color={colors.muted} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

// ── Helpers ──

function getHeightCm(form: ProfileForm): number {
  if (form.height_unit === 'cm') {
    const cm = parseFloat(form.height_value)
    return isNaN(cm) || cm <= 0 ? 0 : cm
  }
  const ft = parseInt(form.height_ft) || 0
  const inches = parseInt(form.height_in) || 0
  if (ft <= 0 && inches <= 0) return 0
  return ftInToCm(ft, inches)
}

function getWeightKg(value: string, unit: 'kg' | 'lbs'): number {
  const v = parseFloat(value)
  if (isNaN(v) || v <= 0) return 0
  return unit === 'kg' ? v : lbsToKg(v)
}

// ════════════════════════════════════════════════════
// MAIN WIZARD
// ════════════════════════════════════════════════════

export default function OnboardingWizard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const initialStep = searchParams.get('step') === '2' ? 2 : 1
  const [step, setStep] = useState(initialStep)

  const [profileForm, setProfileForm] = useState<ProfileForm>({
    full_name: '',
    dob: '',
    sex: '',
    height_value: '',
    height_ft: '',
    height_in: '',
    height_unit: 'cm',
    weight_value: '',
    weight_unit: 'kg',
    target_weight_value: '',
  })

  const [healthForm, setHealthForm] = useState<HealthForm>({
    fitness_level: '',
    goal: '',
    available_days_per_week: 4,
    session_duration_min: 60,
    equipment: '',
    injuries: [],
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempted, setAttempted] = useState(false)

  const updateProfile = useCallback(
    <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
      setProfileForm((prev) => ({ ...prev, [key]: value }))
      if (error) setError(null)
    },
    [error]
  )

  const updateHealth = useCallback(
    <K extends keyof HealthForm>(key: K, value: HealthForm[K]) => {
      setHealthForm((prev) => ({ ...prev, [key]: value }))
      if (error) setError(null)
    },
    [error]
  )

  // ── Step 1 validation ──
  const dobAge = calcAge(profileForm.dob)
  const validDob = dobAge !== null && dobAge >= 13 && dobAge <= 80
  const heightCm = getHeightCm(profileForm)
  const weightKg = getWeightKg(profileForm.weight_value, profileForm.weight_unit)

  const step1Valid =
    profileForm.full_name.trim().length > 0 &&
    profileForm.dob.length > 0 &&
    validDob &&
    profileForm.sex !== '' &&
    heightCm > 0 &&
    weightKg > 0

  // ── Step 2 validation ──
  const step2Valid =
    healthForm.fitness_level !== '' &&
    healthForm.goal !== '' &&
    healthForm.available_days_per_week >= 2 &&
    healthForm.session_duration_min > 0 &&
    healthForm.equipment !== ''

  const handleStep1Continue = useCallback(async () => {
    setAttempted(true)
    if (!step1Valid || !user) return

    setSaving(true)
    setError(null)

    const targetKg = getWeightKg(profileForm.target_weight_value, profileForm.weight_unit)
    const nameParts = profileForm.full_name.trim().split(/\s+/)
    const firstName = nameParts[0] ?? ''
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''

    const { error: dbError } = await supabase.from('user_profiles').upsert(
      {
        user_id: user.id,
        full_name: profileForm.full_name.trim(),
        first_name: firstName,
        last_name: lastName,
        date_of_birth: profileForm.dob,
        age: dobAge,
        gender: profileForm.sex as 'male' | 'female',
        height_cm: heightCm,
        current_weight_kg: weightKg,
        target_weight_kg: targetKg > 0 ? targetKg : null,
        onboarding_step: 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

    setSaving(false)

    if (dbError) {
      setError('Failed to save profile. Please try again.')
      return
    }

    setAttempted(false)
    setStep(2)
  }, [step1Valid, user, profileForm, dobAge, heightCm, weightKg])

  const handleStep2Complete = useCallback(async () => {
    setAttempted(true)
    if (!step2Valid || !user) return

    setSaving(true)
    setError(null)

    const { error: dbError } = await supabase.from('user_health').upsert(
      {
        user_id: user.id,
        fitness_level: healthForm.fitness_level,
        goal: healthForm.goal,
        available_days_per_week: healthForm.available_days_per_week,
        session_duration_min: healthForm.session_duration_min,
        equipment: healthForm.equipment,
        injuries: healthForm.injuries,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

    if (dbError) {
      setSaving(false)
      setError('Failed to save health details. Please try again.')
      return
    }

    // Mark onboarding complete
    await supabase
      .from('user_profiles')
      .update({
        onboarding_completed: true,
        onboarding_step: 2,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    setSaving(false)
    void navigate('/program', { replace: true })
  }, [step2Valid, user, healthForm, navigate])

  const canSubmit = step === 1 ? step1Valid : step2Valid

  return (
    <div className="min-h-screen flex flex-col" style={{ background: colors.bg }}>
      {/* Progress bar */}
      <div className="px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)]">
        {step === 2 && (
          <button
            onClick={() => {
              setStep(1)
              setAttempted(false)
            }}
            className="flex items-center gap-1 mb-2 active:opacity-60"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <ChevronLeft size={18} color={colors.muted} />
            <span className="text-[13px] font-['DM_Sans']" style={{ color: colors.muted }}>
              Back
            </span>
          </button>
        )}
        <div className="h-1 rounded-full overflow-hidden" style={{ background: colors.surface2 }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: step === 1 ? '50%' : '100%', background: colors.accent }}
          />
        </div>
        <p className="text-[11px] font-['DM_Sans'] mt-2 text-right" style={{ color: colors.muted }}>
          Step {step} of 2
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-32 pt-4">
        {step === 1 ? (
          <Step1ProfileForm form={profileForm} onUpdate={updateProfile} attempted={attempted} />
        ) : (
          <Step2HealthForm form={healthForm} onUpdate={updateHealth} attempted={attempted} />
        )}

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
      </div>

      {/* CTA pinned to bottom */}
      <div
        className="fixed bottom-0 left-0 right-0 px-5 pt-3"
        style={{
          background: `linear-gradient(transparent, ${colors.bg} 20%)`,
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        }}
      >
        <button
          onClick={() => void (step === 1 ? handleStep1Continue() : handleStep2Complete())}
          disabled={!canSubmit || saving}
          className="w-full py-4 font-['Bebas_Neue'] text-[18px] tracking-[2px] transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-2"
          style={{
            borderRadius: radius.button,
            background: canSubmit && !saving ? colors.accent : colors.surface3,
            color: canSubmit && !saving ? '#fff' : colors.muted,
            border: 'none',
            cursor: canSubmit && !saving ? 'pointer' : 'default',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving && <Loader2 size={18} className="animate-spin" />}
          {step === 1
            ? saving
              ? 'SAVING...'
              : 'CONTINUE →'
            : saving
              ? 'SAVING...'
              : 'COMPLETE SETUP'}
        </button>
      </div>
    </div>
  )
}
