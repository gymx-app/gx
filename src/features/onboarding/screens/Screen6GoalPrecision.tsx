import { useState } from 'react'
import { colors, radius } from '../../../styles/tokens'
import type { WizardState } from '../useWizardState'
import { NumberField, PillButton, SectionLabel } from './shared'
import { numToStr, parseOptionalNumber } from './sharedUtils'
import { WizardCta } from './WizardCta'

const PRIMARY_LIFT_OPTIONS = [
  { value: 'squat', label: 'Squat' },
  { value: 'bench_press', label: 'Bench Press' },
  { value: 'deadlift', label: 'Deadlift' },
  { value: 'overhead_press', label: 'OHP' },
]

const FOCUS_OPTIONS = [
  { value: 'endurance', label: 'Endurance' },
  { value: 'mobility', label: 'Mobility' },
  { value: 'overall_health', label: 'Overall Health' },
]

interface Props {
  wizardState: WizardState
  setField: (key: string, value: unknown) => void
  onContinue: () => void
}

function InBodyBadgeField({
  label,
  value,
  isFromInbody,
  onEdit,
  editing,
  onChange,
}: {
  label: string
  value: number | null
  isFromInbody: boolean
  onEdit: () => void
  editing: boolean
  onChange: (v: number | null) => void
}) {
  if (isFromInbody && !editing) {
    return (
      <div className="mb-4">
        <SectionLabel label={label} className="mb-2" />
        <div
          className="flex items-center justify-between h-[48px] px-[14px]"
          style={{
            background: colors.surface2,
            border: `1.5px solid ${colors.border}`,
            borderRadius: radius.input,
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-['DM_Sans']" style={{ color: colors.text }}>
              {value}%
            </span>
            <span
              className="text-[10px] font-['DM_Sans'] px-2 py-0.5"
              style={{ background: colors.surface3, color: colors.muted, borderRadius: 999 }}
            >
              InBody
            </span>
          </div>
          <button
            onClick={onEdit}
            className="text-[12px] font-['DM_Sans'] font-semibold"
            style={{ color: colors.accent, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Edit
          </button>
        </div>
      </div>
    )
  }
  return (
    <NumberField
      label={`${label} (OPTIONAL)`}
      value={numToStr(value)}
      onChange={(v) => onChange(parseOptionalNumber(v))}
      min={3}
      max={60}
    />
  )
}

function inRange(value: number | null | undefined, min: number, max: number): boolean {
  return value == null || (value >= min && value <= max)
}

export function Screen6GoalPrecision({ wizardState, setField, onContinue }: Props) {
  const [editingCurrentBf, setEditingCurrentBf] = useState(false)
  const goal = wizardState.goal
  const sub = wizardState.goal_sub_fields
  const isFromInbody = wizardState.inbody_field_sources.body_fat_pct === 'inbody'

  const setSub = (key: string, value: unknown) => setField(`goal_sub_fields.${key}`, value)

  const subFieldsValid =
    inRange(sub.current_body_fat_pct ?? wizardState.body_fat_pct, 3, 60) &&
    inRange(sub.target_body_fat_pct, 3, 60) &&
    inRange(sub.target_muscle_gain_kg, 0.5, 20) &&
    inRange(sub.target_timeframe_weeks, 8, 52) &&
    inRange(sub.current_1rm_kg, 0, 500) &&
    inRange(sub.target_1rm_kg, 0, 500)

  const valid = (goal !== 'strength' || !!sub.primary_lift) && subFieldsValid

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-['Bebas_Neue'] text-[32px] tracking-[2px] text-[#f0ede8] leading-none">
          MAKE IT PRECISE
        </h1>
        <button
          onClick={() => subFieldsValid && onContinue()}
          disabled={!subFieldsValid}
          className="text-[13px] font-['DM_Sans'] font-semibold"
          style={{
            color: colors.accent,
            background: 'none',
            border: 'none',
            cursor: subFieldsValid ? 'pointer' : 'default',
            opacity: subFieldsValid ? 1 : 0.4,
          }}
        >
          Skip →
        </button>
      </div>
      <p
        className="text-[14px] font-['DM_Sans'] mt-2 mb-6 leading-relaxed"
        style={{ color: colors.muted }}
      >
        Optional — but the more specific you are, the more targeted your programme will be.
      </p>

      {(goal === 'fat_loss' || goal === 'recomposition') && (
        <>
          <InBodyBadgeField
            label="CURRENT BODY FAT %"
            value={sub.current_body_fat_pct ?? wizardState.body_fat_pct}
            isFromInbody={isFromInbody}
            editing={editingCurrentBf}
            onEdit={() => setEditingCurrentBf(true)}
            onChange={(v) => setSub('current_body_fat_pct', v)}
          />
          <NumberField
            label="TARGET BODY FAT %"
            helper="Where you want to get to. Odin validates if your timeline is realistic."
            value={numToStr(sub.target_body_fat_pct)}
            onChange={(v) => setSub('target_body_fat_pct', parseOptionalNumber(v))}
            min={3}
            max={60}
          />
          {goal === 'recomposition' && (
            <NumberField
              label="TARGET MUSCLE GAIN (KG)"
              value={numToStr(sub.target_muscle_gain_kg)}
              onChange={(v) => setSub('target_muscle_gain_kg', parseOptionalNumber(v))}
              min={0.5}
              max={20}
            />
          )}
          <NumberField
            label="TARGET TIMEFRAME (WEEKS)"
            helper="How long you want the programme to run."
            value={numToStr(sub.target_timeframe_weeks)}
            onChange={(v) => setSub('target_timeframe_weeks', parseOptionalNumber(v))}
            min={8}
            max={52}
          />
        </>
      )}

      {goal === 'muscle_gain' && (
        <>
          <NumberField
            label="TARGET MUSCLE GAIN (KG)"
            helper="Odin uses published rate models to set realistic phase structure."
            value={numToStr(sub.target_muscle_gain_kg)}
            onChange={(v) => setSub('target_muscle_gain_kg', parseOptionalNumber(v))}
            min={0.5}
            max={20}
          />
          <NumberField
            label="TARGET TIMEFRAME (WEEKS)"
            value={numToStr(sub.target_timeframe_weeks)}
            onChange={(v) => setSub('target_timeframe_weeks', parseOptionalNumber(v))}
            min={8}
            max={52}
          />
        </>
      )}

      {goal === 'strength' && (
        <>
          <div className="mb-4">
            <SectionLabel label="PRIMARY LIFT" className="mb-2" />
            <div className="flex gap-2 flex-wrap">
              {PRIMARY_LIFT_OPTIONS.map((opt) => (
                <PillButton
                  key={opt.value}
                  label={opt.label}
                  active={sub.primary_lift === opt.value}
                  onTap={() => setSub('primary_lift', opt.value)}
                />
              ))}
            </div>
            <p className="text-[11px] mt-1.5 pl-1" style={{ color: colors.muted }}>
              Your programme anchors to this lift every relevant session.
            </p>
          </div>
          <NumberField
            label="CURRENT 1RM (KG)"
            helper="Your best single rep. Unknown? We test it on Day 1."
            value={numToStr(sub.current_1rm_kg)}
            onChange={(v) => setSub('current_1rm_kg', parseOptionalNumber(v))}
            min={0}
            max={500}
          />
          <NumberField
            label="TARGET 1RM (KG)"
            value={numToStr(sub.target_1rm_kg)}
            onChange={(v) => setSub('target_1rm_kg', parseOptionalNumber(v))}
            min={0}
            max={500}
          />
          <NumberField
            label="TARGET TIMEFRAME (WEEKS)"
            value={numToStr(sub.target_timeframe_weeks)}
            onChange={(v) => setSub('target_timeframe_weeks', parseOptionalNumber(v))}
            min={8}
            max={52}
          />
        </>
      )}

      {goal === 'general_fitness' && (
        <>
          <div className="mb-4">
            <SectionLabel label="FOCUS" className="mb-2" />
            <div className="flex gap-2 flex-wrap">
              {FOCUS_OPTIONS.map((opt) => (
                <PillButton
                  key={opt.value}
                  label={opt.label}
                  active={sub.focus === opt.value}
                  onTap={() => setSub('focus', opt.value)}
                />
              ))}
            </div>
            <p className="text-[11px] mt-1.5 pl-1" style={{ color: colors.muted }}>
              Shapes the balance of conditioning vs strength.
            </p>
          </div>
          <NumberField
            label="TARGET TIMEFRAME (WEEKS)"
            value={numToStr(sub.target_timeframe_weeks)}
            onChange={(v) => setSub('target_timeframe_weeks', parseOptionalNumber(v))}
            min={8}
            max={52}
          />
        </>
      )}

      <WizardCta label="CONTINUE →" disabled={!valid} onTap={onContinue} />
    </>
  )
}
