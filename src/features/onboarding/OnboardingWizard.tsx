import { useState, useCallback, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'
import { colors, radius } from '../../styles/tokens'
import { SectionLabel } from '../../components/ui'
import { calculateAge, getMaxDobForMinAge } from '../../utils/dateUtils'
import { ChevronLeft, X, Loader2 } from 'lucide-react'

// ── Unit conversions (client-side, always store metric) ──
const ftInToCm = (ft: number, inches: number) => Math.round(ft * 30.48 + inches * 2.54)
const lbsToKg = (lbs: number) => Math.round((lbs / 2.205) * 10) / 10

const MIN_AGE = 13

// ── Types ──
type Gender = 'male' | 'female' | 'other' | ''
type HeightUnit = 'cm' | 'ft'
type WeightUnit = 'kg' | 'lbs'
type FitnessLevel = 'beginner' | 'intermediate' | 'advanced' | ''
type Goal = 'fat_loss' | 'muscle_gain' | 'strength' | 'recomposition' | 'general_fitness' | ''
type Equipment = 'full_gym' | 'dumbbells_only' | 'home_gym' | 'bodyweight_only' | ''
type WorkoutTime = 'morning' | 'afternoon' | 'evening' | null
type BaselinePath = 'self_reported' | 'day_one_test' | 'skipped' | ''
type PrimaryLift = 'squat' | 'bench_press' | 'deadlift' | 'overhead_press' | ''
type EnduranceFocus = 'cardio' | 'mobility' | 'general' | ''
type InjuryChoice = 'modify' | 'avoid' | null

interface Step1Form {
  full_name: string
  gender: Gender
  dob: string
  nationality: string
}

interface Step2Form {
  height_value: string
  height_ft: string
  height_in: string
  height_unit: HeightUnit
  weight_value: string
  weight_unit: WeightUnit
  fitness_level: FitnessLevel
  lifestyle: string[]
  occupation: string
}

interface KnownLift {
  exercise_id: string
  weight_kg: string
  reps: string
}

interface InjuryTag {
  area: string
  choice: InjuryChoice
}

// Field names mirror GenerateProgrammeView's GoalRefineForm so the collected
// values can be handed straight to the generate-programme flow after onboarding.
interface Step3Form {
  goal: Goal
  current_body_fat_pct: string
  target_body_fat_pct: string
  target_muscle_gain_kg: string
  timeframe_weeks: string
  primary_lift: PrimaryLift
  current_1rm_kg: string
  target_1rm_kg: string
  endurance_focus: EnduranceFocus

  equipment: Equipment

  days_per_week: number
  session_duration_min: number
  preferred_workout_time: WorkoutTime

  baseline_path: BaselinePath
  known_lifts: KnownLift[]

  medical_conditions: string[]
  medical_conditions_other: string

  injuries: InjuryTag[]
}

const EMPTY_STEP1: Step1Form = { full_name: '', gender: '', dob: '', nationality: 'India' }

const EMPTY_STEP2: Step2Form = {
  height_value: '',
  height_ft: '',
  height_in: '',
  height_unit: 'cm',
  weight_value: '',
  weight_unit: 'kg',
  fitness_level: '',
  lifestyle: [],
  occupation: '',
}

const EMPTY_STEP3: Step3Form = {
  goal: '',
  current_body_fat_pct: '',
  target_body_fat_pct: '',
  target_muscle_gain_kg: '',
  timeframe_weeks: '',
  primary_lift: '',
  current_1rm_kg: '',
  target_1rm_kg: '',
  endurance_focus: '',
  equipment: '',
  days_per_week: 4,
  session_duration_min: 60,
  preferred_workout_time: null,
  baseline_path: '',
  known_lifts: [],
  medical_conditions: [],
  medical_conditions_other: '',
  injuries: [],
}

// ── Option constants ──
const GOAL_OPTIONS: { value: Goal; label: string; description: string }[] = [
  {
    value: 'fat_loss',
    label: 'Fat Loss',
    description:
      'Burn fat while preserving muscle. Moderate loads, shorter rest, strategic conditioning.',
  },
  {
    value: 'muscle_gain',
    label: 'Muscle Gain',
    description:
      'Build size through progressive overload. Higher volumes, heavier loads, longer rest.',
  },
  {
    value: 'strength',
    label: 'Strength',
    description:
      'Get stronger on the lifts that matter. Percentage-based loading and peaking protocols.',
  },
  {
    value: 'recomposition',
    label: 'Recomposition',
    description:
      'Lose fat and build muscle simultaneously. Precise programming — slower than either goal alone.',
  },
  {
    value: 'general_fitness',
    label: 'General Fitness',
    description: 'Build a well-rounded base. Balanced strength and conditioning.',
  },
]

const EQUIPMENT_OPTIONS: { value: Equipment; label: string; description: string }[] = [
  { value: 'full_gym', label: 'Full Gym', description: 'Barbells, dumbbells, cables, machines.' },
  {
    value: 'dumbbells_only',
    label: 'Dumbbells Only',
    description: 'DB press, rows, lunges — effective and versatile.',
  },
  { value: 'home_gym', label: 'Home Gym', description: 'Mixed equipment at home.' },
  {
    value: 'bodyweight_only',
    label: 'Bodyweight Only',
    description: 'No equipment. Pure calisthenics.',
  },
]

const FITNESS_LEVEL_OPTIONS: { value: FitnessLevel; label: string; description: string }[] = [
  {
    value: 'beginner',
    label: 'Beginner',
    description:
      'Less than 1 year consistent training. We prioritise technique and building a sustainable base.',
  },
  {
    value: 'intermediate',
    label: 'Intermediate',
    description:
      '1–3 years consistent training. Ready for structured periodisation and progressive overload.',
  },
  {
    value: 'advanced',
    label: 'Advanced',
    description: '3+ years serious training. Higher intensity, volume, and specificity.',
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

const DURATION_OPTIONS = [30, 45, 60, 75, 90]

const WORKOUT_TIME_OPTIONS: { value: NonNullable<WorkoutTime>; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
]

const PRIMARY_LIFT_OPTIONS: { value: PrimaryLift; label: string }[] = [
  { value: 'squat', label: 'Squat' },
  { value: 'bench_press', label: 'Bench Press' },
  { value: 'deadlift', label: 'Deadlift' },
  { value: 'overhead_press', label: 'Overhead Press' },
]

const ENDURANCE_FOCUS_OPTIONS: { value: EnduranceFocus; label: string }[] = [
  { value: 'cardio', label: 'Endurance' },
  { value: 'mobility', label: 'Mobility' },
  { value: 'general', label: 'Overall Health' },
]

const BASELINE_PATH_OPTIONS: { value: BaselinePath; label: string; description: string }[] = [
  {
    value: 'self_reported',
    label: 'I know my working weights',
    description:
      'Enter a recent set. Odin estimates your 1RM using the Epley formula and prescribes Day 1 weights.',
  },
  {
    value: 'day_one_test',
    label: 'Test on Day 1',
    description:
      'Your programme starts with a baseline session. Work up to a hard set of 5 reps on each compound lift — Odin calculates weights from Day 2.',
  },
  {
    value: 'skipped',
    label: 'Skip — use RPE only',
    description:
      'Effort targets instead of specific weights. You choose the weight that feels right based on RPE guidance.',
  },
]

const KNOWN_LIFT_EXERCISES: { value: string; label: string }[] = [
  { value: 'squat', label: 'Squat' },
  { value: 'bench_press', label: 'Bench Press' },
  { value: 'deadlift', label: 'Deadlift' },
  { value: 'overhead_press', label: 'Overhead Press' },
  { value: 'barbell_row', label: 'Barbell Row' },
]

const MEDICAL_CONDITIONS_ALL = [
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

const MEDICAL_CONDITIONS_FEMALE_OTHER = [
  'PCOD / PCOS',
  'Endometriosis',
  'Osteoporosis',
  'Pregnancy / Postpartum',
]

const MEDICAL_CONDITIONS_MALE_OTHER = ['Low Testosterone (diagnosed)', 'Hernia']

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

const COUNTRIES = [
  'India',
  'United States',
  'United Kingdom',
  'United Arab Emirates',
  'Australia',
  'Canada',
  'Singapore',
  'Germany',
  'France',
  'Netherlands',
  'New Zealand',
  'Ireland',
  'South Africa',
  'Nigeria',
  'Kenya',
  'Pakistan',
  'Bangladesh',
  'Sri Lanka',
  'Nepal',
  'Philippines',
  'Malaysia',
  'Indonesia',
  'Thailand',
  'Vietnam',
  'Japan',
  'South Korea',
  'China',
  'Saudi Arabia',
  'Qatar',
  'Kuwait',
  'Oman',
  'Bahrain',
  'Italy',
  'Spain',
  'Portugal',
  'Switzerland',
  'Sweden',
  'Norway',
  'Denmark',
  'Finland',
  'Poland',
  'Brazil',
  'Mexico',
  'Argentina',
  'Egypt',
  'Turkey',
  'Israel',
  'Russia',
  'Other',
]

const SESSION_DURATION_STORAGE_KEY = 'gx-onboarding-programme-payload'

const INPUT_STYLE: React.CSSProperties = {
  background: colors.surface2,
  border: `1.5px solid ${colors.border}`,
  borderRadius: radius.input,
}

// ── Shared building blocks ──

function FieldHelper({ text }: { text: string }) {
  return (
    <p className="text-[11px] mt-1.5 pl-1 leading-relaxed" style={{ color: colors.muted }}>
      {text}
    </p>
  )
}

function FieldError({ text }: { text: string }) {
  return (
    <p className="text-[11px] mt-1 pl-1" style={{ color: colors.error }}>
      {text}
    </p>
  )
}

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
      className="flex-1 py-3.5 min-h-[44px] text-[14px] font-['DM_Sans'] font-medium tracking-[0.3px] transition-all duration-150 active:scale-[0.96]"
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

function TagPill({ label, active, onTap }: { label: string; active: boolean; onTap: () => void }) {
  return (
    <button
      onClick={onTap}
      className="px-3.5 py-2.5 min-h-[44px] text-[13px] font-['DM_Sans'] font-medium tracking-[0.2px] transition-all duration-150 active:scale-[0.96]"
      style={{
        borderRadius: radius.chip,
        border: `1.5px solid ${active ? colors.accent : colors.border}`,
        background: active ? colors.accentMuted : colors.surface2,
        color: active ? colors.accent : colors.textSecondary,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}

function MultiSelectPills({
  options,
  values,
  onChange,
}: {
  options: string[]
  values: string[]
  onChange: (values: string[]) => void
}) {
  const toggle = (opt: string) => {
    onChange(values.includes(opt) ? values.filter((v) => v !== opt) : [...values, opt])
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <TagPill key={opt} label={opt} active={values.includes(opt)} onTap={() => toggle(opt)} />
      ))}
    </div>
  )
}

function SelectableCard({
  title,
  description,
  active,
  onTap,
}: {
  title: string
  description: string
  active: boolean
  onTap: () => void
}) {
  return (
    <button
      onClick={onTap}
      className="w-full text-left px-4 py-3.5 mb-2.5 transition-all duration-150 active:scale-[0.98]"
      style={{
        borderRadius: radius.button,
        border: `1.5px solid ${active ? colors.accent : colors.border}`,
        background: active ? colors.accentMuted : colors.surface2,
        cursor: 'pointer',
      }}
    >
      <p
        className="font-['Bebas_Neue'] text-[20px] tracking-[1px] leading-none mb-1.5"
        style={{ color: active ? colors.accent : colors.text }}
      >
        {title}
      </p>
      <p className="text-[12px] font-['DM_Sans'] leading-relaxed" style={{ color: colors.muted }}>
        {description}
      </p>
    </button>
  )
}

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

function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-4 justify-center">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-14 h-14 flex items-center justify-center text-[22px] font-['Bebas_Neue'] active:scale-[0.9] transition-transform"
        style={{
          borderRadius: radius.button,
          border: `1.5px solid ${colors.border}`,
          background: colors.surface2,
          color: value <= min ? colors.muted : colors.text,
          cursor: value <= min ? 'default' : 'pointer',
        }}
      >
        −
      </button>
      <span className="font-['Bebas_Neue'] text-[48px] text-[#f0ede8] leading-none w-16 text-center">
        {value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-14 h-14 flex items-center justify-center text-[22px] font-['Bebas_Neue'] active:scale-[0.9] transition-transform"
        style={{
          borderRadius: radius.button,
          border: `1.5px solid ${colors.border}`,
          background: colors.surface2,
          color: value >= max ? colors.muted : colors.text,
          cursor: value >= max ? 'default' : 'pointer',
        }}
      >
        +
      </button>
    </div>
  )
}

function SearchableSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.toLowerCase().includes(q))
  }, [query, options])

  return (
    <div className="relative">
      <input
        type="text"
        value={open ? query : value}
        onFocus={() => {
          setOpen(true)
          setQuery('')
        }}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search country…"
        className="h-[52px] w-full px-[14px] text-[#f0ede8] text-[16px] font-['DM_Sans'] placeholder:text-[#444444]"
        style={INPUT_STYLE}
      />
      {open && (
        <div
          className="absolute left-0 right-0 mt-1 max-h-[220px] overflow-y-auto z-10"
          style={{
            background: colors.surface2,
            border: `1.5px solid ${colors.border}`,
            borderRadius: radius.input,
          }}
        >
          {filtered.length === 0 && (
            <p
              className="px-[14px] py-3 text-[13px] font-['DM_Sans']"
              style={{ color: colors.muted }}
            >
              No matches
            </p>
          )}
          {filtered.map((opt) => (
            <button
              key={opt}
              onMouseDown={(e) => {
                e.preventDefault()
                onChange(opt)
                setOpen(false)
              }}
              className="block w-full text-left px-[14px] py-3 text-[14px] font-['DM_Sans'] active:opacity-70"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: opt === value ? colors.accent : colors.text,
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function NumberField({
  label,
  helper,
  hint,
  value,
  onChange,
  min,
  max,
}: {
  label: string
  helper?: string
  hint?: string
  value: string
  onChange: (v: string) => void
  min?: number
  max?: number
}) {
  return (
    <div className="mb-4">
      <SectionLabel label={label} className="mb-2" />
      <input
        type="number"
        inputMode="decimal"
        step="0.1"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="—"
        className="h-[48px] w-full px-[14px] text-[#f0ede8] text-[15px] font-['DM_Sans'] placeholder:text-[#444444]"
        style={INPUT_STYLE}
      />
      {hint && <FieldHelper text={hint} />}
      {helper && !hint && <FieldHelper text={helper} />}
    </div>
  )
}

// ── Derived-value helpers ──

function getHeightCm(form: Step2Form): number {
  if (form.height_unit === 'cm') {
    const cm = parseFloat(form.height_value)
    return isNaN(cm) || cm <= 0 ? 0 : cm
  }
  const ft = parseInt(form.height_ft) || 0
  const inches = parseInt(form.height_in) || 0
  if (ft <= 0 && inches <= 0) return 0
  return ftInToCm(ft, inches)
}

function getWeightKg(value: string, unit: WeightUnit): number {
  const v = parseFloat(value)
  if (isNaN(v) || v <= 0) return 0
  return unit === 'kg' ? v : lbsToKg(v)
}

// ════════════════════════════════════════════════════
// STEP 1 — Personal Details
// ════════════════════════════════════════════════════

function Step1Personal({
  form,
  onUpdate,
  attempted,
}: {
  form: Step1Form
  onUpdate: <K extends keyof Step1Form>(key: K, value: Step1Form[K]) => void
  attempted: boolean
}) {
  const age = calculateAge(form.dob)
  const maxDob = getMaxDobForMinAge(MIN_AGE)
  const validDob = form.dob === '' || (age !== null && age >= MIN_AGE)

  return (
    <>
      <h1 className="font-['Bebas_Neue'] text-[32px] tracking-[2px] text-[#f0ede8] leading-none">
        LET'S START WITH YOU
      </h1>
      <p
        className="text-[14px] font-['DM_Sans'] mt-2 mb-6 leading-relaxed"
        style={{ color: colors.muted }}
      >
        This builds your training identity. It personalises everything from programme structure to
        progress tracking.
      </p>

      {/* Full Name */}
      <div className="mb-5">
        <SectionLabel label="FULL NAME" className="mb-2" />
        <input
          type="text"
          value={form.full_name}
          onChange={(e) => onUpdate('full_name', e.target.value)}
          placeholder="Enter your full name"
          className="h-[52px] w-full px-[14px] text-[#f0ede8] text-[16px] font-['DM_Sans'] placeholder:text-[#444444]"
          style={INPUT_STYLE}
        />
        {attempted && !form.full_name.trim() ? (
          <FieldError text="Name is required" />
        ) : (
          <FieldHelper text="Used across your profile and programme." />
        )}
      </div>

      {/* Gender */}
      <div className="mb-5">
        <SectionLabel label="GENDER" className="mb-2" />
        <div className="flex gap-3">
          <PillButton
            label="M"
            active={form.gender === 'male'}
            onTap={() => onUpdate('gender', 'male')}
          />
          <PillButton
            label="F"
            active={form.gender === 'female'}
            onTap={() => onUpdate('gender', 'female')}
          />
          <PillButton
            label="O"
            active={form.gender === 'other'}
            onTap={() => onUpdate('gender', 'other')}
          />
        </div>
        {attempted && !form.gender ? (
          <FieldError text="Please select your gender" />
        ) : (
          <FieldHelper text="Affects hormonal baselines, recovery patterns, and which health questions appear in the next step." />
        )}
      </div>

      {/* Date of Birth */}
      <div className="mb-5">
        <SectionLabel label="DATE OF BIRTH" className="mb-2" />
        <input
          type="date"
          value={form.dob}
          max={maxDob}
          onChange={(e) => onUpdate('dob', e.target.value)}
          className="h-[52px] w-full px-[14px] text-[#f0ede8] text-[16px] font-['DM_Sans']"
          style={{ ...INPUT_STYLE, colorScheme: 'dark' }}
        />
        {attempted && !form.dob && <FieldError text="Date of birth is required" />}
        {form.dob && !validDob && <FieldError text={`You must be at least ${MIN_AGE} years old`} />}
        {form.dob && validDob && age !== null && (
          <p className="text-[11px] mt-1.5 pl-1" style={{ color: colors.textSecondary }}>
            You are {age} years old
          </p>
        )}
        <FieldHelper text="We calculate your age automatically — you never have to update it. Age affects training volume tolerance and recovery speed." />
      </div>

      {/* Nationality */}
      <div className="mb-2">
        <SectionLabel label="NATIONALITY (OPTIONAL)" className="mb-2" />
        <SearchableSelect
          value={form.nationality}
          onChange={(v) => onUpdate('nationality', v)}
          options={COUNTRIES}
        />
        <FieldHelper text="Provides regional health and dietary context where relevant." />
      </div>
    </>
  )
}

// ════════════════════════════════════════════════════
// STEP 2 — Health & Lifestyle
// ════════════════════════════════════════════════════

function Step2Health({
  form,
  onUpdate,
  attempted,
}: {
  form: Step2Form
  onUpdate: <K extends keyof Step2Form>(key: K, value: Step2Form[K]) => void
  attempted: boolean
}) {
  const heightCm = getHeightCm(form)
  const weightKg = getWeightKg(form.weight_value, form.weight_unit)
  const fitnessDescription = FITNESS_LEVEL_OPTIONS.find(
    (o) => o.value === form.fitness_level
  )?.description

  return (
    <>
      <h1 className="font-['Bebas_Neue'] text-[32px] tracking-[2px] text-[#f0ede8] leading-none">
        YOUR BODY &amp; LIFESTYLE
      </h1>
      <p
        className="text-[14px] font-['DM_Sans'] mt-2 mb-6 leading-relaxed"
        style={{ color: colors.muted }}
      >
        The foundation of your programme. Accurate data here means training matched to your actual
        life — not a generic template.
      </p>

      {/* Height */}
      <div className="mb-5">
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
        {attempted && !heightCm ? (
          <FieldError text="Height is required" />
        ) : (
          <FieldHelper text="Used to contextualise strength standards relative to your frame." />
        )}
      </div>

      {/* Weight */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <SectionLabel label="WEIGHT" />
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
        {attempted && !weightKg ? (
          <FieldError text="Weight is required" />
        ) : (
          <FieldHelper text="Your starting point. Automatically updated when you log a new weight — we always use your most recent measurement." />
        )}
      </div>

      {/* Fitness Level */}
      <div className="mb-5">
        <SectionLabel label="FITNESS LEVEL" className="mb-2" />
        <div className="flex gap-2">
          {FITNESS_LEVEL_OPTIONS.map((opt) => (
            <PillButton
              key={opt.value}
              label={opt.label}
              active={form.fitness_level === opt.value}
              onTap={() => onUpdate('fitness_level', opt.value)}
            />
          ))}
        </div>
        {attempted && !form.fitness_level && <FieldError text="Select your fitness level" />}
        {fitnessDescription && <FieldHelper text={fitnessDescription} />}
      </div>

      {/* Lifestyle */}
      <div className="mb-5">
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
          Lifestyle directly affects recovery capacity. A desk worker and a field worker need
          different training volumes — even with identical goals.
        </p>
        <MultiSelectPills
          options={LIFESTYLE_OPTIONS}
          values={form.lifestyle}
          onChange={(v) => onUpdate('lifestyle', v)}
        />
        {attempted && form.lifestyle.length === 0 && <FieldError text="Select at least one" />}
      </div>

      {/* Occupation */}
      <div className="mb-2">
        <p
          className="text-[14px] font-['DM_Sans'] font-medium mb-1.5"
          style={{ color: colors.textSecondary }}
        >
          Your Occupation
        </p>
        <p
          className="text-[12px] font-['DM_Sans'] mb-3 leading-relaxed"
          style={{ color: colors.muted }}
        >
          Daily physical and mental load both affect training capacity and recovery.
        </p>
        <select
          value={form.occupation}
          onChange={(e) => onUpdate('occupation', e.target.value)}
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
    </>
  )
}

// ════════════════════════════════════════════════════
// STEP 3 — Programme Data
// ════════════════════════════════════════════════════

function GoalSection({
  form,
  onUpdate,
}: {
  form: Step3Form
  onUpdate: <K extends keyof Step3Form>(key: K, value: Step3Form[K]) => void
}) {
  const [subfieldsHidden, setSubfieldsHidden] = useState(false)

  return (
    <div className="mb-6">
      <p
        className="text-[14px] font-['DM_Sans'] font-medium mb-1.5"
        style={{ color: colors.textSecondary }}
      >
        What's Your Goal?
      </p>
      <p
        className="text-[12px] font-['DM_Sans'] mb-3 leading-relaxed"
        style={{ color: colors.muted }}
      >
        Your goal shapes exercise selection, rep ranges, rest periods, phase structure, and
        intensity. Be honest — a mismatched goal produces a mismatched programme.
      </p>

      {GOAL_OPTIONS.map((opt) => (
        <SelectableCard
          key={opt.value}
          title={opt.label}
          description={opt.description}
          active={form.goal === opt.value}
          onTap={() => {
            onUpdate('goal', opt.value)
            setSubfieldsHidden(false)
          }}
        />
      ))}

      {form.goal && !subfieldsHidden && (
        <div className="mt-3">
          <div className="flex justify-end mb-2">
            <button
              onClick={() => setSubfieldsHidden(true)}
              className="text-[12px] font-['DM_Sans'] font-semibold active:opacity-60"
              style={{
                color: colors.accent,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Skip these →
            </button>
          </div>

          {form.goal === 'fat_loss' && (
            <>
              <NumberField
                label="CURRENT BODY FAT % (OPTIONAL)"
                hint="From an InBody or DEXA scan. Lets Odin calculate exactly how much fat you need to lose."
                value={form.current_body_fat_pct}
                onChange={(v) => onUpdate('current_body_fat_pct', v)}
                min={3}
                max={60}
              />
              <NumberField
                label="TARGET BODY FAT % (OPTIONAL)"
                hint="Where you want to get to. Odin validates if your timeline is realistic."
                value={form.target_body_fat_pct}
                onChange={(v) => onUpdate('target_body_fat_pct', v)}
                min={3}
                max={60}
              />
              <NumberField
                label="TARGET TIMEFRAME IN WEEKS (OPTIONAL)"
                value={form.timeframe_weeks}
                onChange={(v) => onUpdate('timeframe_weeks', v)}
                min={8}
                max={52}
              />
            </>
          )}

          {form.goal === 'muscle_gain' && (
            <>
              <NumberField
                label="TARGET MUSCLE GAIN IN KG (OPTIONAL)"
                hint="Odin uses published rate models to set realistic phase structure."
                value={form.target_muscle_gain_kg}
                onChange={(v) => onUpdate('target_muscle_gain_kg', v)}
                min={0.5}
                max={20}
              />
              <NumberField
                label="TARGET TIMEFRAME IN WEEKS (OPTIONAL)"
                value={form.timeframe_weeks}
                onChange={(v) => onUpdate('timeframe_weeks', v)}
                min={8}
                max={52}
              />
            </>
          )}

          {form.goal === 'strength' && (
            <>
              <div className="mb-4">
                <SectionLabel label="PRIMARY LIFT" className="mb-2" />
                <div className="flex gap-2 flex-wrap">
                  {PRIMARY_LIFT_OPTIONS.map((opt) => (
                    <PillButton
                      key={opt.value}
                      label={opt.label}
                      active={form.primary_lift === opt.value}
                      onTap={() => onUpdate('primary_lift', opt.value)}
                    />
                  ))}
                </div>
                <FieldHelper text="Your programme anchors to this lift — it appears every relevant session with percentage-based progression." />
              </div>
              <NumberField
                label="CURRENT 1RM IN KG (OPTIONAL)"
                hint="Your best single rep. If unknown we test it on Day 1."
                value={form.current_1rm_kg}
                onChange={(v) => onUpdate('current_1rm_kg', v)}
                min={0}
                max={500}
              />
              <NumberField
                label="TARGET 1RM IN KG (OPTIONAL)"
                value={form.target_1rm_kg}
                onChange={(v) => onUpdate('target_1rm_kg', v)}
                min={0}
                max={500}
              />
              <NumberField
                label="TARGET TIMEFRAME IN WEEKS (OPTIONAL)"
                value={form.timeframe_weeks}
                onChange={(v) => onUpdate('timeframe_weeks', v)}
                min={8}
                max={52}
              />
            </>
          )}

          {form.goal === 'recomposition' && (
            <>
              <NumberField
                label="CURRENT BODY FAT % (OPTIONAL)"
                value={form.current_body_fat_pct}
                onChange={(v) => onUpdate('current_body_fat_pct', v)}
                min={3}
                max={60}
              />
              <NumberField
                label="TARGET BODY FAT % (OPTIONAL)"
                value={form.target_body_fat_pct}
                onChange={(v) => onUpdate('target_body_fat_pct', v)}
                min={3}
                max={60}
              />
              <NumberField
                label="TARGET MUSCLE GAIN IN KG (OPTIONAL)"
                value={form.target_muscle_gain_kg}
                onChange={(v) => onUpdate('target_muscle_gain_kg', v)}
                min={0.5}
                max={20}
              />
              <NumberField
                label="TARGET TIMEFRAME IN WEEKS (OPTIONAL)"
                value={form.timeframe_weeks}
                onChange={(v) => onUpdate('timeframe_weeks', v)}
                min={8}
                max={52}
              />
            </>
          )}

          {form.goal === 'general_fitness' && (
            <div className="mb-4">
              <SectionLabel label="FOCUS (OPTIONAL)" className="mb-2" />
              <div className="flex gap-2 flex-wrap">
                {ENDURANCE_FOCUS_OPTIONS.map((opt) => (
                  <PillButton
                    key={opt.value}
                    label={opt.label}
                    active={form.endurance_focus === opt.value}
                    onTap={() => onUpdate('endurance_focus', opt.value)}
                  />
                ))}
              </div>
              <FieldHelper text="Shapes balance of conditioning vs strength." />
              <NumberField
                label="TARGET TIMEFRAME IN WEEKS (OPTIONAL)"
                value={form.timeframe_weeks}
                onChange={(v) => onUpdate('timeframe_weeks', v)}
                min={8}
                max={52}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MedicalConditionsSection({
  form,
  onUpdate,
  gender,
}: {
  form: Step3Form
  onUpdate: <K extends keyof Step3Form>(key: K, value: Step3Form[K]) => void
  gender: Gender
}) {
  const options = useMemo(() => {
    const list = [...MEDICAL_CONDITIONS_ALL]
    if (gender === 'female' || gender === 'other') list.push(...MEDICAL_CONDITIONS_FEMALE_OTHER)
    if (gender === 'male' || gender === 'other') list.push(...MEDICAL_CONDITIONS_MALE_OTHER)
    return list
  }, [gender])

  const toggle = (opt: string) => {
    if (opt === 'None') {
      onUpdate('medical_conditions', form.medical_conditions.includes('None') ? [] : ['None'])
      return
    }
    const withoutNone = form.medical_conditions.filter((v) => v !== 'None')
    onUpdate(
      'medical_conditions',
      withoutNone.includes(opt) ? withoutNone.filter((v) => v !== opt) : [...withoutNone, opt]
    )
  }

  const showPregnancyWarning = form.medical_conditions.includes(PREGNANCY_LABEL)

  return (
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
        Conditions don't stop you training — they change how we programme. Odin uses this to avoid
        contraindicated movements and adjust intensity.
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <TagPill
            key={opt}
            label={opt}
            active={form.medical_conditions.includes(opt)}
            onTap={() => toggle(opt)}
          />
        ))}
      </div>

      {showPregnancyWarning && (
        <div
          className="mt-3 p-4"
          style={{
            background: 'rgba(245,158,11,0.1)',
            border: `1px solid ${colors.warning}`,
            borderRadius: radius.button,
          }}
        >
          <p
            className="text-[13px] font-['DM_Sans'] leading-relaxed"
            style={{ color: colors.warning }}
          >
            Programme generation is paused during pregnancy and postpartum. Please consult a
            certified pre/postnatal trainer or your physician before beginning structured training.
            Your profile will be saved and ready when you're cleared to train.
          </p>
        </div>
      )}

      <div className="mt-3">
        <SectionLabel label="OTHER (OPTIONAL)" className="mb-2" />
        <input
          type="text"
          value={form.medical_conditions_other}
          onChange={(e) => onUpdate('medical_conditions_other', e.target.value)}
          placeholder="Anything not listed above"
          className="h-[48px] w-full px-[14px] text-[#f0ede8] text-[14px] font-['DM_Sans'] placeholder:text-[#444444]"
          style={INPUT_STYLE}
        />
      </div>
    </div>
  )
}

function InjuriesSection({
  form,
  onUpdate,
}: {
  form: Step3Form
  onUpdate: <K extends keyof Step3Form>(key: K, value: Step3Form[K]) => void
}) {
  const [input, setInput] = useState('')

  const addInjury = (area: string) => {
    const trimmed = area.trim()
    if (!trimmed) return
    if (form.injuries.some((i) => i.area.toLowerCase() === trimmed.toLowerCase())) return
    onUpdate('injuries', [...form.injuries, { area: trimmed, choice: null }])
    setInput('')
  }

  const removeInjury = (area: string) => {
    onUpdate(
      'injuries',
      form.injuries.filter((i) => i.area !== area)
    )
  }

  const setChoice = (area: string, choice: InjuryChoice) => {
    onUpdate(
      'injuries',
      form.injuries.map((i) => (i.area === area ? { ...i, choice } : i))
    )
  }

  const remainingSuggestions = INJURY_SUGGESTIONS.filter(
    (s) => !form.injuries.some((i) => i.area.toLowerCase() === s.toLowerCase())
  )

  return (
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
        whether to work around it or avoid it entirely.
      </p>

      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addInjury(input)
            }
          }}
          placeholder="Type an area + press Enter"
          className="flex-1 h-[48px] px-[14px] text-[14px] font-['DM_Sans'] text-[#f0ede8] placeholder:text-[#444444]"
          style={INPUT_STYLE}
        />
        <button
          onClick={() => addInjury(input)}
          disabled={!input.trim()}
          className="h-[48px] px-4 text-[13px] font-['DM_Sans'] font-semibold active:scale-[0.95] transition-transform"
          style={{
            borderRadius: radius.input,
            background: input.trim() ? colors.accent : colors.surface3,
            color: input.trim() ? '#fff' : colors.muted,
            border: 'none',
            cursor: input.trim() ? 'pointer' : 'default',
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

      {form.injuries.map((injury) => (
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
              className="active:opacity-60"
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
              active={injury.choice === 'modify'}
              onTap={() => setChoice(injury.area, 'modify')}
            />
            <PillButton
              label="Avoid"
              active={injury.choice === 'avoid'}
              onTap={() => setChoice(injury.area, 'avoid')}
            />
          </div>
          {!injury.choice && <FieldError text="Select Modify or Avoid" />}
        </div>
      ))}
    </div>
  )
}

function Step3Programme({
  form,
  onUpdate,
  attempted,
  gender,
  standalone,
}: {
  form: Step3Form
  onUpdate: <K extends keyof Step3Form>(key: K, value: Step3Form[K]) => void
  attempted: boolean
  gender: Gender
  standalone: boolean
}) {
  return (
    <>
      <h1 className="font-['Bebas_Neue'] text-[32px] tracking-[2px] text-[#f0ede8] leading-none">
        {standalone ? 'ONE MORE THING' : 'BUILD YOUR PROGRAMME'}
      </h1>
      <p
        className="text-[14px] font-['DM_Sans'] mt-2 mb-6 leading-relaxed"
        style={{ color: colors.muted }}
      >
        {standalone
          ? 'We need a few training preferences before generating your programme.'
          : 'What Odin — our AI training engine — uses to generate your personalised programme. Everything here can be updated before each generation.'}
      </p>

      <GoalSection form={form} onUpdate={onUpdate} />
      {attempted && !form.goal && <FieldError text="Select a goal to continue" />}

      <EquipmentSection form={form} onUpdate={onUpdate} attempted={attempted} />
      <ScheduleSection form={form} onUpdate={onUpdate} />
      <BaselineStrengthSection form={form} onUpdate={onUpdate} />
      {attempted && form.equipment !== 'bodyweight_only' && !form.baseline_path && (
        <FieldError text="Select a starting-weights option" />
      )}
      <MedicalConditionsSection form={form} onUpdate={onUpdate} gender={gender} />
      <InjuriesSection form={form} onUpdate={onUpdate} />
    </>
  )
}

function EquipmentSection({
  form,
  onUpdate,
  attempted,
}: {
  form: Step3Form
  onUpdate: <K extends keyof Step3Form>(key: K, value: Step3Form[K]) => void
  attempted: boolean
}) {
  return (
    <div className="mb-6">
      <p
        className="text-[14px] font-['DM_Sans'] font-medium mb-1.5"
        style={{ color: colors.textSecondary }}
      >
        Your Equipment Access
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
          active={form.equipment === opt.value}
          onTap={() => onUpdate('equipment', opt.value)}
        />
      ))}
      {attempted && !form.equipment && <FieldError text="Select your equipment access" />}
    </div>
  )
}

function ScheduleSection({
  form,
  onUpdate,
}: {
  form: Step3Form
  onUpdate: <K extends keyof Step3Form>(key: K, value: Step3Form[K]) => void
}) {
  return (
    <div className="mb-6">
      <p
        className="text-[14px] font-['DM_Sans'] font-medium mb-3"
        style={{ color: colors.textSecondary }}
      >
        Your Training Schedule
      </p>

      <div className="mb-5">
        <SectionLabel label="DAYS PER WEEK" className="mb-2" />
        <Stepper
          value={form.days_per_week}
          min={2}
          max={6}
          onChange={(v) => onUpdate('days_per_week', v)}
        />
        <FieldHelper text="Be realistic — a 6-day programme followed 3 days is worse than a 4-day programme completed every week." />
      </div>

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
        <FieldHelper text="Average time per session including warmup and cooldown." />
      </div>

      <div className="mb-2">
        <SectionLabel label="PREFERRED WORKOUT TIME (OPTIONAL)" className="mb-2" />
        <div className="flex gap-2">
          {WORKOUT_TIME_OPTIONS.map((opt) => (
            <PillButton
              key={opt.value}
              label={opt.label}
              active={form.preferred_workout_time === opt.value}
              onTap={() =>
                onUpdate(
                  'preferred_workout_time',
                  form.preferred_workout_time === opt.value ? null : opt.value
                )
              }
            />
          ))}
        </div>
        <FieldHelper text="Morning sessions need a longer warmup — body temperature is lower and joints are stiffer. Odin adjusts the warmup protocol accordingly." />
      </div>
    </div>
  )
}

function BaselineStrengthSection({
  form,
  onUpdate,
}: {
  form: Step3Form
  onUpdate: <K extends keyof Step3Form>(key: K, value: Step3Form[K]) => void
}) {
  const [liftEntryExercise, setLiftEntryExercise] = useState(KNOWN_LIFT_EXERCISES[0]!.value)
  const [liftEntryWeight, setLiftEntryWeight] = useState('')
  const [liftEntryReps, setLiftEntryReps] = useState('')

  if (form.equipment === 'bodyweight_only') return null

  const addKnownLift = () => {
    if (!liftEntryWeight.trim() || !liftEntryReps.trim()) return
    onUpdate('known_lifts', [
      ...form.known_lifts,
      { exercise_id: liftEntryExercise, weight_kg: liftEntryWeight, reps: liftEntryReps },
    ])
    setLiftEntryWeight('')
    setLiftEntryReps('')
  }

  const removeKnownLift = (index: number) => {
    onUpdate(
      'known_lifts',
      form.known_lifts.filter((_, i) => i !== index)
    )
  }

  return (
    <div className="mb-6">
      <p
        className="text-[14px] font-['DM_Sans'] font-medium mb-1.5"
        style={{ color: colors.textSecondary }}
      >
        Starting Weights
      </p>
      <p
        className="text-[12px] font-['DM_Sans'] mb-3 leading-relaxed"
        style={{ color: colors.muted }}
      >
        Known weights make your programme immediately actionable. Without them Odin uses effort
        targets (RPE) and you find your own weight by feel. Both are valid.
      </p>

      {BASELINE_PATH_OPTIONS.map((opt) => (
        <SelectableCard
          key={opt.value}
          title={opt.label}
          description={opt.description}
          active={form.baseline_path === opt.value}
          onTap={() => onUpdate('baseline_path', opt.value)}
        />
      ))}

      {form.baseline_path === 'self_reported' && (
        <div className="mt-3">
          <SectionLabel label="ADD A KNOWN LIFT" className="mb-2" />
          <div className="flex gap-2 flex-wrap mb-2">
            {KNOWN_LIFT_EXERCISES.map((opt) => (
              <PillButton
                key={opt.value}
                label={opt.label}
                active={liftEntryExercise === opt.value}
                onTap={() => setLiftEntryExercise(opt.value)}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              min={0}
              value={liftEntryWeight}
              onChange={(e) => setLiftEntryWeight(e.target.value)}
              placeholder="Weight (kg)"
              className="flex-1 h-[48px] px-[14px] text-[#f0ede8] text-[14px] font-['DM_Sans'] placeholder:text-[#444444]"
              style={INPUT_STYLE}
            />
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={12}
              value={liftEntryReps}
              onChange={(e) => setLiftEntryReps(e.target.value)}
              placeholder="Reps"
              className="w-[80px] h-[48px] px-[14px] text-[#f0ede8] text-[14px] font-['DM_Sans'] placeholder:text-[#444444]"
              style={INPUT_STYLE}
            />
            <button
              onClick={addKnownLift}
              disabled={!liftEntryWeight.trim() || !liftEntryReps.trim()}
              className="h-[48px] px-4 text-[13px] font-['DM_Sans'] font-semibold active:scale-[0.95] transition-transform"
              style={{
                borderRadius: radius.input,
                background:
                  liftEntryWeight.trim() && liftEntryReps.trim() ? colors.accent : colors.surface3,
                color: liftEntryWeight.trim() && liftEntryReps.trim() ? '#fff' : colors.muted,
                border: 'none',
                cursor: liftEntryWeight.trim() && liftEntryReps.trim() ? 'pointer' : 'default',
              }}
            >
              Add
            </button>
          </div>
          <FieldHelper text="Any recent set taken close to your limit." />

          {form.known_lifts.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {form.known_lifts.map((lift, i) => {
                const label = KNOWN_LIFT_EXERCISES.find((o) => o.value === lift.exercise_id)?.label
                return (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-['DM_Sans'] font-medium"
                    style={{
                      background: colors.surface2,
                      border: `1px solid ${colors.border}`,
                      borderRadius: radius.chip,
                      color: colors.text,
                    }}
                  >
                    {label} — {lift.weight_kg}kg × {lift.reps}
                    <button
                      onClick={() => removeKnownLift(i)}
                      className="active:opacity-60"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        lineHeight: 1,
                      }}
                      aria-label={`Remove ${label}`}
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
  )
}

// ════════════════════════════════════════════════════
// MAIN WIZARD
// ════════════════════════════════════════════════════

export default function OnboardingWizard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const standalone = searchParams.get('mode') === 'complete'
  const stepParam = searchParams.get('step')
  const initialStep: 1 | 2 | 3 = standalone ? 3 : stepParam === '2' ? 2 : stepParam === '3' ? 3 : 1

  const [step, setStep] = useState<1 | 2 | 3>(initialStep)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [editMode, setEditMode] = useState(false)

  const [step1Form, setStep1Form] = useState<Step1Form>(EMPTY_STEP1)
  const [step2Form, setStep2Form] = useState<Step2Form>(EMPTY_STEP2)
  const [step3Form, setStep3Form] = useState<Step3Form>(EMPTY_STEP3)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempted, setAttempted] = useState(false)

  // ── Load existing profile/health data (resume, edit-jump, and standalone gender lookup) ──
  useEffect(() => {
    if (!user) return
    let cancelled = false

    const load = async () => {
      const [profileRes, healthRes] = await Promise.all([
        supabase
          .from('user_profiles')
          .select(
            'full_name, gender, date_of_birth, nationality, onboarding_completed, onboarding_step'
          )
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('user_health')
          .select(
            'height_cm, current_weight_kg, fitness_level, lifestyle, occupation, goal, equipment, available_days_per_week, session_duration_min, preferred_workout_time, medical_conditions, injuries_v2'
          )
          .eq('user_id', user.id)
          .maybeSingle(),
      ])

      if (cancelled) return

      const p = profileRes.data
      const h = healthRes.data

      if (p) {
        setStep1Form({
          full_name: p.full_name ?? '',
          gender: (p.gender as Gender) ?? '',
          dob: p.date_of_birth ?? '',
          nationality: p.nationality ?? 'India',
        })
      }

      if (h) {
        setStep2Form((prev) => ({
          ...prev,
          height_value: h.height_cm != null ? String(h.height_cm) : '',
          weight_value: h.current_weight_kg != null ? String(h.current_weight_kg) : '',
          fitness_level: (h.fitness_level as FitnessLevel) ?? '',
          lifestyle: h.lifestyle ?? [],
          occupation: h.occupation ?? '',
        }))

        const injuriesV2 = Array.isArray(h.injuries_v2)
          ? (h.injuries_v2 as unknown as { area: string; modification: InjuryChoice }[])
          : []

        setStep3Form((prev) => ({
          ...prev,
          goal: (h.goal as Goal) ?? '',
          equipment: (h.equipment as Equipment) ?? '',
          days_per_week: h.available_days_per_week ?? 4,
          session_duration_min: h.session_duration_min ?? 60,
          preferred_workout_time: (h.preferred_workout_time as WorkoutTime) ?? null,
          medical_conditions: h.medical_conditions ?? [],
          injuries: injuriesV2.map((i) => ({ area: i.area, choice: i.modification ?? null })),
        }))
      }

      const alreadyOnboarded = !!p?.onboarding_completed
      setEditMode(alreadyOnboarded && !standalone)

      if (!standalone && !stepParam && !alreadyOnboarded) {
        const savedStep = p?.onboarding_step ?? 0
        if (savedStep === 1) setStep(2)
        else if (savedStep >= 2) setStep(3)
      }

      setLoadingInitial(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [user, standalone, stepParam])

  const updateStep1 = useCallback(
    <K extends keyof Step1Form>(key: K, value: Step1Form[K]) => {
      setStep1Form((prev) => ({ ...prev, [key]: value }))
      if (error) setError(null)
    },
    [error]
  )

  const updateStep2 = useCallback(
    <K extends keyof Step2Form>(key: K, value: Step2Form[K]) => {
      setStep2Form((prev) => ({ ...prev, [key]: value }))
      if (error) setError(null)
    },
    [error]
  )

  const updateStep3 = useCallback(
    <K extends keyof Step3Form>(key: K, value: Step3Form[K]) => {
      setStep3Form((prev) => ({ ...prev, [key]: value }))
      if (error) setError(null)
    },
    [error]
  )

  // ── Validation ──
  const age = calculateAge(step1Form.dob)
  const validDob = age !== null && age >= MIN_AGE
  const step1Valid =
    step1Form.full_name.trim().length > 0 &&
    step1Form.dob.length > 0 &&
    validDob &&
    step1Form.gender !== ''

  const heightCm = getHeightCm(step2Form)
  const weightKg = getWeightKg(step2Form.weight_value, step2Form.weight_unit)
  const step2Valid =
    heightCm > 0 && weightKg > 0 && step2Form.fitness_level !== '' && step2Form.lifestyle.length > 0

  const isPregnant = step3Form.medical_conditions.includes(PREGNANCY_LABEL)
  const injuriesComplete = step3Form.injuries.every((i) => i.choice !== null)
  const baselineRequired = step3Form.equipment !== 'bodyweight_only'
  const step3Valid =
    isPregnant ||
    (step3Form.goal !== '' &&
      step3Form.equipment !== '' &&
      step3Form.days_per_week >= 2 &&
      step3Form.session_duration_min > 0 &&
      (!baselineRequired || step3Form.baseline_path !== '') &&
      injuriesComplete)

  // ── Submit handlers ──
  const handleStep1Continue = useCallback(async () => {
    setAttempted(true)
    if (!step1Valid || !user) return

    setSaving(true)
    setError(null)

    const { error: dbError } = await supabase.from('user_profiles').upsert(
      {
        user_id: user.id,
        full_name: step1Form.full_name.trim(),
        gender: step1Form.gender as 'male' | 'female' | 'other',
        date_of_birth: step1Form.dob,
        nationality: step1Form.nationality || null,
        onboarding_step: 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

    setSaving(false)
    if (dbError) {
      setError('Failed to save your details. Please try again.')
      return
    }

    setAttempted(false)
    if (editMode) {
      void navigate('/program', { replace: true })
    } else {
      setStep(2)
    }
  }, [step1Valid, user, step1Form, editMode, navigate])

  const handleStep2Continue = useCallback(async () => {
    setAttempted(true)
    if (!step2Valid || !user) return

    setSaving(true)
    setError(null)

    const { error: healthError } = await supabase.from('user_health').upsert(
      {
        user_id: user.id,
        height_cm: heightCm,
        current_weight_kg: weightKg,
        fitness_level: step2Form.fitness_level,
        lifestyle: step2Form.lifestyle,
        occupation: step2Form.occupation || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

    if (healthError) {
      setSaving(false)
      setError('Failed to save your health details. Please try again.')
      return
    }

    // ProfileCard reads height/weight from user_profiles — keep that copy in sync
    // so new users see their stats immediately, not just returning-user edits.
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        height_cm: heightCm,
        current_weight_kg: weightKg,
        onboarding_step: 2,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    setSaving(false)
    if (profileError) {
      setError('Failed to save your health details. Please try again.')
      return
    }

    setAttempted(false)
    if (editMode) {
      void navigate('/program', { replace: true })
    } else {
      setStep(3)
    }
  }, [step2Valid, user, step2Form, heightCm, weightKg, editMode, navigate])

  const handleStep3Submit = useCallback(async () => {
    setAttempted(true)
    if (!step3Valid || !user) return

    setSaving(true)
    setError(null)

    const medicalConditions = [...step3Form.medical_conditions]
    if (step3Form.medical_conditions_other.trim()) {
      medicalConditions.push(step3Form.medical_conditions_other.trim())
    }

    const injuriesV2 = step3Form.injuries.map((i) => ({
      area: i.area,
      modification: i.choice,
      notes: '',
    }))

    const { error: healthError } = await supabase.from('user_health').upsert(
      {
        user_id: user.id,
        goal: step3Form.goal || null,
        equipment: step3Form.equipment || null,
        available_days_per_week: step3Form.days_per_week,
        session_duration_min: step3Form.session_duration_min,
        preferred_workout_time: step3Form.preferred_workout_time,
        medical_conditions: medicalConditions,
        injuries: step3Form.injuries.map((i) => i.area),
        injuries_v2: injuriesV2,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

    if (healthError) {
      setSaving(false)
      setError('Failed to save your training preferences. Please try again.')
      return
    }

    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        onboarding_completed: true,
        onboarding_step: 3,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    setSaving(false)
    if (profileError) {
      setError('Failed to complete onboarding. Please try again.')
      return
    }

    if (isPregnant) {
      void navigate('/', { replace: true })
      return
    }

    // Handed to GenerateProgrammeView so it can auto-trigger generation with the
    // data collected here instead of re-asking for it (goal sub-fields, baseline
    // strength) — see the pending-payload effect added there.
    sessionStorage.setItem(
      SESSION_DURATION_STORAGE_KEY,
      JSON.stringify({
        goalRefine: {
          current_body_fat_pct: step3Form.current_body_fat_pct,
          target_body_fat_pct: step3Form.target_body_fat_pct,
          target_muscle_gain_kg: step3Form.target_muscle_gain_kg,
          timeframe_weeks: step3Form.timeframe_weeks,
          primary_lift: step3Form.primary_lift,
          current_1rm_kg: step3Form.current_1rm_kg,
          target_1rm_kg: step3Form.target_1rm_kg,
          endurance_focus: step3Form.endurance_focus,
        },
        baselinePath: step3Form.baseline_path || 'skipped',
        knownLifts: step3Form.known_lifts,
      })
    )

    void navigate('/program', { replace: true })
  }, [step3Valid, user, step3Form, isPregnant, navigate])

  const canSubmitCurrent = step === 1 ? step1Valid : step === 2 ? step2Valid : step3Valid

  const handleContinue = useCallback(() => {
    if (step === 1) void handleStep1Continue()
    else if (step === 2) void handleStep2Continue()
    else void handleStep3Submit()
  }, [step, handleStep1Continue, handleStep2Continue, handleStep3Submit])

  const ctaLabel = saving
    ? 'SAVING...'
    : step === 3
      ? isPregnant
        ? 'Save My Profile'
        : 'GENERATE MY PROGRAMME →'
      : 'Save & Continue →'

  if (!user || loadingInitial) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ background: colors.bg, height: '100dvh' }}
      >
        <Loader2 size={28} color={colors.accent} className="animate-spin" />
      </div>
    )
  }

  const progressWidth = step === 1 ? '33%' : step === 2 ? '66%' : '100%'

  return (
    <div className="flex flex-col" style={{ background: colors.bg, height: '100dvh' }}>
      {/* Top bar */}
      <div className="px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-3">
        <div className="flex items-center justify-between mb-3">
          <span className="font-['Bebas_Neue'] text-[18px] tracking-[2px] text-[#f0ede8]">
            G<span className="text-[#ff4520]">x</span>
          </span>
          {!standalone && (
            <span className="text-[12px] font-['DM_Sans']" style={{ color: colors.muted }}>
              Step {step} of 3
            </span>
          )}
        </div>

        {!standalone && step > 1 && (
          <button
            onClick={() => {
              setStep((step - 1) as 1 | 2)
              setAttempted(false)
              setError(null)
            }}
            className="flex items-center gap-1 mb-3 active:opacity-60"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <ChevronLeft size={18} color={colors.muted} />
            <span className="text-[13px] font-['DM_Sans']" style={{ color: colors.muted }}>
              Back
            </span>
          </button>
        )}

        {!standalone && (
          <div className="h-[2px] rounded-full overflow-hidden bg-zinc-800">
            <div
              className="h-full bg-white transition-all duration-500"
              style={{ width: progressWidth }}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-32 pt-2">
        {step === 1 && (
          <Step1Personal form={step1Form} onUpdate={updateStep1} attempted={attempted} />
        )}
        {step === 2 && (
          <Step2Health form={step2Form} onUpdate={updateStep2} attempted={attempted} />
        )}
        {step === 3 && (
          <Step3Programme
            form={step3Form}
            onUpdate={updateStep3}
            attempted={attempted}
            gender={step1Form.gender}
            standalone={standalone}
          />
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
          onClick={handleContinue}
          disabled={!canSubmitCurrent || saving}
          className="w-full py-4 font-['Bebas_Neue'] text-[18px] tracking-[2px] transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-2"
          style={{
            borderRadius: radius.button,
            background: canSubmitCurrent && !saving ? colors.accent : colors.surface3,
            color: canSubmitCurrent && !saving ? '#fff' : colors.muted,
            border: 'none',
            cursor: canSubmitCurrent && !saving ? 'pointer' : 'default',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving && <Loader2 size={18} className="animate-spin" />}
          {ctaLabel}
        </button>
      </div>
    </div>
  )
}
