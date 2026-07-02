import { useCallback, useState } from 'react'
import { CheckCircle2, Loader2, Upload } from 'lucide-react'
import { colors, radius } from '../../../styles/tokens'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../auth/AuthContext'
import { getISTTodayStr } from '../../../utils/dateUtils'
import type { InBodyData, WizardState } from '../useWizardState'
import { FieldError, FieldHelper, SectionLabel, UnitToggle } from './shared'
import { INPUT_STYLE } from './sharedUtils'
import { WizardCta } from './WizardCta'

const INBODY_PARSE_URL = 'https://agent-odin.vercel.app/api/v1/inbody/parse'
const MAX_FILE_BYTES = 10 * 1024 * 1024

type Path = 'inbody' | 'manual'
type UploadState = 'idle' | 'uploading' | 'parsing' | 'success' | 'error'
type HeightUnit = 'cm' | 'ft'
type WeightUnit = 'kg' | 'lbs'

const ftInToCm = (ft: number, inches: number) => Math.round((ft * 30.48 + inches * 2.54) * 10) / 10
const lbsToKg = (lbs: number) => Math.round((lbs / 2.205) * 10) / 10

interface ParsedFields {
  body_fat_pct: number | null
  smm_kg: number | null
  body_fat_mass_kg: number | null
  bmr: number | null
  visceral_fat_area: number | null
  total_body_water_l: number | null
}

const FIELD_LABELS: { key: keyof InBodyData; label: string; unit: string }[] = [
  { key: 'body_fat_pct', label: 'Body Fat %', unit: '%' },
  { key: 'skeletal_muscle_mass', label: 'Skeletal Muscle Mass', unit: 'kg' },
  { key: 'body_fat_mass', label: 'Body Fat Mass', unit: 'kg' },
  { key: 'bmr', label: 'BMR', unit: 'kcal' },
  { key: 'visceral_fat_level', label: 'Visceral Fat Level', unit: '' },
  { key: 'weight_kg', label: 'Weight', unit: 'kg' },
]

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

interface Props {
  wizardState: WizardState
  setField: (key: string, value: unknown) => void
  setInbodyData: (data: InBodyData) => void
  overrideInbodyField: (field: keyof InBodyData, value: number | null) => void
  userId: string
  onSaved: (step: number) => void
}

export function Screen3BodyBaseline({
  wizardState,
  setField,
  setInbodyData,
  overrideInbodyField,
  userId,
  onSaved,
}: Props) {
  const { user } = useAuth()
  const [path, setPath] = useState<Path>(wizardState.inbody_uploaded ? 'inbody' : 'manual')
  const [uploadState, setUploadState] = useState<UploadState>(
    wizardState.inbody_uploaded ? 'success' : 'idle'
  )
  const [editingField, setEditingField] = useState<keyof InBodyData | null>(null)
  const [heightUnit, setHeightUnit] = useState<HeightUnit>('cm')
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg')
  const [heightFt, setHeightFt] = useState('')
  const [heightIn, setHeightIn] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (file.size > MAX_FILE_BYTES) {
        setUploadState('error')
        return
      }
      setUploadState('uploading')
      try {
        const base64 = await fileToBase64(file)
        setUploadState('parsing')

        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) {
          setUploadState('error')
          return
        }

        const res = await fetch(INBODY_PARSE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ file: base64, media_type: file.type }),
        })
        const json = await res.json()
        if (!res.ok || json.success === false) {
          setUploadState('error')
          return
        }

        const parsed = json.data as ParsedFields
        setInbodyData({
          body_fat_pct: parsed.body_fat_pct,
          skeletal_muscle_mass: parsed.smm_kg,
          body_fat_mass: parsed.body_fat_mass_kg,
          bmr: parsed.bmr,
          visceral_fat_level: null,
          total_body_water: parsed.total_body_water_l,
          weight_kg: null,
        })
        setUploadState('success')
      } catch {
        setUploadState('error')
      }
    },
    [setInbodyData]
  )

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    void handleFileSelect(file)
  }

  const handleContinue = async () => {
    if (!wizardState.height_cm || !wizardState.current_weight_kg) return
    setSaving(true)
    setError(null)

    const { error: healthError } = await supabase.from('user_health').upsert(
      {
        user_id: userId,
        height_cm: wizardState.height_cm,
        current_weight_kg: wizardState.current_weight_kg,
        body_fat_pct: wizardState.body_fat_pct,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    if (healthError) {
      setSaving(false)
      setError('Failed to save your body data. Please try again.')
      return
    }

    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        height_cm: wizardState.height_cm,
        onboarding_step: 3,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
    if (profileError) {
      setSaving(false)
      setError('Failed to save your body data. Please try again.')
      return
    }

    if (wizardState.inbody_uploaded && wizardState.inbody_data && user) {
      const { error: inbodyError } = await supabase.from('inbody_logs').insert({
        user_id: user.id,
        body_fat_pct: wizardState.inbody_data.body_fat_pct,
        skeletal_muscle_mass: wizardState.inbody_data.skeletal_muscle_mass,
        body_fat_mass: wizardState.inbody_data.body_fat_mass,
        bmr: wizardState.inbody_data.bmr,
        visceral_fat_level: wizardState.inbody_data.visceral_fat_level,
        total_body_water: wizardState.inbody_data.total_body_water,
        weight_kg: wizardState.inbody_data.weight_kg ?? wizardState.current_weight_kg,
        date: getISTTodayStr(),
      })
      if (inbodyError) console.error('Failed to save inbody_logs row:', inbodyError)
    }

    setSaving(false)
    onSaved(3)
  }

  const valid = !!wizardState.height_cm && !!wizardState.current_weight_kg

  return (
    <>
      <h1 className="font-['Bebas_Neue'] text-[32px] tracking-[2px] text-[#f0ede8] leading-none">
        YOUR BODY BASELINE
      </h1>
      <p
        className="text-[14px] font-['DM_Sans'] mt-2 mb-6 leading-relaxed"
        style={{ color: colors.muted }}
      >
        The most accurate data comes from an InBody scan. Upload yours and we fill in the rest
        automatically.
      </p>

      <div className="flex gap-3 mb-5">
        <button
          onClick={() => setPath('inbody')}
          className="flex-1 text-left px-4 py-3.5 transition-all duration-150 active:scale-[0.98]"
          style={{
            borderRadius: radius.button,
            border: `1.5px solid ${path === 'inbody' ? colors.accent : colors.border}`,
            background: path === 'inbody' ? colors.accentMuted : colors.surface2,
            cursor: 'pointer',
          }}
        >
          <Upload size={18} color={path === 'inbody' ? colors.accent : colors.muted} />
          <p
            className="text-[13px] font-['DM_Sans'] font-semibold mt-2"
            style={{ color: colors.text }}
          >
            I have an InBody report
          </p>
          <p className="text-[11px] font-['DM_Sans']" style={{ color: colors.muted }}>
            PDF, JPG, or PNG
          </p>
        </button>
        <button
          onClick={() => setPath('manual')}
          className="flex-1 text-left px-4 py-3.5 transition-all duration-150 active:scale-[0.98]"
          style={{
            borderRadius: radius.button,
            border: `1.5px solid ${path === 'manual' ? colors.accent : colors.border}`,
            background: path === 'manual' ? colors.accentMuted : colors.surface2,
            cursor: 'pointer',
          }}
        >
          <p className="text-[13px] font-['DM_Sans'] font-semibold" style={{ color: colors.text }}>
            ✎ Enter manually
          </p>
        </button>
      </div>

      {path === 'inbody' && (
        <div className="mb-5">
          {uploadState === 'idle' && (
            <label
              className="flex flex-col items-center justify-center gap-2 py-8 cursor-pointer"
              style={{
                background: colors.surface2,
                border: `2px dashed ${colors.border}`,
                borderRadius: radius.button,
              }}
            >
              <input
                type="file"
                accept=".pdf,image/jpeg,image/png"
                className="hidden"
                onChange={handleFileInputChange}
              />
              <Upload size={22} color={colors.muted} />
              <span className="text-[13px] font-['DM_Sans']" style={{ color: colors.text }}>
                Tap to upload your InBody report
              </span>
              <span className="text-[11px] font-['DM_Sans']" style={{ color: colors.muted }}>
                PDF, JPG, or PNG
              </span>
            </label>
          )}

          {(uploadState === 'uploading' || uploadState === 'parsing') && (
            <div
              className="flex items-center justify-center gap-2 py-8"
              style={{
                background: colors.surface2,
                border: `1.5px solid ${colors.border}`,
                borderRadius: radius.button,
              }}
            >
              <Loader2 size={18} color={colors.accent} className="animate-spin" />
              <span
                className="text-[13px] font-['DM_Sans']"
                style={{ color: colors.textSecondary }}
              >
                {uploadState === 'uploading' ? 'Uploading...' : 'Reading your InBody report...'}
              </span>
            </div>
          )}

          {uploadState === 'error' && (
            <div
              className="p-4"
              style={{
                background: colors.surface2,
                border: `1px solid ${colors.error}`,
                borderRadius: radius.button,
              }}
            >
              <p className="text-[13px] font-['DM_Sans']" style={{ color: colors.error }}>
                Couldn't read this report.
              </p>
              <div className="flex gap-4 mt-2">
                <button
                  onClick={() => setUploadState('idle')}
                  className="text-[12px] font-['DM_Sans'] font-semibold"
                  style={{
                    color: colors.accent,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Try a different file
                </button>
                <button
                  onClick={() => setPath('manual')}
                  className="text-[12px] font-['DM_Sans'] font-semibold"
                  style={{
                    color: colors.accent,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Enter manually instead →
                </button>
              </div>
            </div>
          )}

          {uploadState === 'success' && wizardState.inbody_data && (
            <div
              className="p-4"
              style={{
                background: colors.surface2,
                border: `1px solid #14532d`,
                borderRadius: radius.button,
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={16} color={colors.success} />
                <p
                  className="text-[12px] font-['DM_Sans'] font-bold tracking-[1.5px]"
                  style={{ color: colors.success }}
                >
                  EXTRACTED FROM YOUR REPORT
                </p>
              </div>
              {FIELD_LABELS.map(({ key, label, unit }) => {
                const value = wizardState.inbody_data?.[key] ?? null
                const isEditing = editingField === key
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between py-2"
                    style={{ borderTop: `1px solid ${colors.border}` }}
                  >
                    <span
                      className="text-[13px] font-['DM_Sans']"
                      style={{ color: colors.textSecondary }}
                    >
                      {label}
                    </span>
                    {isEditing ? (
                      <input
                        type="number"
                        autoFocus
                        defaultValue={value ?? ''}
                        onBlur={(e) => {
                          const v = e.target.value.trim() === '' ? null : parseFloat(e.target.value)
                          overrideInbodyField(key, v)
                          setEditingField(null)
                        }}
                        className="w-24 h-[36px] px-2 text-right text-[13px] font-['DM_Sans'] text-[#f0ede8]"
                        style={INPUT_STYLE}
                      />
                    ) : value != null ? (
                      <button
                        onClick={() => setEditingField(key)}
                        className="flex items-center gap-1.5"
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        <span
                          className="text-[13px] font-['DM_Sans']"
                          style={{ color: colors.text }}
                        >
                          {value}
                          {unit}
                        </span>
                        <CheckCircle2 size={12} color={colors.success} />
                      </button>
                    ) : (
                      <input
                        type="number"
                        placeholder="Not found — enter"
                        onBlur={(e) => {
                          const v = e.target.value.trim() === '' ? null : parseFloat(e.target.value)
                          overrideInbodyField(key, v)
                        }}
                        className="w-32 h-[32px] px-2 text-right text-[12px] font-['DM_Sans'] text-[#f0ede8] placeholder:text-[#444444]"
                        style={INPUT_STYLE}
                      />
                    )}
                  </div>
                )
              })}
              <p className="text-[11px] font-['DM_Sans'] mt-3" style={{ color: colors.muted }}>
                Weight and body fat % from your report will be used for your programme.
              </p>
            </div>
          )}

          <button
            onClick={() => setPath('manual')}
            className="text-[12px] font-['DM_Sans'] font-semibold mt-2"
            style={{
              color: colors.accent,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Switch to manual entry →
          </button>
        </div>
      )}

      {path === 'manual' && (
        <div className="mb-5">
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <SectionLabel label="HEIGHT" />
              <UnitToggle
                value={heightUnit}
                options={[
                  { value: 'cm' as const, label: 'cm' },
                  { value: 'ft' as const, label: 'ft' },
                ]}
                onChange={setHeightUnit}
              />
            </div>
            {heightUnit === 'cm' ? (
              <input
                type="number"
                inputMode="decimal"
                value={wizardState.height_cm ?? ''}
                onChange={(e) =>
                  setField('height_cm', e.target.value === '' ? null : parseFloat(e.target.value))
                }
                placeholder="170"
                className="w-full h-[52px] px-[14px] text-[16px] font-['DM_Sans'] text-[#f0ede8] placeholder:text-[#444444]"
                style={INPUT_STYLE}
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  value={heightFt}
                  onChange={(e) => {
                    setHeightFt(e.target.value)
                    setField(
                      'height_cm',
                      ftInToCm(parseInt(e.target.value) || 0, parseInt(heightIn) || 0)
                    )
                  }}
                  placeholder="5 ft"
                  className="w-full h-[52px] px-[14px] text-[16px] font-['DM_Sans'] text-[#f0ede8] placeholder:text-[#444444]"
                  style={INPUT_STYLE}
                />
                <input
                  type="number"
                  value={heightIn}
                  onChange={(e) => {
                    setHeightIn(e.target.value)
                    setField(
                      'height_cm',
                      ftInToCm(parseInt(heightFt) || 0, parseInt(e.target.value) || 0)
                    )
                  }}
                  placeholder="7 in"
                  className="w-full h-[52px] px-[14px] text-[16px] font-['DM_Sans'] text-[#f0ede8] placeholder:text-[#444444]"
                  style={INPUT_STYLE}
                />
              </div>
            )}
          </div>

          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <SectionLabel label="WEIGHT" />
              <UnitToggle
                value={weightUnit}
                options={[
                  { value: 'kg' as const, label: 'kg' },
                  { value: 'lbs' as const, label: 'lbs' },
                ]}
                onChange={setWeightUnit}
              />
            </div>
            <input
              type="number"
              inputMode="decimal"
              value={wizardState.current_weight_kg ?? ''}
              onChange={(e) => {
                const v = e.target.value === '' ? null : parseFloat(e.target.value)
                setField(
                  'current_weight_kg',
                  v == null ? null : weightUnit === 'kg' ? v : lbsToKg(v)
                )
              }}
              placeholder={weightUnit === 'kg' ? '75' : '165'}
              className="w-full h-[52px] px-[14px] text-[16px] font-['DM_Sans'] text-[#f0ede8] placeholder:text-[#444444]"
              style={INPUT_STYLE}
            />
          </div>

          <div className="mb-2">
            <SectionLabel label="BODY FAT % (OPTIONAL)" className="mb-2" />
            <input
              type="number"
              inputMode="decimal"
              min={3}
              max={60}
              value={wizardState.body_fat_pct ?? ''}
              onChange={(e) => {
                const v = e.target.value === '' ? null : parseFloat(e.target.value)
                setField('body_fat_pct', v)
                setField('inbody_field_sources.body_fat_pct', 'manual')
              }}
              placeholder="—"
              className="w-full h-[48px] px-[14px] text-[15px] font-['DM_Sans'] text-[#f0ede8] placeholder:text-[#444444]"
              style={INPUT_STYLE}
            />
            <FieldHelper text="From a previous InBody or DEXA scan. Leave blank if unknown." />
          </div>

          <button
            onClick={() => setPath('inbody')}
            className="text-[12px] font-['DM_Sans'] font-semibold mt-2"
            style={{
              color: colors.accent,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Switch to InBody upload →
          </button>
        </div>
      )}

      <div
        className="flex items-center gap-4 p-3 mb-4"
        style={{ background: colors.surface2, borderRadius: radius.button }}
      >
        <span className="text-[12px] font-['DM_Sans']" style={{ color: colors.textSecondary }}>
          Height: {wizardState.height_cm ?? '—'}cm
        </span>
        <span className="text-[12px] font-['DM_Sans']" style={{ color: colors.textSecondary }}>
          Weight: {wizardState.current_weight_kg ?? '—'}kg
        </span>
        <span className="text-[12px] font-['DM_Sans']" style={{ color: colors.textSecondary }}>
          Body Fat: {wizardState.body_fat_pct != null ? `${wizardState.body_fat_pct}%` : 'Unknown'}
        </span>
      </div>

      {error && <FieldError text={error} />}

      <WizardCta
        label="THESE LOOK RIGHT →"
        disabled={!valid}
        saving={saving}
        onTap={() => void handleContinue()}
      />
    </>
  )
}
