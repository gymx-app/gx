import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useSaveProgramme } from '../../hooks/useSaveProgramme'
import { colors, radius } from '../../styles/tokens'
import { ChevronDown } from 'lucide-react'
import BaselineSessionCard from '../../components/today/BaselineSessionCard'
import type { GenerateResult } from './GenerateProgrammeView'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = any

interface ProgrammePreviewProps {
  result: GenerateResult
  onRegenerate: () => void
  // True when the programme has already been saved as the active programme
  // (e.g. the onboarding wizard saves before navigating here) — skips the
  // review/activate step and goes straight to the confirmation screen.
  alreadySaved?: boolean
}

const PHASE_ACCENT: Record<string, string> = {
  foundation: colors.blue,
  accumulation: colors.orange,
  intensification: colors.accent,
  realization: colors.purple,
  recovery: colors.success,
  maintenance: colors.muted,
}

function phaseColor(phase: AnyData): string {
  const t = (phase.phase_type ?? phase.name ?? '').toLowerCase()
  for (const key of Object.keys(PHASE_ACCENT)) {
    if (t.includes(key)) return PHASE_ACCENT[key] as string
  }
  return colors.accent
}

export default function ProgrammePreview({
  result,
  onRegenerate,
  alreadySaved = false,
}: ProgrammePreviewProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { save, saving, error: saveError } = useSaveProgramme()

  const odinResult = result.odinResult as AnyData
  const programme: AnyData = odinResult?.programme ?? {}
  const baselineSession: AnyData = odinResult?.baseline_session ?? null
  const phases: AnyData[] = programme?.phases ?? []
  const programmeName: string = programme?.programme?.name ?? programme?.name ?? 'Your Programme'
  const totalWeeks: number = phases.reduce(
    (s: number, p: AnyData) => s + (p.weeks_count ?? p.weeks?.length ?? 0),
    0
  )
  const summary: string =
    odinResult?.rationale?.combined?.[0] ?? programme?.programme?.goal_description ?? ''
  const subtitle = summary.length > 140 ? summary.slice(0, 140) + '…' : summary

  const [saved, setSaved] = useState(alreadySaved)
  const [resolvedProgrammeId, setResolvedProgrammeId] = useState<string | null>(
    result.programmeId ?? null
  )
  const [openPhase, setOpenPhase] = useState<number | null>(null)
  const [openWeek, setOpenWeek] = useState<number | null>(null)
  const [openDay, setOpenDay] = useState<number | null>(null)

  const togglePhase = useCallback((i: number) => {
    setOpenPhase((prev) => (prev === i ? null : i))
    setOpenWeek(null)
    setOpenDay(null)
  }, [])

  const toggleWeek = useCallback((i: number) => {
    setOpenWeek((prev) => (prev === i ? null : i))
    setOpenDay(null)
  }, [])

  const toggleDay = useCallback((i: number) => {
    setOpenDay((prev) => (prev === i ? null : i))
  }, [])

  const handleActivate = useCallback(async () => {
    if (!user) return
    const { success, programmeId } = await save({
      odinResult: result.odinResult as Record<string, unknown>,
      userId: user.id,
      goal: result.goal,
      equipment: result.equipment,
      startDate: result.startDate,
    })
    if (success) {
      if (programmeId) setResolvedProgrammeId(programmeId)
      setSaved(true)
    }
  }, [user, result, save])

  // Baseline logging needs a durable programme row to attach sets/results to
  // (calculateAndStoreBaseline writes against it) — only enable it once the
  // programme is actually saved, whether that happened before this screen
  // mounted (onboarding hand-off) or just now via handleActivate.
  const handleBaselineComplete = useCallback(() => {
    void navigate('/', { replace: true })
  }, [navigate])

  if (saved) {
    if (baselineSession) {
      return (
        <div
          className="flex-1 flex flex-col overflow-y-auto px-4 pt-4 pb-4"
          style={{ background: colors.bg }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: colors.accentMuted, border: `2px solid ${colors.accent}` }}
            >
              <span className="text-[16px]">✓</span>
            </div>
            <div>
              <p
                className="font-['Bebas_Neue'] text-[16px] tracking-[1px] leading-none"
                style={{ color: colors.text }}
              >
                {programmeName} is now active
              </p>
              <p className="text-[12px] font-['DM_Sans'] mt-1" style={{ color: colors.muted }}>
                Log your Day 0 baseline below to get started.
              </p>
            </div>
          </div>
          <BaselineSessionCard
            baselineSession={baselineSession}
            mode="logging"
            programmeId={resolvedProgrammeId}
            onComplete={handleBaselineComplete}
          />
        </div>
      )
    }

    return (
      <div
        className="flex-1 flex flex-col items-center justify-center px-8 text-center"
        style={{ background: colors.bg }}
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
          style={{ background: colors.accentMuted, border: `2px solid ${colors.accent}` }}
        >
          <span className="text-[36px]">✓</span>
        </div>
        <h2
          className="font-['Bebas_Neue'] text-[30px] tracking-[3px] mb-3"
          style={{ color: colors.text }}
        >
          Programme Activated
        </h2>
        <p
          className="text-[14px] font-['DM_Sans'] leading-relaxed mb-10"
          style={{ color: colors.muted }}
        >
          {programmeName} is now live.{'\n'}Your first session is ready on the Today tab.
        </p>
        <button
          onClick={() => void navigate('/', { replace: true })}
          className="w-full py-4 font-['Bebas_Neue'] text-[18px] tracking-[2px]"
          style={{
            borderRadius: radius.button,
            background: colors.accent,
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          GO TO TODAY
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col" style={{ background: colors.bg }}>
      {/* ── Hero header ── */}
      <div
        className="flex-shrink-0 px-4"
        style={{ background: colors.bg, borderBottom: `1px solid ${colors.border}` }}
      >
        <div className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-[10px] font-['DM_Sans'] font-bold tracking-[2px] uppercase px-2 py-1"
              style={{
                background: colors.accentMuted,
                color: colors.accent,
                borderRadius: radius.pill,
              }}
            >
              AI Generated
            </span>
            {totalWeeks > 0 && (
              <span
                className="text-[10px] font-['DM_Sans'] font-bold tracking-[2px] uppercase px-2 py-1"
                style={{
                  background: colors.surface2,
                  color: colors.textSecondary,
                  borderRadius: radius.pill,
                }}
              >
                {totalWeeks} weeks
              </span>
            )}
          </div>
          <h1 className="font-['Bebas_Neue'] text-[28px] tracking-[2px] text-white uppercase leading-none">
            {programmeName}
          </h1>
          {subtitle && (
            <p
              className="text-[13px] font-['DM_Sans'] mt-1.5 leading-relaxed"
              style={{ color: colors.muted }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto pb-4 px-4 pt-3 space-y-3">
        {baselineSession && <BaselineSessionCard baselineSession={baselineSession} />}

        {phases.length === 0 && (
          <p
            className="pt-8 text-[13px] font-['DM_Sans'] text-center"
            style={{ color: colors.muted }}
          >
            No programme data
          </p>
        )}

        {phases.map((phase: AnyData, pi: number) => {
          const accent = phaseColor(phase)
          const isOpen = openPhase === pi

          return (
            <div
              key={pi}
              style={{
                background: colors.surface,
                border: `1px solid ${isOpen ? accent : colors.border}`,
                borderRadius: radius.card,
                overflow: 'hidden',
                transition: 'border-color 0.2s',
              }}
            >
              {/* Phase header */}
              <button
                onClick={() => togglePhase(pi)}
                className="w-full flex items-center gap-3 p-4 active:opacity-70"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {/* Phase number pill */}
                <div
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center"
                  style={{ background: `${accent}22`, borderRadius: '50%' }}
                >
                  <span
                    className="font-['Bebas_Neue'] text-[15px] leading-none"
                    style={{ color: accent }}
                  >
                    {pi + 1}
                  </span>
                </div>

                <div className="flex-1 text-left">
                  <p
                    className="font-['Bebas_Neue'] text-[17px] tracking-[1px] leading-none"
                    style={{ color: colors.text }}
                  >
                    {phase.name ?? `Phase ${pi + 1}`}
                  </p>
                  {phase.objective && (
                    <p
                      className="text-[12px] font-['DM_Sans'] mt-0.5"
                      style={{ color: colors.muted }}
                    >
                      {phase.objective.length > 60
                        ? phase.objective.slice(0, 60) + '…'
                        : phase.objective}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {phase.weeks_count != null && (
                    <span
                      className="text-[11px] font-['DM_Sans'] font-medium px-2 py-0.5"
                      style={{
                        background: colors.surface3,
                        color: colors.textSecondary,
                        borderRadius: radius.chip,
                      }}
                    >
                      {phase.weeks_count}w
                    </span>
                  )}
                  <ChevronDown
                    size={16}
                    color={colors.muted}
                    style={{
                      transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                      transition: 'transform 0.2s',
                    }}
                  />
                </div>
              </button>

              {/* Weeks */}
              {isOpen && (
                <div style={{ borderTop: `1px solid ${colors.border}` }}>
                  {(!phase.weeks || phase.weeks.length === 0) && (
                    <p
                      className="px-4 py-3 text-[12px] font-['DM_Sans']"
                      style={{ color: colors.muted }}
                    >
                      No weeks
                    </p>
                  )}
                  {(phase.weeks ?? []).map((week: AnyData, wi: number) => {
                    const isWeekOpen = openWeek === wi
                    const isDeload = (week.week_type ?? '').toLowerCase().includes('deload')

                    return (
                      <div
                        key={wi}
                        style={{
                          borderBottom:
                            wi < (phase.weeks?.length ?? 0) - 1
                              ? `1px solid ${colors.borderSubtle}`
                              : 'none',
                        }}
                      >
                        <button
                          onClick={() => toggleWeek(wi)}
                          className="w-full flex items-center gap-3 py-3 px-4 active:opacity-70"
                          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          <div
                            className="flex-shrink-0 w-1.5 h-1.5 rounded-full"
                            style={{ background: isDeload ? colors.warning : accent }}
                          />
                          <span
                            className="flex-1 text-left text-[13px] font-['DM_Sans'] font-medium"
                            style={{ color: colors.text }}
                          >
                            Week {week.week_number ?? wi + 1}
                            {week.week_type ? (
                              <span className="font-normal" style={{ color: colors.muted }}>
                                {' '}
                                — {week.week_type}
                              </span>
                            ) : null}
                          </span>
                          {week.days?.length > 0 && (
                            <span
                              className="text-[11px] font-['DM_Sans'] px-1.5 py-0.5"
                              style={{
                                background: colors.surface3,
                                color: colors.muted,
                                borderRadius: radius.chip,
                              }}
                            >
                              {week.days.length}d
                            </span>
                          )}
                          <ChevronDown
                            size={14}
                            color={colors.muted}
                            style={{
                              transform: isWeekOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                              transition: 'transform 0.2s',
                              flexShrink: 0,
                            }}
                          />
                        </button>

                        {/* Days */}
                        {isWeekOpen && (
                          <div className="pb-2" style={{ background: colors.bgSubtle }}>
                            {(week.days ?? []).map((day: AnyData, di: number) => {
                              const isDayOpen = openDay === di
                              const exCount = day.exercises?.length ?? 0
                              const isRest = exCount === 0

                              return (
                                <div key={di}>
                                  <button
                                    onClick={() => toggleDay(di)}
                                    className="w-full flex items-center gap-3 py-2.5 px-5 active:opacity-70"
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <span
                                      className="flex-shrink-0 text-[10px] font-['DM_Sans'] font-bold tracking-[1px] w-8 text-center py-0.5"
                                      style={{
                                        background: isRest ? colors.surface3 : `${accent}22`,
                                        color: isRest ? colors.muted : accent,
                                        borderRadius: 4,
                                      }}
                                    >
                                      {day.day_of_week?.slice(0, 3) ?? `D${di + 1}`}
                                    </span>
                                    <span
                                      className="flex-1 text-left text-[13px] font-['DM_Sans']"
                                      style={{ color: isRest ? colors.muted : colors.text }}
                                    >
                                      {day.title ??
                                        day.day_type ??
                                        (isRest ? 'Rest' : `Day ${di + 1}`)}
                                    </span>
                                    {!isRest && (
                                      <span
                                        className="text-[11px] font-['DM_Sans']"
                                        style={{ color: colors.muted }}
                                      >
                                        {exCount} ex
                                      </span>
                                    )}
                                    {!isRest && (
                                      <ChevronDown
                                        size={13}
                                        color={colors.muted}
                                        style={{
                                          transform: isDayOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                                          transition: 'transform 0.2s',
                                          flexShrink: 0,
                                        }}
                                      />
                                    )}
                                  </button>

                                  {/* Exercises */}
                                  {isDayOpen && !isRest && (
                                    <div className="pb-1">
                                      {(day.exercises ?? []).map((ex: AnyData, ei: number) => {
                                        const firstSet = ex.sets?.[0]
                                        const setsReps = ex.sets?.length
                                          ? `${ex.sets.length}×${firstSet?.target_reps ?? '?'}`
                                          : null
                                        const rpe =
                                          firstSet?.target_rpe != null
                                            ? `RPE ${firstSet.target_rpe}`
                                            : null
                                        const rest =
                                          firstSet?.rest_seconds != null
                                            ? `${firstSet.rest_seconds}s`
                                            : null

                                        return (
                                          <div
                                            key={ei}
                                            className="flex items-start gap-3 py-2 px-7"
                                            style={{
                                              borderBottom:
                                                ei < (day.exercises?.length ?? 0) - 1
                                                  ? `1px solid ${colors.borderSubtle}`
                                                  : 'none',
                                            }}
                                          >
                                            <span
                                              className="flex-shrink-0 text-[10px] font-['DM_Sans'] font-bold mt-0.5 w-4 text-right"
                                              style={{ color: colors.muted }}
                                            >
                                              {ei + 1}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                              <p
                                                className="text-[13px] font-['DM_Sans'] font-medium leading-snug"
                                                style={{ color: colors.text }}
                                              >
                                                {ex.exercise_name}
                                              </p>
                                              {(setsReps ?? rpe ?? rest) && (
                                                <p
                                                  className="text-[11px] font-['DM_Sans'] mt-0.5"
                                                  style={{ color: colors.muted }}
                                                >
                                                  {[setsReps, rpe, rest]
                                                    .filter(Boolean)
                                                    .join(' · ')}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Footer ── */}
      <div
        className="flex-shrink-0 flex gap-3 px-4 pt-3"
        style={{
          background: colors.bg,
          borderTop: `1px solid ${colors.border}`,
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <button
          onClick={onRegenerate}
          disabled={saving}
          className="py-3.5 text-[14px] font-['DM_Sans'] font-medium active:opacity-60"
          style={{
            width: '38%',
            borderRadius: radius.button,
            border: `1px solid ${colors.border}`,
            background: 'none',
            color: colors.textSecondary,
            cursor: saving ? 'default' : 'pointer',
            opacity: saving ? 0.4 : 1,
          }}
        >
          Regenerate
        </button>
        <button
          onClick={() => void handleActivate()}
          disabled={saving || !user}
          className="py-3.5 text-[14px] font-['DM_Sans'] font-bold active:scale-[0.98] transition-transform"
          style={{
            width: '62%',
            borderRadius: radius.button,
            border: 'none',
            background: saving ? colors.surface3 : colors.accent,
            color: saving ? colors.muted : '#fff',
            cursor: saving ? 'default' : 'pointer',
          }}
        >
          {saving ? 'Saving…' : 'ACTIVATE PROGRAMME'}
        </button>
      </div>

      {saveError && (
        <div
          className="absolute left-4 right-4 p-3 text-[13px] font-['DM_Sans']"
          style={{
            bottom: 'calc(88px + env(safe-area-inset-bottom, 0px))',
            background: 'rgba(239,68,68,0.12)',
            border: `1px solid ${colors.error}`,
            borderRadius: 10,
            color: colors.error,
          }}
        >
          {saveError}
        </div>
      )}
    </div>
  )
}
