import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { colors, radius, shadows } from '../../styles/tokens'
import { calculateAge } from '../../utils/dateUtils'
import { GOAL_LABELS } from './goalLabels'
import { Pencil, ChevronDown } from 'lucide-react'

export interface UserProfile {
  full_name: string | null
  date_of_birth: string | null
  gender: string | null
  height_cm: number | null
  current_weight_kg: number | null
  target_weight_kg: number | null
}

export interface UserHealth {
  current_weight_kg: number | null
  fitness_level: string | null
  goal: string | null
  available_days_per_week: number | null
  session_duration_min: number | null
  equipment: string | null
  injuries: string[] | null
  preferred_workout_time: string | null
  injuries_v2?: { area: string; modification: 'modify' | 'avoid' | null; notes: string }[] | null
  lifestyle?: string[] | null
  body_fat_pct?: number | null
  target_body_fat_pct?: number | null
  target_weight_kg?: number | null
  target_timeframe_weeks?: number | null
}

const EQUIPMENT_LABELS: Record<string, string> = {
  full_gym: 'Full Gym',
  dumbbells_only: 'Dumbbells',
  bodyweight: 'Bodyweight',
  bodyweight_only: 'Bodyweight',
  home_gym: 'Home Gym',
}

const GOAL_COLORS: Record<string, string> = {
  fat_loss: colors.orange,
  muscle_gain: colors.blue,
  recomposition: colors.purple,
  strength: colors.accent,
  endurance: colors.cyan,
  general_fitness: colors.success,
  body_recomposition: colors.purple,
  maintenance: colors.muted,
}

const FITNESS_LEVELS = ['beginner', 'intermediate', 'advanced']

interface EditMenuItem {
  label: string
  step: number
  accent?: boolean
}

const EDIT_MENU_ITEMS: EditMenuItem[] = [
  { label: 'Goal', step: 5 },
  { label: 'Days & Duration', step: 7 },
  { label: 'Equipment', step: 7 },
  { label: 'Fitness level', step: 4 },
  { label: 'Injuries & Limitations', step: 9 },
  { label: 'Personal stats', step: 3 },
]

const REGENERATE_ITEM: EditMenuItem = { label: 'Regenerate programme', step: 10, accent: true }

function ageGenderChip(dob: string | null, gender: string | null): string {
  const age = calculateAge(dob)
  if (age === null) return '—'
  const initial = gender === 'female' ? 'F' : gender === 'other' ? 'O' : 'M'
  return `${age}${initial}`
}

function fmtNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

// "Sedentary (desk job, minimal movement)" -> "Sedentary" — the parenthetical
// is onboarding-form helper text, not part of the tag itself.
function shortLifestyleLabel(label: string): string {
  return label.replace(/\s*\(.*\)$/, '')
}

const MODIFICATION_COLOR: Record<string, string> = {
  modify: colors.warning,
  avoid: colors.error,
}

interface GoalMetricValue {
  current: string
  target: string
  unit: string
  isBodyFat: boolean
}

// Only fat_loss/recomposition (body-fat %) and muscle_gain (weight) have a
// real tracked target in user_health — this app never records a target
// weight for fat-loss goals, so we don't fabricate one.
function goalMetric(health: UserHealth): GoalMetricValue | null {
  if (health.goal === 'fat_loss' || health.goal === 'recomposition') {
    if (health.body_fat_pct != null && health.target_body_fat_pct != null) {
      return {
        current: fmtNum(health.body_fat_pct),
        target: fmtNum(health.target_body_fat_pct),
        unit: '%',
        isBodyFat: true,
      }
    }
  }
  if (health.goal === 'muscle_gain') {
    if (health.current_weight_kg != null && health.target_weight_kg != null) {
      return {
        current: fmtNum(health.current_weight_kg),
        target: fmtNum(health.target_weight_kg),
        unit: 'kg',
        isBodyFat: false,
      }
    }
  }
  return null
}

function EditMenu() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const handleItemTap = (step: number) => {
    setOpen(false)
    void navigate(`/onboarding?step=${step}`)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-center gap-1.5 py-3 active:opacity-60"
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <Pencil size={13} color={colors.accent} />
        <span
          className="text-[13px] font-['DM_Sans'] font-semibold"
          style={{ color: colors.accent }}
        >
          Edit
        </span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 8,
            zIndex: 50,
            minWidth: 200,
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.card,
            boxShadow: shadows.cardElevated,
            overflow: 'hidden',
          }}
        >
          {EDIT_MENU_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => handleItemTap(item.step)}
              className="w-full text-left px-4 flex items-center active:opacity-70"
              style={{
                minHeight: 44,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: colors.muted,
              }}
            >
              <span className="text-[13px] font-['DM_Sans']">{item.label}</span>
            </button>
          ))}

          <div style={{ height: 1, background: colors.border }} />

          <button
            onClick={() => handleItemTap(REGENERATE_ITEM.step)}
            className="w-full text-left px-4 flex items-center active:opacity-70"
            style={{
              minHeight: 44,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: colors.accent,
            }}
          >
            <span className="text-[13px] font-['DM_Sans']">{REGENERATE_ITEM.label}</span>
          </button>
        </div>
      )}
    </div>
  )
}

interface ProfileCardProps {
  profile: UserProfile
  health: UserHealth
  totalWeeks: number
  currentWeek?: number | null
  injuries: string[]
  hasInbodyScan?: boolean | null
}

export function ProfileCard({
  profile,
  health,
  totalWeeks,
  currentWeek,
  injuries,
  hasInbodyScan,
}: ProfileCardProps) {
  const [expanded, setExpanded] = useState(false)

  const chip = ageGenderChip(profile.date_of_birth, profile.gender)
  const heightCm = profile.height_cm != null ? `${Math.round(profile.height_cm)}cm` : '—'
  const weightKg = health.current_weight_kg != null ? `${health.current_weight_kg}kg` : '—'
  const goalKey = health.goal ?? 'general_fitness'
  const goalLabel = GOAL_LABELS[goalKey] ?? goalKey
  const goalColor = GOAL_COLORS[goalKey] ?? colors.accent
  const fitnessLevel = health.fitness_level ?? 'beginner'
  const fitnessIdx = FITNESS_LEVELS.indexOf(fitnessLevel.toLowerCase())
  const metric = goalMetric(health)
  const weeksTotal = health.target_timeframe_weeks ?? totalWeeks
  const weekProgressPct =
    currentWeek != null && weeksTotal > 0
      ? Math.min(100, Math.max(0, (currentWeek / weeksTotal) * 100))
      : null
  const toGoText = metric
    ? metric.isBodyFat
      ? `${fmtNum(Math.max(0, Number(metric.current) - Number(metric.target)))}% to go`
      : `${fmtNum(Math.max(0, Number(metric.target) - Number(metric.current)))}kg to go`
    : null
  const showInbodyBadge = expanded && metric?.isBodyFat && hasInbodyScan != null
  const lifestyle = health.lifestyle ?? []
  const injuryChips = health.injuries_v2?.length
    ? health.injuries_v2
    : injuries.map((area) => ({ area, modification: null as 'modify' | 'avoid' | null }))

  const statParts = [
    health.available_days_per_week != null ? `${health.available_days_per_week}D` : null,
    health.session_duration_min != null ? `${health.session_duration_min}MIN` : null,
    health.equipment
      ? (EQUIPMENT_LABELS[health.equipment] ?? health.equipment).toUpperCase()
      : null,
  ].filter(Boolean)

  return (
    <div style={{ position: 'relative' }}>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 16,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative' }}>
        {/* Row 1 — Identity bar: age/gender chip + height/weight + goal */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <div
            className="flex-shrink-0 px-3 py-2 flex items-center justify-center"
            style={{
              background: `${goalColor}22`,
              border: `1.5px solid ${goalColor}55`,
              borderRadius: 10,
            }}
          >
            <span
              className="font-['Bebas_Neue'] text-[16px] tracking-[1px]"
              style={{ color: goalColor }}
            >
              {chip}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="font-['DM_Sans'] font-semibold text-[13px] leading-tight truncate"
              style={{ color: colors.text }}
            >
              {heightCm} · {weightKg}
            </p>
          </div>
          <span
            className="flex-shrink-0 text-[11px] font-['DM_Sans'] font-bold tracking-[0.5px] px-2.5 py-1"
            style={{
              background: `${goalColor}18`,
              border: `1px solid ${goalColor}55`,
              borderRadius: 8,
              color: goalColor,
            }}
          >
            {goalLabel}
          </span>
        </div>

        {/* Row 2 — Big goal-progress metric */}
        {(metric != null || weekProgressPct != null) && (
          <div className="px-4 pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-baseline flex-wrap gap-x-1.5 gap-y-1">
                {metric ? (
                  <>
                    <span
                      className="font-['DM_Sans'] font-bold text-[26px] leading-none"
                      style={{ color: colors.text }}
                    >
                      {metric.current}
                      {metric.unit}
                    </span>
                    <span className="text-[15px]" style={{ color: colors.muted }}>
                      →
                    </span>
                    <span
                      className="font-['DM_Sans'] font-bold text-[18px] leading-none"
                      style={{ color: colors.textSecondary }}
                    >
                      {metric.target}
                      {metric.unit}
                    </span>
                  </>
                ) : (
                  weeksTotal > 0 && (
                    <span
                      className="text-[13px] font-['DM_Sans'] font-medium"
                      style={{ color: colors.textSecondary }}
                    >
                      {weeksTotal}-week programme
                    </span>
                  )
                )}
                {showInbodyBadge && (
                  <span
                    className="text-[9px] font-['DM_Sans'] font-bold uppercase px-1.5 py-0.5"
                    style={{
                      background: hasInbodyScan ? colors.accentMuted : colors.surface2,
                      color: hasInbodyScan ? colors.accent : colors.muted,
                      borderRadius: radius.pill,
                    }}
                  >
                    {hasInbodyScan ? 'InBody' : 'Self-reported'}
                  </span>
                )}
              </div>

              {!expanded && weekProgressPct != null && (
                <span
                  className="text-[11px] font-['DM_Sans'] whitespace-nowrap flex-shrink-0 pt-1.5"
                  style={{ color: colors.muted }}
                >
                  Wk {currentWeek}/{weeksTotal}
                  {toGoText ? ` · ${toGoText}` : ''}
                </span>
              )}
            </div>

            {weekProgressPct != null && (
              <>
                <div
                  className="h-[5px] rounded-full overflow-hidden mt-2"
                  style={{ background: colors.surface3 }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${weekProgressPct}%`, background: goalColor }}
                  />
                </div>
                {expanded && (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] font-['DM_Sans']" style={{ color: colors.muted }}>
                      Wk {currentWeek} of {weeksTotal}
                    </span>
                    {toGoText && (
                      <span
                        className="text-[10px] font-['DM_Sans']"
                        style={{ color: colors.muted }}
                      >
                        {toGoText}
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Row 3 — Active + quick stats chips */}
        <div
          className="flex items-center flex-wrap gap-2 px-4 py-3"
          style={{ borderTop: `1px solid ${colors.border}` }}
        >
          <span
            className="text-[10px] font-['DM_Sans'] font-bold tracking-[2px] uppercase px-2 py-1"
            style={{
              background: colors.accentMuted,
              color: colors.accent,
              borderRadius: radius.pill,
            }}
          >
            Active
          </span>
          {statParts.length > 0 && (
            <span
              className="text-[10px] font-['DM_Sans'] font-bold tracking-[1px] uppercase px-2 py-1"
              style={{
                background: colors.surface2,
                color: colors.textSecondary,
                borderRadius: radius.pill,
              }}
            >
              {statParts.join(' · ')}
            </span>
          )}
        </div>

        {/* Row 4 — Limitations chips */}
        {injuryChips.length > 0 && (
          <div className="px-4 pb-3 flex flex-wrap gap-1.5">
            {injuryChips.map((injury) => {
              const modColor = injury.modification
                ? (MODIFICATION_COLOR[injury.modification] ?? colors.muted)
                : colors.muted
              return (
                <span
                  key={injury.area}
                  className="text-[11px] font-['DM_Sans'] font-bold uppercase px-2.5 py-1 tracking-[0.5px]"
                  style={{
                    background: colors.surface2,
                    color: modColor,
                    borderRadius: radius.pill,
                  }}
                >
                  {injury.area}
                  {injury.modification ? ` · ${injury.modification}` : ''}
                </span>
              )
            })}
          </div>
        )}

        {/* Row 5 — Level (only when expanded) */}
        {expanded && (
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{ borderTop: `1px solid ${colors.border}` }}
          >
            <span
              className="text-[10px] font-['DM_Sans'] font-bold tracking-[1.5px] uppercase"
              style={{ color: colors.muted }}
            >
              Level
            </span>
            <div className="flex gap-1">
              {FITNESS_LEVELS.map((_, i) => (
                <div
                  key={i}
                  className="w-5 h-1.5"
                  style={{
                    background: i <= fitnessIdx ? goalColor : colors.surface3,
                    borderRadius: 2,
                  }}
                />
              ))}
            </div>
            <span
              className="text-[12px] font-['DM_Sans'] font-medium capitalize"
              style={{ color: colors.textSecondary }}
            >
              {fitnessLevel}
            </span>
          </div>
        )}

        {/* Row 6 — Lifestyle (only when expanded) */}
        {expanded && lifestyle.length > 0 && (
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{ borderTop: `1px solid ${colors.border}` }}
          >
            <span
              className="flex-shrink-0 text-[10px] font-['DM_Sans'] font-bold tracking-[1.5px] uppercase"
              style={{ color: colors.muted }}
            >
              Lifestyle
            </span>
            <span
              className="text-[12px] font-['DM_Sans'] font-medium truncate"
              style={{ color: colors.textSecondary }}
            >
              {lifestyle.map(shortLifestyleLabel).join(' · ')}
            </span>
          </div>
        )}

        {/* Disclosure toggle — sits right after whatever is currently visible */}
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="w-full flex items-center justify-between px-4 py-3 active:opacity-70"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderTop: `1px solid ${colors.border}`,
          }}
        >
          <span
            className="text-[12px] font-['DM_Sans'] font-medium"
            style={{ color: colors.textSecondary }}
          >
            {expanded ? 'Hide details' : 'Show level, lifestyle & source'}
          </span>
          <ChevronDown
            size={16}
            color={colors.muted}
            style={{
              transform: expanded ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
            }}
          />
        </button>

        {/* Edit — only reachable once expanded */}
        {expanded && (
          <div style={{ borderTop: `1px solid ${colors.border}` }}>
            <EditMenu />
          </div>
        )}
      </div>
    </div>
  )
}
