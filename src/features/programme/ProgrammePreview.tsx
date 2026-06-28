import { useState, useCallback } from 'react'
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
  const data = odinResult?.data
  const programme = data?.programme
  const phases: AnyData[] = programme?.phases ?? []

  const rationale: string = data?.generation?.rationale ?? programme?.summary ?? ''
  const subtitle = rationale.length > 120 ? rationale.slice(0, 120) + '…' : rationale

  // Accordion state — only one open at each level
  const [openPhase, setOpenPhase] = useState<number | null>(null)
  const [openWeek, setOpenWeek] = useState<number | null>(null)
  const [openSession, setOpenSession] = useState<number | null>(null)

  const togglePhase = useCallback((i: number) => {
    setOpenPhase((prev) => (prev === i ? null : i))
    setOpenWeek(null)
    setOpenSession(null)
  }, [])

  const toggleWeek = useCallback((i: number) => {
    setOpenWeek((prev) => (prev === i ? null : i))
    setOpenSession(null)
  }, [])

  const toggleSession = useCallback((i: number) => {
    setOpenSession((prev) => (prev === i ? null : i))
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
            YOUR PROGRAMME
          </h1>
          {subtitle && (
            <p className="text-[12px] font-['DM_Sans'] text-[#999] mt-1 line-clamp-2">{subtitle}</p>
          )}
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto pb-[120px]">
        {programme?.name && (
          <p className="px-4 pt-4 pb-2 text-[14px] font-['DM_Sans'] text-[#ccc]">
            {programme.name}
          </p>
        )}

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
                {phase.duration_weeks != null && (
                  <span className="text-[13px] font-['DM_Sans'] text-[#888]">
                    ({phase.duration_weeks} weeks)
                  </span>
                )}
              </div>
              {openPhase === pi ? (
                <ChevronDown size={18} color="#888" />
              ) : (
                <ChevronRight size={18} color="#888" />
              )}
            </button>

            {/* Weeks inside open phase */}
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

                    {/* Sessions inside open week */}
                    {openWeek === wi && (
                      <div>
                        {(!week.sessions || week.sessions.length === 0) && (
                          <p className="pl-12 py-2 text-[12px] font-['DM_Sans'] text-[#666]">
                            No data
                          </p>
                        )}
                        {(week.sessions ?? []).map((session: AnyData, si: number) => (
                          <div key={si}>
                            {/* Session row */}
                            <button
                              onClick={() => toggleSession(si)}
                              className="w-full flex items-center justify-between py-2.5 pl-12 pr-4 active:opacity-70"
                              style={{
                                background: 'none',
                                border: 'none',
                                borderBottom: `1px solid #1a1a1a`,
                                cursor: 'pointer',
                              }}
                            >
                              <span className="text-[14px] font-['DM_Sans'] text-[#ccc] text-left">
                                {session.day_label ?? `Day ${si + 1}`}
                                {session.session_type ? ` — ${session.session_type}` : ''}
                              </span>
                              {openSession === si ? (
                                <ChevronDown size={16} color="#888" />
                              ) : (
                                <ChevronRight size={16} color="#888" />
                              )}
                            </button>

                            {/* Exercises inside open session */}
                            {openSession === si && (
                              <div>
                                {(!session.exercises || session.exercises.length === 0) && (
                                  <p className="pl-16 py-2 text-[12px] font-['DM_Sans'] text-[#666]">
                                    No data
                                  </p>
                                )}
                                {(session.exercises ?? []).map((ex: AnyData, ei: number) => {
                                  const details: string[] = []
                                  if (ex.sets != null && ex.reps != null)
                                    details.push(`${ex.sets}×${ex.reps}`)
                                  else if (ex.sets != null) details.push(`${ex.sets} sets`)
                                  if (ex.rpe != null) details.push(`RPE ${ex.rpe}`)
                                  if (ex.rest_seconds != null)
                                    details.push(`${ex.rest_seconds}s rest`)

                                  return (
                                    <div
                                      key={ei}
                                      className="pl-16 pr-4 py-2"
                                      style={{ borderBottom: `1px solid #111` }}
                                    >
                                      <p className="text-[14px] font-['DM_Sans'] font-medium text-white">
                                        {ex.name}
                                      </p>
                                      {details.length > 0 && (
                                        <p className="text-[12px] font-['DM_Sans'] text-[#888] mt-0.5">
                                          {details.join(' · ')}
                                        </p>
                                      )}
                                      {ex.notes && (
                                        <p className="text-[12px] font-['DM_Sans'] text-[#666] italic mt-0.5">
                                          {ex.notes}
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

      {/* Save error */}
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
