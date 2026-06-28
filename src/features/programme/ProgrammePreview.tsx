import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useSaveProgramme } from '../../hooks/useSaveProgramme'
import { colors } from '../../styles/tokens'
import { ChevronRight, ChevronDown } from 'lucide-react'
import type { GenerateResult } from './GenerateProgrammeView'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = any

interface ProgrammePreviewProps {
  result: GenerateResult
  onRegenerate: () => void
}

export default function ProgrammePreview({ result, onRegenerate }: ProgrammePreviewProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { save, saving, error: saveError } = useSaveProgramme()

  const odinResult = result.odinResult as AnyData
  // V2 response: odinResult.programme.phases
  const programme: AnyData = odinResult?.programme ?? {}
  const phases: AnyData[] = programme?.phases ?? []
  const programmeName: string = programme?.programme?.name ?? programme?.name ?? 'Your Programme'
  const summary: string =
    odinResult?.rationale?.combined?.[0] ?? programme?.programme?.goal_description ?? ''
  const subtitle = summary.length > 120 ? summary.slice(0, 120) + '…' : summary

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
    const { success } = await save({
      odinResult: result.odinResult as Record<string, unknown>,
      userId: user.id,
      goal: result.goal,
      equipment: result.equipment,
      startDate: result.startDate,
    })
    if (success) {
      void navigate('/', { replace: true })
    }
  }, [user, result, save, navigate])

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: colors.bg, zIndex: 50 }}>
      {/* ── Header ── */}
      <div
        className="flex-shrink-0 px-4 pt-[env(safe-area-inset-top,0px)] pb-3"
        style={{ background: colors.bg, borderBottom: `1px solid ${colors.border}` }}
      >
        <div className="pt-3">
          <h1 className="font-['Bebas_Neue'] text-[24px] tracking-[2px] text-white uppercase">
            {programmeName}
          </h1>
          {subtitle && (
            <p className="text-[12px] font-['DM_Sans'] text-[#999] mt-1 line-clamp-2">{subtitle}</p>
          )}
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto pb-[120px]">
        {phases.length === 0 && (
          <p className="px-4 pt-8 text-[12px] font-['DM_Sans'] text-[#666]">No data</p>
        )}

        {phases.map((phase: AnyData, pi: number) => (
          <div key={pi}>
            {/* Phase row */}
            <button
              onClick={() => togglePhase(pi)}
              className="w-full flex items-center justify-between py-3 px-4 active:opacity-70"
              style={{
                background: 'none',
                border: 'none',
                borderBottom: `1px solid ${colors.border}`,
                cursor: 'pointer',
              }}
            >
              <div className="flex items-baseline gap-2 text-left">
                <span className="font-['Bebas_Neue'] text-[18px] text-white">
                  {phase.name ?? `Phase ${pi + 1}`}
                </span>
                {phase.weeks_count != null && (
                  <span className="text-[13px] font-['DM_Sans'] text-[#888]">
                    ({phase.weeks_count} weeks)
                  </span>
                )}
              </div>
              {openPhase === pi ? (
                <ChevronDown size={18} color="#888" />
              ) : (
                <ChevronRight size={18} color="#888" />
              )}
            </button>

            {openPhase === pi && (
              <div>
                {(!phase.weeks || phase.weeks.length === 0) && (
                  <p className="pl-8 py-2 text-[12px] font-['DM_Sans'] text-[#666]">No data</p>
                )}
                {(phase.weeks ?? []).map((week: AnyData, wi: number) => (
                  <div key={wi}>
                    {/* Week row */}
                    <button
                      onClick={() => toggleWeek(wi)}
                      className="w-full flex items-center justify-between py-2.5 pl-8 pr-4 active:opacity-70"
                      style={{
                        background: 'none',
                        border: 'none',
                        borderBottom: `1px solid #1a1a1a`,
                        cursor: 'pointer',
                      }}
                    >
                      <span className="text-[14px] font-['DM_Sans'] text-[#ddd] text-left">
                        Week {week.week_number ?? wi + 1}
                        {week.week_type ? ` — ${week.week_type}` : ''}
                      </span>
                      {openWeek === wi ? (
                        <ChevronDown size={16} color="#888" />
                      ) : (
                        <ChevronRight size={16} color="#888" />
                      )}
                    </button>

                    {openWeek === wi && (
                      <div>
                        {(!week.days || week.days.length === 0) && (
                          <p className="pl-12 py-2 text-[12px] font-['DM_Sans'] text-[#666]">
                            No data
                          </p>
                        )}
                        {(week.days ?? []).map((day: AnyData, di: number) => (
                          <div key={di}>
                            {/* Day row */}
                            <button
                              onClick={() => toggleDay(di)}
                              className="w-full flex items-center justify-between py-2.5 pl-12 pr-4 active:opacity-70"
                              style={{
                                background: 'none',
                                border: 'none',
                                borderBottom: `1px solid #1a1a1a`,
                                cursor: 'pointer',
                              }}
                            >
                              <span className="text-[14px] font-['DM_Sans'] text-[#ccc] text-left">
                                {day.title ?? day.day_type ?? `Day ${di + 1}`}
                                {day.day_of_week ? ` — ${day.day_of_week}` : ''}
                              </span>
                              {openDay === di ? (
                                <ChevronDown size={16} color="#888" />
                              ) : (
                                <ChevronRight size={16} color="#888" />
                              )}
                            </button>

                            {openDay === di && (
                              <div>
                                {(!day.exercises || day.exercises.length === 0) && (
                                  <p className="pl-16 py-2 text-[12px] font-['DM_Sans'] text-[#666]">
                                    Rest day
                                  </p>
                                )}
                                {(day.exercises ?? []).map((ex: AnyData, ei: number) => {
                                  const firstSet = ex.sets?.[0]
                                  const details: string[] = []
                                  if (ex.sets?.length)
                                    details.push(
                                      `${ex.sets.length}×${firstSet?.target_reps ?? '?'}`
                                    )
                                  if (firstSet?.target_rpe != null)
                                    details.push(`RPE ${firstSet.target_rpe}`)
                                  if (firstSet?.rest_seconds != null)
                                    details.push(`${firstSet.rest_seconds}s rest`)

                                  return (
                                    <div
                                      key={ei}
                                      className="pl-16 pr-4 py-2"
                                      style={{ borderBottom: `1px solid #111` }}
                                    >
                                      <p className="text-[14px] font-['DM_Sans'] font-medium text-white">
                                        {ex.exercise_name}
                                      </p>
                                      {details.length > 0 && (
                                        <p className="text-[12px] font-['DM_Sans'] text-[#888] mt-0.5">
                                          {details.join(' · ')}
                                        </p>
                                      )}
                                      {ex.coaching_cues?.[0] && (
                                        <p className="text-[12px] font-['DM_Sans'] text-[#666] italic mt-0.5">
                                          {ex.coaching_cues[0]}
                                        </p>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Footer ── */}
      <div
        className="flex-shrink-0 flex gap-3 p-4"
        style={{
          background: '#0c0c0c',
          borderTop: `1px solid ${colors.border}`,
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <button
          onClick={onRegenerate}
          disabled={saving}
          className="py-3 text-[14px] font-['DM_Sans'] font-medium active:opacity-60"
          style={{
            width: '40%',
            borderRadius: 12,
            border: '1px solid #555',
            background: 'none',
            color: '#ccc',
            cursor: saving ? 'default' : 'pointer',
            opacity: saving ? 0.4 : 1,
          }}
        >
          Regenerate
        </button>
        <button
          onClick={() => void handleActivate()}
          disabled={saving || !user}
          className="py-3 text-[14px] font-['DM_Sans'] font-bold active:scale-[0.98] transition-transform"
          style={{
            width: '60%',
            borderRadius: 12,
            border: 'none',
            background: '#fff',
            color: '#000',
            cursor: saving ? 'default' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving…' : 'ACTIVATE PROGRAMME'}
        </button>
      </div>

      {saveError && (
        <div
          className="absolute left-4 right-4 p-3 text-[13px] font-['DM_Sans']"
          style={{
            bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
            background: 'rgba(239,68,68,0.15)',
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
