import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../hooks/useToast'
import { Skeleton, SectionLabel } from './ui'
import { colors, radius } from '../styles/tokens'
import { X } from 'lucide-react'

// ── Unit conversions (always store metric) ──

const cmToFtIn = (cm: number) => ({
  ft: Math.floor(cm / 30.48),
  in: Math.round((cm % 30.48) / 2.54),
})
const ftInToCm = (ft: number, inches: number) => Math.round(ft * 30.48 + inches * 2.54)
const kgToLbs = (kg: number) => Math.round(kg * 2.2046)
const lbsToKg = (lbs: number) => Math.round((lbs / 2.2046) * 10) / 10

// ── Types ──

type InjuryModification = 'modify' | 'avoid'

interface InjuryEntry {
  area: string
  modification: InjuryModification | null
}

interface HealthForm {
  height_cm: string
  current_weight_kg: string
  body_fat_pct: string
  fitness_level: string
  lifestyle: string[]
  occupation: string
  training_experience: string
  primary_activity: string
  medical_conditions: string[]
}

type HeightUnit = 'cm' | 'ftin'
type WeightUnit = 'kg' | 'lbs'

// Field lists below mirror the onboarding wizard exactly (Screen4Capability,
// Screen9Constraints) so a value picked in either place shows up in the other.
const TRAINING_EXPERIENCE = [
  { value: 'never', label: 'Never trained' },
  { value: 'less_than_6_months', label: 'Less than 6 months' },
  { value: '6_months_to_2_years', label: '6 months – 2 years' },
  { value: '2_plus_years', label: '2+ years' },
]

const FITNESS_LEVELS = [
  { value: 'beginner', label: 'Beginner', desc: 'Learning movements, building base' },
  { value: 'intermediate', label: 'Intermediate', desc: 'Consistent training, know the basics' },
  { value: 'advanced', label: 'Advanced', desc: 'Years of structured training' },
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
              color: active ? colors.white : colors.muted,
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

// ── Tag pill (multi-select chip) ──

function TagPill({ label, active, onTap }: { label: string; active: boolean; onTap: () => void }) {
  return (
    <button
      onClick={onTap}
      className="px-3 py-1.5 text-[12px] font-['DM_Sans'] font-medium transition-all duration-150 active:scale-[0.96]"
      style={{
        borderRadius: 999,
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

// ── Main Component ──

interface HealthDetailsSheetProps {
  open: boolean
  onClose: () => void
}

export default function HealthDetailsSheet({ open, onClose }: HealthDetailsSheetProps) {
  const { user } = useAuth()
  const toast = useToast()

  const [form, setForm] = useState<HealthForm>({
    height_cm: '',
    current_weight_kg: '',
    body_fat_pct: '',
    fitness_level: '',
    lifestyle: [],
    occupation: '',
    training_experience: '',
    primary_activity: '',
    medical_conditions: [],
  })
  const [gender, setGender] = useState<string | null>(null)
  const [injuries, setInjuries] = useState<InjuryEntry[]>([])
  const [injuryInput, setInjuryInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [heightUnit, setHeightUnit] = useState<HeightUnit>('cm')
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg')
  const [heightFt, setHeightFt] = useState('')
  const [heightIn, setHeightIn] = useState('')
  const [displayWeight, setDisplayWeight] = useState('')

  const medicalOptions = useMemo(() => {
    const list = [...MEDICAL_ALL]
    if (gender === 'female' || gender === 'other') list.push(...MEDICAL_FEMALE_OTHER)
    if (gender === 'male' || gender === 'other') list.push(...MEDICAL_MALE_OTHER)
    return list
  }, [gender])

  /* eslint-disable react-hooks/set-state-in-effect -- reset form state when sheet opens */
  useEffect(() => {
    if (!open || !user) return
    let cancelled = false
    setInjuryInput('')

    const load = async () => {
      setLoading(true)
      const [healthRes, profileRes] = await Promise.all([
        supabase
          .from('user_health')
          .select(
            'height_cm, current_weight_kg, body_fat_pct, fitness_level, lifestyle, occupation, medical_conditions, injuries_v2'
          )
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('user_profiles')
          .select('gender, training_experience, primary_activity')
          .eq('user_id', user.id)
          .maybeSingle(),
      ])
      if (cancelled) return

      const h = healthRes.data
      const p = profileRes.data
      const heightStr = h?.height_cm != null ? String(h.height_cm) : ''
      const weightStr = h?.current_weight_kg != null ? String(h.current_weight_kg) : ''

      setForm({
        height_cm: heightStr,
        current_weight_kg: weightStr,
        body_fat_pct: h?.body_fat_pct != null ? String(h.body_fat_pct) : '',
        fitness_level: h?.fitness_level ?? '',
        lifestyle: h?.lifestyle ?? [],
        occupation: h?.occupation ?? '',
        training_experience: p?.training_experience ?? '',
        primary_activity: p?.primary_activity ?? '',
        medical_conditions: h?.medical_conditions ?? [],
      })
      setDisplayWeight(weightStr)
      setGender(p?.gender ?? null)

      if (heightStr) {
        const { ft, in: inches } = cmToFtIn(parseFloat(heightStr))
        setHeightFt(String(ft))
        setHeightIn(String(inches))
      } else {
        setHeightFt('')
        setHeightIn('')
      }

      const injuriesV2 = Array.isArray(h?.injuries_v2)
        ? (h.injuries_v2 as unknown as { area: string; modification: InjuryModification | null }[])
        : []
      setInjuries(injuriesV2.map((i) => ({ area: i.area, modification: i.modification ?? null })))

      setHeightUnit('cm')
      setWeightUnit('kg')
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [open, user])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleHeightUnitChange = useCallback(
    (unit: HeightUnit) => {
      if (unit === heightUnit) return
      setHeightUnit(unit)
      if (unit === 'ftin' && form.height_cm) {
        const cm = parseFloat(form.height_cm)
        if (!isNaN(cm)) {
          const { ft, in: inches } = cmToFtIn(cm)
          setHeightFt(String(ft))
          setHeightIn(String(inches))
        }
      } else if (unit === 'cm' && heightFt) {
        const cm = ftInToCm(parseInt(heightFt) || 0, parseInt(heightIn) || 0)
        setForm((prev) => ({ ...prev, height_cm: String(cm) }))
      }
    },
    [heightUnit, form.height_cm, heightFt, heightIn]
  )

  const handleWeightUnitChange = useCallback(
    (unit: WeightUnit) => {
      if (unit === weightUnit) return
      setWeightUnit(unit)
      if (unit === 'lbs' && form.current_weight_kg) {
        setDisplayWeight(String(kgToLbs(parseFloat(form.current_weight_kg))))
      } else if (unit === 'kg' && displayWeight) {
        const kg = lbsToKg(parseFloat(displayWeight))
        setDisplayWeight(String(kg))
        setForm((prev) => ({ ...prev, current_weight_kg: String(kg) }))
      }
    },
    [weightUnit, form.current_weight_kg, displayWeight]
  )

  const updateHeightCm = useCallback((val: string) => {
    setForm((prev) => ({ ...prev, height_cm: val }))
  }, [])

  const updateWeightDisplay = useCallback(
    (val: string) => {
      setDisplayWeight(val)
      if (weightUnit === 'kg') {
        setForm((prev) => ({ ...prev, current_weight_kg: val }))
      } else {
        const kg = val ? String(lbsToKg(parseFloat(val))) : ''
        setForm((prev) => ({ ...prev, current_weight_kg: kg }))
      }
    },
    [weightUnit]
  )

  const updateHeightFtIn = useCallback((ft: string, inches: string) => {
    setHeightFt(ft)
    setHeightIn(inches)
    const cm = ftInToCm(parseInt(ft) || 0, parseInt(inches) || 0)
    setForm((prev) => ({ ...prev, height_cm: cm > 0 ? String(cm) : '' }))
  }, [])

  const toggleLifestyle = (opt: string) => {
    setForm((prev) => ({
      ...prev,
      lifestyle: prev.lifestyle.includes(opt)
        ? prev.lifestyle.filter((v) => v !== opt)
        : [...prev.lifestyle, opt],
    }))
  }

  const toggleMedical = (opt: string) => {
    if (opt === 'None') {
      setForm((prev) => ({
        ...prev,
        medical_conditions: prev.medical_conditions.includes('None') ? [] : ['None'],
      }))
      return
    }
    setForm((prev) => {
      const withoutNone = prev.medical_conditions.filter((v) => v !== 'None')
      return {
        ...prev,
        medical_conditions: withoutNone.includes(opt)
          ? withoutNone.filter((v) => v !== opt)
          : [...withoutNone, opt],
      }
    })
  }

  const addInjury = (area: string) => {
    const trimmed = area.trim()
    if (!trimmed) return
    if (injuries.some((i) => i.area.toLowerCase() === trimmed.toLowerCase())) return
    setInjuries((prev) => [...prev, { area: trimmed, modification: null }])
    setInjuryInput('')
  }

  const removeInjury = (area: string) => {
    setInjuries((prev) => prev.filter((i) => i.area !== area))
  }

  const setInjuryModification = (area: string, modification: InjuryModification) => {
    setInjuries((prev) => prev.map((i) => (i.area === area ? { ...i, modification } : i)))
  }

  const remainingSuggestions = INJURY_SUGGESTIONS.filter(
    (s) => !injuries.some((i) => i.area.toLowerCase() === s.toLowerCase())
  )

  const handleSave = useCallback(async () => {
    if (!user) return
    setSaving(true)

    const { error: healthError } = await supabase.from('user_health').upsert(
      {
        user_id: user.id,
        height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
        current_weight_kg: form.current_weight_kg ? parseFloat(form.current_weight_kg) : null,
        body_fat_pct: form.body_fat_pct ? parseFloat(form.body_fat_pct) : null,
        fitness_level: form.fitness_level || null,
        lifestyle: form.lifestyle,
        occupation: form.occupation || null,
        medical_conditions: form.medical_conditions,
        injuries: injuries.map((i) => i.area),
        injuries_v2: injuries.map((i) => ({
          area: i.area,
          modification: i.modification,
          notes: '',
        })),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    if (healthError) {
      setSaving(false)
      toast.show({ message: 'Failed to save health details', type: 'error' })
      return
    }

    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        training_experience: form.training_experience || null,
        primary_activity: form.primary_activity.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    setSaving(false)
    if (profileError) {
      toast.show({ message: 'Failed to save health details', type: 'error' })
      return
    }
    onClose()
  }, [form, injuries, user, toast, onClose])

  if (!open) return null

  const inputStyle = {
    background: colors.surface2,
    border: `1.5px solid ${colors.border}`,
    borderRadius: radius.input,
  }

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
        aria-label="Health Details"
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
          <h3 className="font-['Bebas_Neue'] text-[20px] tracking-[2px] text-text">
            HEALTH DETAILS
          </h3>
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="font-['DM_Sans'] text-[14px] font-semibold active:opacity-60"
            style={{
              color: saving ? colors.muted : colors.accent,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
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
              <Skeleton height={80} />
            </div>
          ) : (
            <>
              {/* ── Physical ── */}
              <p
                className="font-['DM_Sans'] font-bold uppercase tracking-[2px] mt-4 mb-2"
                style={{ fontSize: 11, color: colors.muted }}
              >
                PHYSICAL
              </p>

              {/* Height */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <SectionLabel label="HEIGHT" />
                  <UnitToggle
                    value={heightUnit}
                    options={[
                      { value: 'cm', label: 'cm' },
                      { value: 'ftin', label: 'ft+in' },
                    ]}
                    onChange={handleHeightUnitChange}
                  />
                </div>
                {heightUnit === 'cm' ? (
                  <input
                    type="number"
                    inputMode="decimal"
                    value={form.height_cm}
                    onChange={(e) => updateHeightCm(e.target.value)}
                    placeholder="170"
                    className="w-full h-[52px] px-[14px] text-[16px] font-['DM_Sans'] text-text placeholder:text-placeholder"
                    style={inputStyle}
                    aria-label="Height in centimeters"
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={heightFt}
                      onChange={(e) => updateHeightFtIn(e.target.value, heightIn)}
                      placeholder="5"
                      className="w-full h-[52px] px-[14px] text-[16px] font-['DM_Sans'] text-text placeholder:text-placeholder"
                      style={inputStyle}
                      aria-label="Height feet"
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      value={heightIn}
                      onChange={(e) => updateHeightFtIn(heightFt, e.target.value)}
                      placeholder="7"
                      className="w-full h-[52px] px-[14px] text-[16px] font-['DM_Sans'] text-text placeholder:text-placeholder"
                      style={inputStyle}
                      aria-label="Height inches"
                    />
                  </div>
                )}
              </div>

              {/* Weight */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <SectionLabel label="CURRENT WEIGHT" />
                  <UnitToggle
                    value={weightUnit}
                    options={[
                      { value: 'kg', label: 'kg' },
                      { value: 'lbs', label: 'lbs' },
                    ]}
                    onChange={handleWeightUnitChange}
                  />
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={displayWeight}
                  onChange={(e) => updateWeightDisplay(e.target.value)}
                  placeholder={weightUnit === 'kg' ? '75' : '165'}
                  className="w-full h-[52px] px-[14px] text-[16px] font-['DM_Sans'] text-text placeholder:text-placeholder"
                  style={inputStyle}
                  aria-label={`Weight in ${weightUnit}`}
                />
                <p className="text-[11px] mt-1 pl-1" style={{ color: colors.muted }}>
                  Override by InBody when available
                </p>
              </div>

              {/* Body Fat % */}
              <div className="mb-4">
                <SectionLabel label="BODY FAT % (OPTIONAL)" className="mb-2" />
                <input
                  type="number"
                  inputMode="decimal"
                  min={3}
                  max={60}
                  value={form.body_fat_pct}
                  onChange={(e) => setForm((prev) => ({ ...prev, body_fat_pct: e.target.value }))}
                  placeholder="—"
                  className="w-full h-[48px] px-[14px] text-[15px] font-['DM_Sans'] text-text placeholder:text-placeholder"
                  style={inputStyle}
                  aria-label="Body fat percentage"
                />
                <p className="text-[11px] mt-1 pl-1" style={{ color: colors.muted }}>
                  From a previous InBody or DEXA scan. Leave blank if unknown.
                </p>
              </div>

              {/* ── Training Background ── */}
              <p
                className="font-['DM_Sans'] font-bold uppercase tracking-[2px] mt-6 mb-2"
                style={{ fontSize: 11, color: colors.muted }}
              >
                TRAINING BACKGROUND
              </p>

              <div className="mb-4">
                <SectionLabel label="TRAINING EXPERIENCE" className="mb-2" />
                <div className="grid grid-cols-2 gap-2">
                  {TRAINING_EXPERIENCE.map((opt) => {
                    const active = form.training_experience === opt.value
                    return (
                      <button
                        key={opt.value}
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            training_experience: active ? '' : opt.value,
                          }))
                        }
                        className="py-3 text-[12px] font-['DM_Sans'] font-medium tracking-[0.3px] transition-all duration-150 active:scale-[0.96]"
                        style={{
                          borderRadius: radius.button,
                          border: `1.5px solid ${active ? colors.accent : colors.border}`,
                          background: active ? colors.accentMuted : colors.surface2,
                          color: active ? colors.accent : colors.muted,
                          cursor: 'pointer',
                        }}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="mb-4">
                <SectionLabel label="FITNESS LEVEL" className="mb-2" />
                <div className="flex flex-col gap-2">
                  {FITNESS_LEVELS.map((opt) => {
                    const active = form.fitness_level === opt.value
                    return (
                      <button
                        key={opt.value}
                        onClick={() =>
                          setForm((prev) => ({ ...prev, fitness_level: active ? '' : opt.value }))
                        }
                        className="w-full text-left px-4 py-3 transition-all duration-150 active:scale-[0.98]"
                        style={{
                          borderRadius: radius.button,
                          border: `1.5px solid ${active ? colors.accent : colors.border}`,
                          background: active ? colors.accentMuted : colors.surface2,
                          cursor: 'pointer',
                        }}
                      >
                        <span
                          className="text-[13px] font-['DM_Sans'] font-medium block"
                          style={{ color: active ? colors.accent : colors.text }}
                        >
                          {opt.label}
                        </span>
                        <span
                          className="text-[11px] font-['DM_Sans'] block mt-[2px]"
                          style={{ color: colors.muted }}
                        >
                          {opt.desc}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="mb-4">
                <SectionLabel label="PRIMARY SPORT OR ACTIVITY" className="mb-2" />
                <input
                  type="text"
                  value={form.primary_activity}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, primary_activity: e.target.value }))
                  }
                  placeholder="e.g. Cricket, Running, nothing outside gym"
                  className="w-full h-[52px] px-[14px] text-[16px] font-['DM_Sans'] text-text placeholder:text-placeholder"
                  style={inputStyle}
                  aria-label="Primary sport or activity"
                />
                <p className="text-[11px] mt-1 pl-1" style={{ color: colors.muted }}>
                  Helps personalise your programme
                </p>
              </div>

              {/* ── Lifestyle ── */}
              <p
                className="font-['DM_Sans'] font-bold uppercase tracking-[2px] mt-6 mb-2"
                style={{ fontSize: 11, color: colors.muted }}
              >
                LIFESTYLE
              </p>

              <div className="mb-4">
                <SectionLabel label="YOUR DAILY ACTIVITY" className="mb-2" />
                <p className="text-[11px] font-['DM_Sans'] mb-2" style={{ color: colors.muted }}>
                  Outside the gym, how active are you? Select all that apply.
                </p>
                <div className="flex flex-wrap gap-2">
                  {LIFESTYLE_OPTIONS.map((opt) => (
                    <TagPill
                      key={opt}
                      label={opt}
                      active={form.lifestyle.includes(opt)}
                      onTap={() => toggleLifestyle(opt)}
                    />
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <SectionLabel label="OCCUPATION (OPTIONAL)" className="mb-2" />
                <select
                  value={form.occupation}
                  onChange={(e) => setForm((prev) => ({ ...prev, occupation: e.target.value }))}
                  className="h-[52px] w-full px-[14px] text-text text-[15px] font-['DM_Sans']"
                  style={{ ...inputStyle, colorScheme: 'dark' }}
                >
                  <option value="">Select (optional)</option>
                  {OCCUPATION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* ── Medical ── */}
              <p
                className="font-['DM_Sans'] font-bold uppercase tracking-[2px] mt-6 mb-2"
                style={{ fontSize: 11, color: colors.muted }}
              >
                MEDICAL
              </p>

              <div className="mb-4">
                <SectionLabel label="MEDICAL CONDITIONS" className="mb-2" />
                <p className="text-[11px] font-['DM_Sans'] mb-2" style={{ color: colors.muted }}>
                  Odin adjusts intensity and avoids contraindicated movements for each condition.
                </p>
                <div className="flex flex-wrap gap-2">
                  {medicalOptions.map((opt) => (
                    <TagPill
                      key={opt}
                      label={opt}
                      active={form.medical_conditions.includes(opt)}
                      onTap={() => toggleMedical(opt)}
                    />
                  ))}
                </div>
              </div>

              {/* ── Injuries ── */}
              <p
                className="font-['DM_Sans'] font-bold uppercase tracking-[2px] mt-6 mb-2"
                style={{ fontSize: 11, color: colors.muted }}
              >
                INJURIES & PAIN
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
                  style={inputStyle}
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

              {injuries.length === 0 && (
                <p className="text-[13px] font-['DM_Sans'] mb-2" style={{ color: colors.muted }}>
                  No injuries logged
                </p>
              )}

              {injuries.map((injury) => (
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
                    <button
                      onClick={() => setInjuryModification(injury.area, 'modify')}
                      className="flex-1 py-2 text-[12px] font-['DM_Sans'] font-medium transition-all duration-150 active:scale-[0.96]"
                      style={{
                        borderRadius: radius.button,
                        border: `1.5px solid ${injury.modification === 'modify' ? colors.accent : colors.border}`,
                        background:
                          injury.modification === 'modify' ? colors.accentMuted : colors.surface,
                        color: injury.modification === 'modify' ? colors.accent : colors.muted,
                        cursor: 'pointer',
                      }}
                    >
                      Modify
                    </button>
                    <button
                      onClick={() => setInjuryModification(injury.area, 'avoid')}
                      className="flex-1 py-2 text-[12px] font-['DM_Sans'] font-medium transition-all duration-150 active:scale-[0.96]"
                      style={{
                        borderRadius: radius.button,
                        border: `1.5px solid ${injury.modification === 'avoid' ? colors.accent : colors.border}`,
                        background:
                          injury.modification === 'avoid' ? colors.accentMuted : colors.surface,
                        color: injury.modification === 'avoid' ? colors.accent : colors.muted,
                        cursor: 'pointer',
                      }}
                    >
                      Avoid
                    </button>
                  </div>
                  {!injury.modification && (
                    <p className="text-[11px] mt-1.5 pl-1" style={{ color: colors.error }}>
                      Select Modify or Avoid
                    </p>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
