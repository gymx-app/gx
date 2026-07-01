import { useCallback, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'
import { colors, radius } from '../../styles/tokens'
import { SectionLabel } from '../../components/ui'
import { AlertCircle, Loader2, Upload } from 'lucide-react'

// Odin's InBody parser (agent-odin src/llm/inbody/inbody-parser.ts) extracts
// visceral_fat_area (cm², a direct report measurement) — not visceral_fat_level
// (InBody's separate 1-20 index). There's no verified conversion between the
// two, so this component tracks them as distinct fields: visceral_fat_area
// comes from parsed/uploaded reports, visceral_fat_level from manual entry.
export interface InBodyData {
  body_fat_pct: number | null
  skeletal_muscle_mass: number | null
  body_fat_mass: number | null
  bmr: number | null
  visceral_fat_level: number | null
  visceral_fat_area: number | null
  total_body_water: number | null
  date: string
}

const INBODY_PARSE_URL = 'https://agent-odin.vercel.app/api/v1/inbody/parse'
const MAX_FILE_BYTES = 10 * 1024 * 1024

type UploadState = 'idle' | 'uploading' | 'parsing' | 'success' | 'error' | 'manual'

interface ParsedFields {
  body_fat_pct: number | null
  smm_kg: number | null
  body_fat_mass_kg: number | null
  bmr: number | null
  visceral_fat_area: number | null
  total_body_water_l: number | null
}

interface SuccessForm {
  body_fat_pct: string
  skeletal_muscle_mass: string
  body_fat_mass: string
  bmr: string
  visceral_fat_area: string
  total_body_water: string
}

interface ManualForm {
  body_fat_pct: string
  skeletal_muscle_mass: string
  bmr: string
  visceral_fat_level: string
}

const EMPTY_MANUAL: ManualForm = {
  body_fat_pct: '',
  skeletal_muscle_mass: '',
  bmr: '',
  visceral_fat_level: '',
}

function parseOptionalNumber(value: string): number | null {
  if (value.trim() === '') return null
  const n = parseFloat(value)
  return isNaN(n) ? null : n
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] ?? '')
    }
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function InlineNumberField({
  label,
  unit,
  value,
  onChange,
  min,
  max,
}: {
  label: string
  unit?: string
  value: string
  onChange: (v: string) => void
  min?: number
  max?: number
}) {
  return (
    <div className="mb-3">
      <SectionLabel label={label} className="mb-2" />
      <div className="relative">
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
          style={{
            background: colors.surface2,
            border: `1.5px solid ${colors.border}`,
            borderRadius: radius.input,
          }}
        />
        {unit && (
          <span
            className="absolute right-[14px] top-1/2 -translate-y-1/2 text-[13px] font-['DM_Sans']"
            style={{ color: colors.muted }}
          >
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}

interface InBodyUploadProps {
  onResult: (data: InBodyData | null) => void
  existingData: InBodyData | null
}

export function InBodyUpload({ onResult, existingData }: InBodyUploadProps) {
  const { user } = useAuth()
  const [showExisting, setShowExisting] = useState(!!existingData)
  const [state, setState] = useState<UploadState>('idle')
  const [successForm, setSuccessForm] = useState<SuccessForm | null>(null)
  const [manual, setManual] = useState<ManualForm>(EMPTY_MANUAL)
  const [confirmedSummary, setConfirmedSummary] = useState<string | null>(null)

  const updateManual = useCallback(<K extends keyof ManualForm>(key: K, value: ManualForm[K]) => {
    setManual((prev) => ({ ...prev, [key]: value }))
  }, [])

  const updateSuccessForm = useCallback(
    <K extends keyof SuccessForm>(key: K, value: SuccessForm[K]) => {
      setSuccessForm((prev) => (prev ? { ...prev, [key]: value } : prev))
    },
    []
  )

  const saveAndReturn = useCallback(
    async (data: Omit<InBodyData, 'date'>, summary: string) => {
      if (!user) return

      const today = new Date().toISOString().slice(0, 10)
      const fullData: InBodyData = { ...data, date: today }

      const { error: dbError } = await supabase.from('inbody_logs').insert({
        user_id: user.id,
        body_fat_pct: fullData.body_fat_pct,
        skeletal_muscle_mass: fullData.skeletal_muscle_mass,
        body_fat_mass: fullData.body_fat_mass,
        bmr: fullData.bmr,
        visceral_fat_level: fullData.visceral_fat_level,
        visceral_fat_area: fullData.visceral_fat_area,
        total_body_water: fullData.total_body_water,
        date: today,
        weight_kg: null,
      })

      if (dbError) console.error('Failed to save inbody_logs row:', dbError)

      setConfirmedSummary(summary)
      onResult(fullData)
    },
    [user, onResult]
  )

  const handleFileSelect = useCallback(async (file: File) => {
    if (file.size > MAX_FILE_BYTES) {
      setState('error')
      return
    }

    setState('uploading')
    try {
      const base64 = await fileToBase64(file)
      setState('parsing')

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        setState('error')
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
        setState('error')
        return
      }

      const parsed = json.data as ParsedFields
      setSuccessForm({
        body_fat_pct: parsed.body_fat_pct?.toString() ?? '',
        skeletal_muscle_mass: parsed.smm_kg?.toString() ?? '',
        body_fat_mass: parsed.body_fat_mass_kg?.toString() ?? '',
        bmr: parsed.bmr?.toString() ?? '',
        visceral_fat_area: parsed.visceral_fat_area?.toString() ?? '',
        total_body_water: parsed.total_body_water_l?.toString() ?? '',
      })
      setState('success')
    } catch {
      setState('error')
    }
  }, [])

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return
      void handleFileSelect(file)
    },
    [handleFileSelect]
  )

  const useParsedValues = useCallback(() => {
    if (!successForm) return
    void saveAndReturn(
      {
        body_fat_pct: parseOptionalNumber(successForm.body_fat_pct),
        skeletal_muscle_mass: parseOptionalNumber(successForm.skeletal_muscle_mass),
        body_fat_mass: parseOptionalNumber(successForm.body_fat_mass),
        bmr: parseOptionalNumber(successForm.bmr),
        visceral_fat_level: null,
        visceral_fat_area: parseOptionalNumber(successForm.visceral_fat_area),
        total_body_water: parseOptionalNumber(successForm.total_body_water),
      },
      'Using values from your uploaded InBody report'
    )
  }, [successForm, saveAndReturn])

  const useManualValues = useCallback(() => {
    void saveAndReturn(
      {
        body_fat_pct: parseOptionalNumber(manual.body_fat_pct),
        skeletal_muscle_mass: parseOptionalNumber(manual.skeletal_muscle_mass),
        body_fat_mass: null,
        bmr: parseOptionalNumber(manual.bmr),
        visceral_fat_level: parseOptionalNumber(manual.visceral_fat_level),
        visceral_fat_area: null,
        total_body_water: null,
      },
      'Using manually entered InBody values'
    )
  }, [manual, saveAndReturn])

  const handleUseExisting = useCallback(() => {
    if (!existingData) return
    setShowExisting(false)
    setConfirmedSummary(`Using saved InBody data from ${formatDate(existingData.date)}`)
    onResult(existingData)
  }, [existingData, onResult])

  const handleUploadNew = useCallback(() => {
    setShowExisting(false)
    setState('idle')
  }, [])

  const handleSkip = useCallback(() => {
    setConfirmedSummary('Skipped — no InBody data')
    onResult(null)
  }, [onResult])

  const handleChange = useCallback(() => {
    setConfirmedSummary(null)
    setState('idle')
    setSuccessForm(null)
    setManual(EMPTY_MANUAL)
    setShowExisting(false)
  }, [])

  // ── Confirmed (after any final action) ──
  if (confirmedSummary) {
    return (
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <SectionLabel label="INBODY DATA" />
          <button
            onClick={handleChange}
            className="text-[12px] font-['DM_Sans'] font-semibold active:opacity-60"
            style={{
              color: colors.accent,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Change
          </button>
        </div>
        <div
          className="h-[48px] flex items-center px-[14px] text-[14px] font-['DM_Sans']"
          style={{
            background: colors.surface2,
            border: `1.5px solid ${colors.border}`,
            borderRadius: radius.input,
            color: colors.text,
          }}
        >
          {confirmedSummary}
        </div>
      </div>
    )
  }

  // ── Existing InBody data found ──
  if (showExisting && existingData) {
    return (
      <div
        className="mb-5 p-4"
        style={{
          background: colors.surface2,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.button,
        }}
      >
        <p className="text-[14px] font-['DM_Sans'] mb-3" style={{ color: colors.text }}>
          We found your InBody data from {formatDate(existingData.date)}
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleUseExisting}
            className="flex-1 py-3 font-['DM_Sans'] font-semibold text-[13px] active:scale-[0.98] transition-transform"
            style={{
              borderRadius: radius.button,
              background: colors.accent,
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Use This
          </button>
          <button
            onClick={handleUploadNew}
            className="flex-1 py-3 font-['DM_Sans'] font-semibold text-[13px] active:scale-[0.98] transition-transform"
            style={{
              borderRadius: radius.button,
              background: colors.surface3,
              color: colors.text,
              border: `1.5px solid ${colors.border}`,
              cursor: 'pointer',
            }}
          >
            Upload New
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-5">
      <SectionLabel label="INBODY REPORT (OPTIONAL)" className="mb-2" />

      {state === 'idle' && (
        <>
          <label
            className="flex flex-col items-center justify-center gap-2 py-8 cursor-pointer"
            style={{
              background: colors.surface2,
              border: `1.5px dashed ${colors.border}`,
              borderRadius: radius.button,
            }}
          >
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              className="hidden"
              onChange={handleFileInputChange}
            />
            <Upload size={22} color={colors.accent} />
            <span
              className="text-[13px] font-['DM_Sans'] font-semibold"
              style={{ color: colors.text }}
            >
              Upload InBody Report
            </span>
            <span className="text-[11px] font-['DM_Sans']" style={{ color: colors.muted }}>
              PDF, JPG, or PNG
            </span>
          </label>
          <div className="flex items-center justify-center gap-4 mt-3">
            <button
              onClick={() => setState('manual')}
              className="text-[12px] font-['DM_Sans'] font-semibold active:opacity-60"
              style={{
                color: colors.accent,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Enter Manually
            </button>
            <button
              onClick={handleSkip}
              className="text-[12px] font-['DM_Sans'] font-semibold active:opacity-60"
              style={{
                color: colors.muted,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Skip
            </button>
          </div>
        </>
      )}

      {state === 'uploading' && (
        <div
          className="flex items-center justify-center gap-2 py-8"
          style={{
            background: colors.surface2,
            border: `1.5px solid ${colors.border}`,
            borderRadius: radius.button,
          }}
        >
          <Loader2 size={18} color={colors.accent} className="animate-spin" />
          <span className="text-[13px] font-['DM_Sans']" style={{ color: colors.textSecondary }}>
            Uploading your report…
          </span>
        </div>
      )}

      {state === 'parsing' && (
        <div
          className="flex items-center justify-center gap-2 py-8"
          style={{
            background: colors.surface2,
            border: `1.5px solid ${colors.border}`,
            borderRadius: radius.button,
          }}
        >
          <Loader2 size={18} color={colors.accent} className="animate-spin" />
          <span className="text-[13px] font-['DM_Sans']" style={{ color: colors.textSecondary }}>
            Reading your InBody report…
          </span>
        </div>
      )}

      {state === 'success' && successForm && (
        <div
          className="p-4"
          style={{
            background: colors.surface2,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.button,
          }}
        >
          <InlineNumberField
            label="BODY FAT %"
            unit="%"
            value={successForm.body_fat_pct}
            onChange={(v) => updateSuccessForm('body_fat_pct', v)}
          />
          <InlineNumberField
            label="SKELETAL MUSCLE MASS"
            unit="kg"
            value={successForm.skeletal_muscle_mass}
            onChange={(v) => updateSuccessForm('skeletal_muscle_mass', v)}
          />
          <InlineNumberField
            label="BODY FAT MASS"
            unit="kg"
            value={successForm.body_fat_mass}
            onChange={(v) => updateSuccessForm('body_fat_mass', v)}
          />
          <InlineNumberField
            label="BMR"
            unit="kcal/day"
            value={successForm.bmr}
            onChange={(v) => updateSuccessForm('bmr', v)}
          />
          <InlineNumberField
            label="VISCERAL FAT AREA"
            unit="cm²"
            value={successForm.visceral_fat_area}
            onChange={(v) => updateSuccessForm('visceral_fat_area', v)}
          />
          <InlineNumberField
            label="TOTAL BODY WATER"
            unit="L"
            value={successForm.total_body_water}
            onChange={(v) => updateSuccessForm('total_body_water', v)}
          />

          <div className="flex gap-2 mt-1">
            <button
              onClick={useParsedValues}
              className="flex-1 py-3 font-['DM_Sans'] font-semibold text-[13px] active:scale-[0.98] transition-transform"
              style={{
                borderRadius: radius.button,
                background: colors.accent,
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Use These Values
            </button>
            <button
              onClick={() => setState('manual')}
              className="flex-1 py-3 font-['DM_Sans'] font-semibold text-[13px] active:scale-[0.98] transition-transform"
              style={{
                borderRadius: radius.button,
                background: colors.surface3,
                color: colors.text,
                border: `1.5px solid ${colors.border}`,
                cursor: 'pointer',
              }}
            >
              Enter Manually
            </button>
          </div>
        </div>
      )}

      {(state === 'error' || state === 'manual') && (
        <div>
          {state === 'error' && (
            <div
              className="mb-3 p-3 flex items-start gap-2"
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: `1px solid ${colors.error}`,
                borderRadius: 12,
              }}
            >
              <AlertCircle size={16} color={colors.error} className="flex-shrink-0 mt-0.5" />
              <p className="text-[12px] font-['DM_Sans']" style={{ color: colors.error }}>
                Couldn't read the report. Enter your values manually below.
              </p>
            </div>
          )}

          <InlineNumberField
            label="BODY FAT % (OPTIONAL)"
            unit="%"
            value={manual.body_fat_pct}
            onChange={(v) => updateManual('body_fat_pct', v)}
            min={3}
            max={60}
          />
          <InlineNumberField
            label="SKELETAL MUSCLE MASS (KG) (OPTIONAL)"
            unit="kg"
            value={manual.skeletal_muscle_mass}
            onChange={(v) => updateManual('skeletal_muscle_mass', v)}
          />
          <InlineNumberField
            label="BMR (OPTIONAL)"
            unit="kcal/day"
            value={manual.bmr}
            onChange={(v) => updateManual('bmr', v)}
          />
          <InlineNumberField
            label="VISCERAL FAT LEVEL (OPTIONAL)"
            value={manual.visceral_fat_level}
            onChange={(v) => updateManual('visceral_fat_level', v)}
            min={1}
            max={20}
          />

          <div className="flex gap-2 mt-1">
            <button
              onClick={useManualValues}
              className="flex-1 py-3 font-['DM_Sans'] font-semibold text-[13px] active:scale-[0.98] transition-transform"
              style={{
                borderRadius: radius.button,
                background: colors.accent,
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Save
            </button>
            <button
              onClick={handleSkip}
              className="flex-1 py-3 font-['DM_Sans'] font-semibold text-[13px] active:scale-[0.98] transition-transform"
              style={{
                borderRadius: radius.button,
                background: colors.surface3,
                color: colors.text,
                border: `1.5px solid ${colors.border}`,
                cursor: 'pointer',
              }}
            >
              Skip
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
