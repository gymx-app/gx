import { useMemo, useState } from 'react'
import { colors, radius } from '../../../styles/tokens'
import { INPUT_STYLE } from './sharedUtils'

export function SectionLabel({ label, className = '' }: { label: string; className?: string }) {
  return (
    <p
      className={`text-[10px] font-['DM_Sans'] font-bold tracking-[2px] uppercase ${className}`}
      style={{ color: colors.muted }}
    >
      {label}
    </p>
  )
}

export function FieldHelper({ text }: { text: string }) {
  return (
    <p className="text-[11px] mt-1.5 pl-1 leading-relaxed" style={{ color: colors.muted }}>
      {text}
    </p>
  )
}

export function FieldError({ text }: { text: string }) {
  return (
    <p className="text-[11px] mt-1 pl-1" style={{ color: colors.error }}>
      {text}
    </p>
  )
}

export function PillButton({
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

export function TagPill({
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

export function MultiSelectPills({
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

export function SelectableCard({
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

export function UnitToggle<T extends string>({
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

export function Stepper({
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

export function SearchableSelect({
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

export function NumberField({
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
  const parsed = value.trim() === '' ? null : parseFloat(value)
  const outOfRange =
    parsed != null &&
    !isNaN(parsed) &&
    ((min != null && parsed < min) || (max != null && parsed > max))

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
      {outOfRange ? (
        <FieldError text={`Must be between ${min} and ${max}`} />
      ) : (
        <>
          {hint && <FieldHelper text={hint} />}
          {helper && !hint && <FieldHelper text={helper} />}
        </>
      )}
    </div>
  )
}
