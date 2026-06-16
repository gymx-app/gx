import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../hooks/useToast'
import { Skeleton, SectionLabel } from './ui'
import { colors, radius } from '../styles/tokens'
import { Plus, Pencil, Trash2 } from 'lucide-react'

// ── Unit conversions (always store metric) ──

const cmToFtIn = (cm: number) => ({ ft: Math.floor(cm / 30.48), in: Math.round((cm % 30.48) / 2.54) })
const ftInToCm = (ft: number, inches: number) => Math.round((ft * 30.48) + (inches * 2.54))
const kgToLbs = (kg: number) => Math.round(kg * 2.2046)
const lbsToKg = (lbs: number) => Math.round((lbs / 2.2046) * 10) / 10
// ── Types ──

interface Injury {
  id?: string
  body_part: string
  status: 'current' | 'recovering' | 'history'
  notes: string
}

interface HealthForm {
  height_cm: string
  current_weight_kg: string
  activity_level: string
  training_experience: string
  fitness_level: string
  primary_activity: string
  occupation_type: string
  medical_conditions: string
}

type HeightUnit = 'cm' | 'ftin'
type WeightUnit = 'kg' | 'lbs'
const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Desk job, little movement outside gym' },
  { value: 'lightly_active', label: 'Lightly Active', desc: 'Some walking, light daily activity' },
  { value: 'active', label: 'Active', desc: 'Physical job or daily exercise outside gym' },
  { value: 'very_active', label: 'Very Active', desc: 'Manual labour or twice-daily training' },
]

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

const OCCUPATION_TYPES = [
  { value: 'desk_job', label: 'Desk job', desc: 'Mostly seated, low physical demand' },
  { value: 'light_physical', label: 'Light physical', desc: 'On feet, moderate movement' },
  { value: 'heavy_physical', label: 'Heavy physical', desc: 'Manual labour, high physical demand' },
]

const BODY_PARTS = [
  'knees', 'wrists', 'lower_back', 'upper_back',
  'shoulders', 'hips', 'ankles', 'neck',
  'elbows', 'hamstrings', 'quads', 'calves',
]

const STATUS_OPTIONS: { value: Injury['status']; label: string; desc: string }[] = [
  { value: 'current', label: 'Avoid', desc: 'No load on this area' },
  { value: 'recovering', label: 'Modify', desc: 'Can train with modifications' },
]

// ── Unit Toggle ──

function UnitToggle<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-[8px] overflow-hidden" style={{ border: `1px solid ${colors.border}` }}>
      {options.map(opt => {
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

// ── Injury Editor ──

function InjuryEditor({ injury, onSave, onCancel }: { injury?: Injury; onSave: (i: Injury) => void; onCancel: () => void }) {
  const [bodyPart, setBodyPart] = useState(injury?.body_part ?? '')
  const [status, setStatus] = useState<Injury['status']>(injury?.status ?? 'current')
  const [notes, setNotes] = useState(injury?.notes ?? '')

  return (
    <div className="p-3 mt-2 mb-2" style={{ background: colors.surface2, borderRadius: 12, border: `1px solid ${colors.border}` }}>
      <SectionLabel label="BODY PART" className="mb-2" />
      <select
        value={bodyPart}
        onChange={e => setBodyPart(e.target.value)}
        className="w-full h-[44px] px-3 text-[14px] font-['DM_Sans'] text-[#f0ede8] mb-3"
        style={{ background: colors.surface, border: `1.5px solid ${colors.border}`, borderRadius: radius.input, colorScheme: 'dark' }}
      >
        <option value="">Select area</option>
        {BODY_PARTS.map(p => (
          <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>
        ))}
      </select>

      <SectionLabel label="SEVERITY" className="mb-2" />
      <div className="grid grid-cols-2 gap-2 mb-3">
        {STATUS_OPTIONS.map(opt => {
          const active = status === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => setStatus(opt.value)}
              className="py-2 text-[12px] font-['DM_Sans'] font-medium transition-all duration-150 active:scale-[0.96]"
              style={{
                borderRadius: radius.button,
                border: `1.5px solid ${active ? (opt.value === 'current' ? colors.error : colors.warning) : colors.border}`,
                background: active ? (opt.value === 'current' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)') : colors.surface,
                color: active ? (opt.value === 'current' ? colors.error : colors.warning) : colors.muted,
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>

      <SectionLabel label="NOTES (OPTIONAL)" className="mb-2" />
      <input
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="e.g. pain on deep flexion"
        className="w-full h-[44px] px-3 text-[14px] font-['DM_Sans'] text-[#f0ede8] placeholder:text-[#444444] mb-3"
        style={{ background: colors.surface, border: `1.5px solid ${colors.border}`, borderRadius: radius.input }}
      />

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2 text-[13px] font-['DM_Sans'] font-medium active:opacity-70"
          style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, color: colors.muted, cursor: 'pointer' }}
        >
          Cancel
        </button>
        <button
          onClick={() => {
            if (!bodyPart) return
            onSave({ id: injury?.id, body_part: bodyPart, status, notes: notes.trim() })
          }}
          disabled={!bodyPart}
          className="flex-1 py-2 text-[13px] font-['DM_Sans'] font-medium active:opacity-70"
          style={{
            background: bodyPart ? colors.accent : colors.surface3,
            border: 'none',
            borderRadius: 10,
            color: bodyPart ? '#fff' : colors.muted,
            cursor: bodyPart ? 'pointer' : 'default',
          }}
        >
          {injury?.id ? 'Update' : 'Add'}
        </button>
      </div>
    </div>
  )
}

// ── Severity Badge ──

function SeverityBadge({ status }: { status: Injury['status'] }) {
  const isAvoid = status === 'current'
  return (
    <span
      className="text-[10px] font-bold tracking-[0.5px] uppercase px-2 py-[2px] rounded-[4px]"
      style={{
        background: isAvoid ? colors.error : colors.warning,
        color: isAvoid ? '#fff' : '#1a1a1a',
      }}
    >
      {isAvoid ? 'AVOID' : 'MODIFY'}
    </span>
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

  const [form, setForm] = useState<HealthForm>({ height_cm: '', current_weight_kg: '', activity_level: '', training_experience: '', fitness_level: '', primary_activity: '', occupation_type: '', medical_conditions: '' })
  const [injuries, setInjuries] = useState<Injury[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [heightUnit, setHeightUnit] = useState<HeightUnit>('cm')
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg')
  const [heightFt, setHeightFt] = useState('')
  const [heightIn, setHeightIn] = useState('')
  const [displayWeight, setDisplayWeight] = useState('')

  const [editingInjury, setEditingInjury] = useState<Injury | null>(null)
  const [addingInjury, setAddingInjury] = useState(false)

  useEffect(() => {
    if (!open || !user) return
    setLoading(true)
    setEditingInjury(null)
    setAddingInjury(false)

    Promise.all([
      supabase
        .from('user_profiles')
        .select('height_cm, current_weight_kg, activity_level, training_experience, fitness_level, primary_activity, occupation_type, medical_conditions')
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('user_injuries')
        .select('id, body_part, status, notes')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }),
    ]).then(([profileRes, injuriesRes]) => {
      const d = profileRes.data as Record<string, unknown> | null
      const h = d?.height_cm ? String(d.height_cm) : ''
      const w = d?.current_weight_kg ? String(d.current_weight_kg) : ''

      setForm({
        height_cm: h,
        current_weight_kg: w,
        activity_level: (d?.activity_level as string) ?? '',
        training_experience: (d?.training_experience as string) ?? '',
        fitness_level: (d?.fitness_level as string) ?? '',
        primary_activity: (d?.primary_activity as string) ?? '',
        occupation_type: (d?.occupation_type as string) ?? '',
        medical_conditions: (d?.medical_conditions as string) ?? '',
      })
      setDisplayWeight(w)

      if (h) {
        const cm = parseFloat(h)
        const { ft, in: inches } = cmToFtIn(cm)
        setHeightFt(String(ft))
        setHeightIn(String(inches))
      } else {
        setHeightFt('')
        setHeightIn('')
      }

      setInjuries((injuriesRes.data as Injury[]) ?? [])
      setHeightUnit('cm')
      setWeightUnit('kg')
      setLoading(false)
    })
  }, [open, user])

  const handleHeightUnitChange = useCallback((unit: HeightUnit) => {
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
      setForm(prev => ({ ...prev, height_cm: String(cm) }))
    }
  }, [heightUnit, form.height_cm, heightFt, heightIn])

  const handleWeightUnitChange = useCallback((unit: WeightUnit) => {
    if (unit === weightUnit) return
    setWeightUnit(unit)
    if (unit === 'lbs' && form.current_weight_kg) {
      setDisplayWeight(String(kgToLbs(parseFloat(form.current_weight_kg))))
    } else if (unit === 'kg' && displayWeight) {
      const kg = lbsToKg(parseFloat(displayWeight))
      setDisplayWeight(String(kg))
      setForm(prev => ({ ...prev, current_weight_kg: String(kg) }))
    }
  }, [weightUnit, form.current_weight_kg, displayWeight])

  const updateHeightCm = useCallback((val: string) => {
    setForm(prev => ({ ...prev, height_cm: val }))
  }, [])

  const updateWeightDisplay = useCallback((val: string) => {
    setDisplayWeight(val)
    if (weightUnit === 'kg') {
      setForm(prev => ({ ...prev, current_weight_kg: val }))
    } else {
      const kg = val ? String(lbsToKg(parseFloat(val))) : ''
      setForm(prev => ({ ...prev, current_weight_kg: kg }))
    }
  }, [weightUnit])

  const updateHeightFtIn = useCallback((ft: string, inches: string) => {
    setHeightFt(ft)
    setHeightIn(inches)
    const cm = ftInToCm(parseInt(ft) || 0, parseInt(inches) || 0)
    setForm(prev => ({ ...prev, height_cm: cm > 0 ? String(cm) : '' }))
  }, [])

  const handleSaveInjury = useCallback(async (injury: Injury) => {
    if (!user) return
    if (injury.id) {
      const { error } = await supabase
        .from('user_injuries')
        .update({ body_part: injury.body_part, status: injury.status, notes: injury.notes, updated_at: new Date().toISOString() })
        .eq('id', injury.id)
      if (error) { toast.show({ message: 'Failed to update injury', type: 'error' }); return }
      setInjuries(prev => prev.map(i => i.id === injury.id ? { ...i, ...injury } : i))
    } else {
      const { data, error } = await supabase
        .from('user_injuries')
        .insert({ user_id: user.id, body_part: injury.body_part, status: injury.status, notes: injury.notes })
        .select('id, body_part, status, notes')
        .single()
      if (error) { toast.show({ message: 'Failed to add injury', type: 'error' }); return }
      setInjuries(prev => [...prev, data as Injury])
    }
    setEditingInjury(null)
    setAddingInjury(false)
  }, [user, toast])

  const handleDeleteInjury = useCallback(async (id: string) => {
    const { error } = await supabase.from('user_injuries').delete().eq('id', id)
    if (error) { toast.show({ message: 'Failed to delete injury', type: 'error' }); return }
    setInjuries(prev => prev.filter(i => i.id !== id))
  }, [toast])

  const handleSave = useCallback(async () => {
    if (!user) return
    setSaving(true)

    const { error } = await supabase
      .from('user_profiles')
      .update({
        height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
        current_weight_kg: form.current_weight_kg ? parseFloat(form.current_weight_kg) : null,
        activity_level: form.activity_level || null,
        training_experience: form.training_experience || null,
        fitness_level: form.fitness_level || null,
        primary_activity: form.primary_activity.trim() || null,
        occupation_type: form.occupation_type || null,
        medical_conditions: form.medical_conditions.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    setSaving(false)
    if (error) {
      toast.show({ message: 'Failed to save health details', type: 'error' })
      return
    }
    onClose()
  }, [form, user, toast, onClose])

  if (!open) return null

  const inputStyle = { background: colors.surface2, border: `1.5px solid ${colors.border}`, borderRadius: radius.input }

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
            HEALTH DETAILS
          </h3>
          <button
            onClick={handleSave}
            disabled={saving}
            className="font-['DM_Sans'] text-[14px] font-semibold active:opacity-60"
            style={{ color: saving ? colors.muted : colors.accent, background: 'none', border: 'none', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}
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
              <p className="font-['DM_Sans'] font-bold uppercase tracking-[2px] mt-4 mb-2" style={{ fontSize: 11, color: colors.muted }}>
                PHYSICAL
              </p>

              {/* Height */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <SectionLabel label="HEIGHT" />
                  <UnitToggle
                    value={heightUnit}
                    options={[{ value: 'cm' as HeightUnit, label: 'cm' }, { value: 'ftin' as HeightUnit, label: 'ft+in' }]}
                    onChange={handleHeightUnitChange}
                  />
                </div>
                {heightUnit === 'cm' ? (
                  <input
                    type="number"
                    inputMode="decimal"
                    value={form.height_cm}
                    onChange={e => updateHeightCm(e.target.value)}
                    placeholder="170"
                    className="w-full h-[52px] px-[14px] text-[16px] font-['DM_Sans'] text-[#f0ede8] placeholder:text-[#444444]"
                    style={inputStyle}
                    aria-label="Height in centimeters"
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={heightFt}
                      onChange={e => updateHeightFtIn(e.target.value, heightIn)}
                      placeholder="5"
                      className="w-full h-[52px] px-[14px] text-[16px] font-['DM_Sans'] text-[#f0ede8] placeholder:text-[#444444]"
                      style={inputStyle}
                      aria-label="Height feet"
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      value={heightIn}
                      onChange={e => updateHeightFtIn(heightFt, e.target.value)}
                      placeholder="7"
                      className="w-full h-[52px] px-[14px] text-[16px] font-['DM_Sans'] text-[#f0ede8] placeholder:text-[#444444]"
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
                    options={[{ value: 'kg' as WeightUnit, label: 'kg' }, { value: 'lbs' as WeightUnit, label: 'lbs' }]}
                    onChange={handleWeightUnitChange}
                  />
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={displayWeight}
                  onChange={e => updateWeightDisplay(e.target.value)}
                  placeholder={weightUnit === 'kg' ? '75' : '165'}
                  className="w-full h-[52px] px-[14px] text-[16px] font-['DM_Sans'] text-[#f0ede8] placeholder:text-[#444444]"
                  style={inputStyle}
                  aria-label={`Weight in ${weightUnit}`}
                />
                <p className="text-[11px] mt-1 pl-1" style={{ color: colors.muted }}>Override by InBody when available</p>
              </div>

              {/* ── Training Background ── */}
              <p className="font-['DM_Sans'] font-bold uppercase tracking-[2px] mt-6 mb-2" style={{ fontSize: 11, color: colors.muted }}>
                TRAINING BACKGROUND
              </p>

              <div className="mb-4">
                <SectionLabel label="TRAINING EXPERIENCE" className="mb-2" />
                <div className="grid grid-cols-2 gap-2">
                  {TRAINING_EXPERIENCE.map(opt => {
                    const active = form.training_experience === opt.value
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setForm(prev => ({ ...prev, training_experience: active ? '' : opt.value }))}
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
                  {FITNESS_LEVELS.map(opt => {
                    const active = form.fitness_level === opt.value
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setForm(prev => ({ ...prev, fitness_level: active ? '' : opt.value }))}
                        className="w-full text-left px-4 py-3 transition-all duration-150 active:scale-[0.98]"
                        style={{
                          borderRadius: radius.button,
                          border: `1.5px solid ${active ? colors.accent : colors.border}`,
                          background: active ? colors.accentMuted : colors.surface2,
                          cursor: 'pointer',
                        }}
                      >
                        <span className="text-[13px] font-['DM_Sans'] font-medium block" style={{ color: active ? colors.accent : colors.text }}>
                          {opt.label}
                        </span>
                        <span className="text-[11px] font-['DM_Sans'] block mt-[2px]" style={{ color: colors.muted }}>
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
                  onChange={e => setForm(prev => ({ ...prev, primary_activity: e.target.value }))}
                  placeholder="e.g. Cricket, Running, nothing outside gym"
                  className="w-full h-[52px] px-[14px] text-[16px] font-['DM_Sans'] text-[#f0ede8] placeholder:text-[#444444]"
                  style={inputStyle}
                  aria-label="Primary sport or activity"
                />
                <p className="text-[11px] mt-1 pl-1" style={{ color: colors.muted }}>Helps personalise your programme</p>
              </div>

              {/* ── Lifestyle ── */}
              <p className="font-['DM_Sans'] font-bold uppercase tracking-[2px] mt-6 mb-2" style={{ fontSize: 11, color: colors.muted }}>
                LIFESTYLE
              </p>

              <div className="mb-4">
                <SectionLabel label="ACTIVITY LEVEL" className="mb-2" />
                <div className="flex flex-col gap-2">
                  {ACTIVITY_LEVELS.map(opt => {
                    const active = form.activity_level === opt.value
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setForm(prev => ({ ...prev, activity_level: active ? '' : opt.value }))}
                        className="w-full text-left px-4 py-3 transition-all duration-150 active:scale-[0.98]"
                        style={{
                          borderRadius: radius.button,
                          border: `1.5px solid ${active ? colors.accent : colors.border}`,
                          background: active ? colors.accentMuted : colors.surface2,
                          cursor: 'pointer',
                        }}
                      >
                        <span className="text-[13px] font-['DM_Sans'] font-medium block" style={{ color: active ? colors.accent : colors.text }}>
                          {opt.label}
                        </span>
                        <span className="text-[11px] font-['DM_Sans'] block mt-[2px]" style={{ color: colors.muted }}>
                          {opt.desc}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="mb-4">
                <SectionLabel label="OCCUPATION TYPE" className="mb-2" />
                <div className="flex flex-col gap-2">
                  {OCCUPATION_TYPES.map(opt => {
                    const active = form.occupation_type === opt.value
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setForm(prev => ({ ...prev, occupation_type: active ? '' : opt.value }))}
                        className="w-full text-left px-4 py-3 transition-all duration-150 active:scale-[0.98]"
                        style={{
                          borderRadius: radius.button,
                          border: `1.5px solid ${active ? colors.accent : colors.border}`,
                          background: active ? colors.accentMuted : colors.surface2,
                          cursor: 'pointer',
                        }}
                      >
                        <span className="text-[13px] font-['DM_Sans'] font-medium block" style={{ color: active ? colors.accent : colors.text }}>
                          {opt.label}
                        </span>
                        <span className="text-[11px] font-['DM_Sans'] block mt-[2px]" style={{ color: colors.muted }}>
                          {opt.desc}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* ── Medical ── */}
              <p className="font-['DM_Sans'] font-bold uppercase tracking-[2px] mt-6 mb-2" style={{ fontSize: 11, color: colors.muted }}>
                MEDICAL
              </p>

              <div className="mb-4">
                <SectionLabel label="MEDICAL CONDITIONS" className="mb-2" />
                <textarea
                  value={form.medical_conditions}
                  onChange={e => {
                    if (e.target.value.length <= 500) setForm(prev => ({ ...prev, medical_conditions: e.target.value }))
                  }}
                  placeholder="Any conditions your trainer should know about e.g. hypertension, diabetes, heart condition, asthma"
                  maxLength={500}
                  rows={3}
                  className="w-full px-[14px] py-3 text-[16px] font-['DM_Sans'] text-[#f0ede8] placeholder:text-[#444444] resize-none"
                  style={inputStyle}
                  aria-label="Medical conditions"
                />
                <p className="text-[11px] mt-1 pl-1 text-right" style={{ color: colors.muted }}>
                  {form.medical_conditions.length} / 500
                </p>
              </div>

              {/* ── Injuries ── */}
              <p className="font-['DM_Sans'] font-bold uppercase tracking-[2px] mt-6 mb-2" style={{ fontSize: 11, color: colors.muted }}>
                INJURIES & PAIN
              </p>

              {injuries.length === 0 && !addingInjury && (
                <p className="text-[13px] font-['DM_Sans'] mb-2" style={{ color: colors.muted }}>No injuries logged</p>
              )}

              {injuries.map(injury => (
                editingInjury?.id === injury.id ? (
                  <InjuryEditor
                    key={injury.id}
                    injury={injury}
                    onSave={handleSaveInjury}
                    onCancel={() => setEditingInjury(null)}
                  />
                ) : (
                  <div
                    key={injury.id}
                    className="flex items-center gap-3 py-3 px-3 mb-1"
                    style={{ background: colors.surface2, borderRadius: 10, border: `1px solid ${colors.border}` }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-['DM_Sans'] capitalize" style={{ color: colors.text }}>
                          {injury.body_part.replace(/_/g, ' ')}
                        </span>
                        <SeverityBadge status={injury.status} />
                      </div>
                      {injury.notes && (
                        <p className="text-[11px] mt-1 truncate" style={{ color: colors.muted }}>{injury.notes}</p>
                      )}
                    </div>
                    <button
                      onClick={() => setEditingInjury(injury)}
                      className="p-2 active:opacity-60"
                      style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                      aria-label="Edit injury"
                    >
                      <Pencil size={14} color={colors.muted} />
                    </button>
                    <button
                      onClick={() => injury.id && handleDeleteInjury(injury.id)}
                      className="p-2 active:opacity-60"
                      style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                      aria-label="Delete injury"
                    >
                      <Trash2 size={14} color={colors.error} />
                    </button>
                  </div>
                )
              ))}

              {addingInjury && (
                <InjuryEditor
                  onSave={handleSaveInjury}
                  onCancel={() => setAddingInjury(false)}
                />
              )}

              {!addingInjury && injuries.length < 10 && (
                <button
                  onClick={() => setAddingInjury(true)}
                  className="flex items-center gap-2 mt-2 py-2 px-3 active:opacity-60"
                  style={{ background: 'none', border: `1px dashed ${colors.border}`, borderRadius: 10, cursor: 'pointer', width: '100%' }}
                >
                  <Plus size={16} color={colors.accent} />
                  <span className="text-[13px] font-['DM_Sans'] font-medium" style={{ color: colors.accent }}>Add Injury</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
