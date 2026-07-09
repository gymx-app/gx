import { AlertCircle, WifiOff } from 'lucide-react'
import { colors, radius } from '../../../styles/tokens'
import { calculateAge, getISTTodayStr } from '../../../utils/dateUtils'
import { useOdinStatus } from '../../../hooks/useOdinStatus'
import type { GenerationErrorType, WizardState } from '../useWizardState'
import { INPUT_STYLE } from './sharedUtils'
import { WizardCta } from './WizardCta'

function OdinStatusPill() {
  const { infra, model, status } = useOdinStatus()

  if (status === 'failed') return null

  return (
    <div
      className={`absolute top-0 right-0 font-['Bebas_Neue'] uppercase ${
        status === 'loading' ? 'animate-pulse' : ''
      }`}
      style={{
        fontSize: 9,
        letterSpacing: '0.16em',
        color: colors.muted,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.pill,
        padding: '4px 8px',
      }}
    >
      {status === 'loading' ? infra : `${infra} · ${model}`}
    </div>
  )
}

const GOAL_LABELS: Record<string, string> = {
  fat_loss: 'Fat Loss',
  muscle_gain: 'Muscle Gain',
  strength: 'Strength',
  recomposition: 'Recomposition',
  general_fitness: 'General Fitness',
}

const BASELINE_LABELS: Record<string, string> = {
  self_reported: 'Self-reported',
  day_one_test: 'Day 1 test',
  skipped: 'RPE only',
}

interface FailureFieldStep {
  match: RegExp
  step: number
}

const VALIDATION_FIELD_STEPS: FailureFieldStep[] = [
  { match: /goal|primary.?lift/i, step: 6 },
  { match: /equipment|days|duration/i, step: 7 },
  { match: /baseline/i, step: 8 },
  { match: /medical|injur/i, step: 9 },
]

interface Props {
  wizardState: WizardState
  setField: (key: string, value: unknown) => void
  goToStep: (n: number) => void
  onGenerate: () => void
}

export function Screen10ProgrammeProfile({ wizardState, setField, goToStep, onGenerate }: Props) {
  const age = calculateAge(wizardState.date_of_birth)
  const genderInitial = wizardState.gender ? wizardState.gender.charAt(0).toUpperCase() : ''
  const bfSourceBadge = wizardState.inbody_field_sources.body_fat_pct === 'inbody'

  const errorType: GenerationErrorType = wizardState.generation_error_type
  const errorMessage = wizardState.generation_error

  const matchedStep =
    errorType === 'VALIDATION_ERROR' && errorMessage
      ? VALIDATION_FIELD_STEPS.find((f) => f.match.test(errorMessage))?.step
      : undefined

  const ctaLabel =
    errorType === 'API_ERROR' || errorType === 'VALIDATION_ERROR'
      ? 'TRY AGAIN →'
      : 'GENERATE MY PROGRAMME →'

  return (
    <div className="relative">
      <OdinStatusPill />

      <h1
        className="font-['Bebas_Neue'] text-[26px] tracking-[2px] text-text leading-none"
        style={{ paddingRight: 100 }}
      >
        THIS IS WHO ODIN IS BUILDING FOR
      </h1>
      <p
        className="text-[14px] font-['DM_Sans'] mt-1 mb-6 leading-relaxed"
        style={{ color: colors.muted }}
      >
        Review your profile. When you're ready, generate your programme.
      </p>

      <div
        className="p-4 mb-3"
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.cardLg,
        }}
      >
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span
            className="text-[12px] font-['DM_Sans'] font-semibold"
            style={{ color: colors.text }}
          >
            {age ?? '—'}
            {genderInitial}
          </span>
          <span className="text-[12px] font-['DM_Sans']" style={{ color: colors.muted }}>
            ·
          </span>
          <span className="text-[12px] font-['DM_Sans']" style={{ color: colors.textSecondary }}>
            {wizardState.height_cm ?? '—'}cm
          </span>
          <span className="text-[12px] font-['DM_Sans']" style={{ color: colors.muted }}>
            ·
          </span>
          <span className="text-[12px] font-['DM_Sans']" style={{ color: colors.textSecondary }}>
            {wizardState.current_weight_kg ?? '—'}kg
          </span>
          {wizardState.inbody_uploaded && (
            <span
              className="text-[10px] font-['DM_Sans'] px-2 py-0.5"
              style={{ background: colors.surface3, color: colors.muted, borderRadius: 999 }}
            >
              InBody
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-2">
          {wizardState.goal && (
            <span
              className="text-[11px] font-['DM_Sans'] font-semibold px-2.5 py-1"
              style={{ background: colors.accentMuted, color: colors.accent, borderRadius: 999 }}
            >
              {GOAL_LABELS[wizardState.goal] ?? wizardState.goal}
            </span>
          )}
          {wizardState.body_fat_pct != null && (
            <span className="text-[12px] font-['DM_Sans']" style={{ color: colors.textSecondary }}>
              {wizardState.body_fat_pct}% BF{bfSourceBadge ? ' (InBody)' : ''}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-[12px] font-['DM_Sans']" style={{ color: colors.textSecondary }}>
            {wizardState.equipment?.replace(/_/g, ' ') ?? '—'}
          </span>
          <span className="text-[12px] font-['DM_Sans']" style={{ color: colors.muted }}>
            ·
          </span>
          <span className="text-[12px] font-['DM_Sans']" style={{ color: colors.textSecondary }}>
            {wizardState.available_days_per_week}d/wk
          </span>
          <span className="text-[12px] font-['DM_Sans']" style={{ color: colors.muted }}>
            ·
          </span>
          <span className="text-[12px] font-['DM_Sans']" style={{ color: colors.textSecondary }}>
            {wizardState.session_duration_min}min
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span
            className="text-[12px] font-['DM_Sans'] capitalize"
            style={{ color: colors.textSecondary }}
          >
            {wizardState.fitness_level ?? '—'}
          </span>
          {wizardState.lifestyle.slice(0, 2).map((l) => (
            <span
              key={l}
              className="text-[11px] font-['DM_Sans'] px-2 py-0.5"
              style={{ background: colors.surface2, color: colors.muted, borderRadius: 999 }}
            >
              {l.split(' (')[0]}
            </span>
          ))}
          {wizardState.lifestyle.length > 2 && (
            <span className="text-[11px] font-['DM_Sans']" style={{ color: colors.muted }}>
              +{wizardState.lifestyle.length - 2} more
            </span>
          )}
        </div>

        {wizardState.baseline_path && wizardState.baseline_path !== 'skipped' && (
          <p className="text-[12px] font-['DM_Sans'] mb-2" style={{ color: colors.textSecondary }}>
            Baseline: {BASELINE_LABELS[wizardState.baseline_path]}
            {wizardState.baseline_path === 'self_reported' &&
              ` · ${wizardState.known_lifts.length} lifts entered`}
          </p>
        )}

        {wizardState.medical_conditions.length > 0 &&
          !wizardState.medical_conditions.every((c) => c === 'None') && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {wizardState.medical_conditions
                .filter((c) => c !== 'None')
                .map((c) => (
                  <span
                    key={c}
                    className="text-[10px] font-['DM_Sans'] px-2 py-0.5"
                    style={{
                      background: 'rgba(245,158,11,0.12)',
                      color: colors.warning,
                      borderRadius: 999,
                    }}
                  >
                    {c}
                  </span>
                ))}
            </div>
          )}

        {wizardState.injuries.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {wizardState.injuries.map((i) => (
              <span
                key={i.area}
                className="text-[10px] font-['DM_Sans'] px-2 py-0.5"
                style={{ background: colors.surface2, color: colors.muted, borderRadius: 999 }}
              >
                {i.area} · {i.modification}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-6">
        {[
          { label: 'Edit identity', step: 2 },
          { label: 'Edit body data', step: 3 },
          { label: 'Edit goal', step: 5 },
          { label: 'Edit schedule', step: 7 },
          { label: 'Edit constraints', step: 9 },
        ].map((l) => (
          <button
            key={l.step}
            onClick={() => goToStep(l.step)}
            className="text-[12px] font-['DM_Sans'] font-semibold"
            style={{
              color: colors.accent,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="mb-5">
        <p
          className="text-[10px] font-['DM_Sans'] font-bold tracking-[2px] uppercase mb-2"
          style={{ color: colors.muted }}
        >
          PROGRAMME START DATE
        </p>
        <input
          type="date"
          value={wizardState.start_date}
          min={getISTTodayStr()}
          onChange={(e) => setField('start_date', e.target.value)}
          className="h-[52px] w-full px-[14px] text-text text-[16px] font-['DM_Sans']"
          style={{ ...INPUT_STYLE, colorScheme: 'dark' }}
        />
      </div>

      {errorType === 'API_ERROR' && (
        <div
          className="p-4 mb-4"
          style={{
            background: colors.surface2,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.button,
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <WifiOff size={16} color={colors.muted} />
            <p className="text-[13px] font-['DM_Sans'] font-medium" style={{ color: colors.text }}>
              Generation failed
            </p>
          </div>
          <p className="text-[12px] font-['DM_Sans']" style={{ color: colors.muted }}>
            Something went wrong on our end. Your profile is saved — tap to try again.
          </p>
        </div>
      )}

      {errorType === 'VALIDATION_ERROR' && (
        <div
          className="p-4 mb-4"
          style={{
            background: colors.surface2,
            border: `1px solid ${colors.dangerBorder}`,
            borderRadius: radius.button,
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={16} color={colors.error} />
            <p className="text-[13px] font-['DM_Sans'] font-medium" style={{ color: colors.text }}>
              We need one more thing
            </p>
          </div>
          <p className="text-[12px] font-['DM_Sans'] mb-1" style={{ color: colors.muted }}>
            {errorMessage}
          </p>
          {matchedStep && (
            <button
              onClick={() => goToStep(matchedStep)}
              className="text-[12px] font-['DM_Sans'] font-semibold"
              style={{
                color: colors.accent,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Fix this →
            </button>
          )}
        </div>
      )}

      <WizardCta label={ctaLabel} onTap={onGenerate} />
    </div>
  )
}
