import { colors } from '../../styles/tokens'
import { calculateAge } from '../../utils/dateUtils'
import { GOAL_LABELS } from './goalLabels'
import { Pencil } from 'lucide-react'

export interface UserProfile {
  full_name: string | null
  date_of_birth: string | null
  gender: string | null
  height_cm: number | null
  current_weight_kg: number | null
  target_weight_kg: number | null
}

export interface UserHealth {
  fitness_level: string | null
  goal: string | null
  available_days_per_week: number | null
  session_duration_min: number | null
  equipment: string | null
  injuries: string[] | null
  preferred_workout_time: string | null
  injuries_v2?: { area: string; modification: 'modify' | 'avoid' | null; notes: string }[] | null
}

const EQUIPMENT_LABELS: Record<string, string> = {
  full_gym: 'Full Gym',
  dumbbells_only: 'Dumbbells Only',
  bodyweight: 'Bodyweight Only',
  bodyweight_only: 'Bodyweight Only',
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

function ageGenderChip(dob: string | null, gender: string | null): string {
  const age = calculateAge(dob)
  if (age === null) return '—'
  const initial = gender === 'female' ? 'F' : gender === 'other' ? 'O' : 'M'
  return `${age}${initial}`
}

interface ProfileCardProps {
  profile: UserProfile
  health: UserHealth
  onEdit?: () => void
}

export function ProfileCard({ profile, health, onEdit }: ProfileCardProps) {
  const chip = ageGenderChip(profile.date_of_birth, profile.gender)
  const heightCm = profile.height_cm != null ? `${Math.round(profile.height_cm)}cm` : '—'
  const weightKg = profile.current_weight_kg != null ? `${profile.current_weight_kg}kg` : '—'
  const goalKey = health.goal ?? 'general_fitness'
  const goalLabel = GOAL_LABELS[goalKey] ?? goalKey
  const goalColor = GOAL_COLORS[goalKey] ?? colors.accent
  const equipLabel = EQUIPMENT_LABELS[health.equipment ?? ''] ?? health.equipment ?? '—'
  const days = health.available_days_per_week ?? '—'
  const duration = health.session_duration_min ? `${health.session_duration_min} min` : '—'
  const fitnessLevel = health.fitness_level ?? 'beginner'
  const fitnessIdx = FITNESS_LEVELS.indexOf(fitnessLevel.toLowerCase())

  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      {/* Header: age/gender chip + height/weight + goal badge */}
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
        <div
          className="flex-shrink-0 px-2.5 py-1"
          style={{
            background: `${goalColor}18`,
            border: `1px solid ${goalColor}55`,
            borderRadius: 8,
          }}
        >
          <span
            className="text-[11px] font-['DM_Sans'] font-bold tracking-[0.5px]"
            style={{ color: goalColor }}
          >
            {goalLabel}
          </span>
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-3" style={{ borderTop: `1px solid ${colors.border}` }}>
        {[
          { label: 'DAYS / WK', value: String(days) },
          { label: 'DURATION', value: duration },
          { label: 'EQUIPMENT', value: equipLabel },
        ].map((stat, i, arr) => (
          <div
            key={stat.label}
            className="flex flex-col items-center justify-center py-3 px-2"
            style={{
              borderRight: i < arr.length - 1 ? `1px solid ${colors.border}` : 'none',
            }}
          >
            <p
              className="text-[9px] font-['DM_Sans'] font-bold tracking-[1.5px] mb-1"
              style={{ color: colors.muted }}
            >
              {stat.label}
            </p>
            <p
              className="font-['Bebas_Neue'] text-[18px] leading-none text-center"
              style={{ color: colors.text }}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Fitness level + edit */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderTop: `1px solid ${colors.border}` }}
      >
        <div className="flex items-center gap-2">
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
        {onEdit && (
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 active:opacity-60"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <Pencil size={11} color={colors.accent} />
            <span
              className="text-[12px] font-['DM_Sans'] font-semibold"
              style={{ color: colors.accent }}
            >
              Edit
            </span>
          </button>
        )}
      </div>
    </div>
  )
}
