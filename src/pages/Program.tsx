import { useState, useEffect } from 'react'
import TopBar from '../components/layout/TopBar'
import { colors, radius } from '../styles/tokens'
import { useAuth } from '../auth/AuthContext'
import { getActiveProgramme, getProgrammePhases } from '../services/programmeService'
import GenerateProgrammeView, {
  type GenerateResult,
} from '../features/programme/GenerateProgrammeView'
import ProgrammePreview from '../features/programme/ProgrammePreview'
import { Loader2, ChevronRight } from 'lucide-react'

type TabState = 'loading' | 'no_programme' | 'has_programme'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = any

export default function Program() {
  const { user } = useAuth()
  const [tabState, setTabState] = useState<TabState>('loading')
  const [activeProgramme, setActiveProgramme] = useState<AnyData>(null)
  const [phases, setPhases] = useState<AnyData[]>([])
  const [previewResult, setPreviewResult] = useState<GenerateResult | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    const check = async () => {
      const { data } = await getActiveProgramme(user.id)
      if (cancelled) return
      if (data) {
        setActiveProgramme(data)
        const { data: phaseData } = await getProgrammePhases((data as AnyData).id)
        if (!cancelled) setPhases(phaseData ?? [])
        setTabState('has_programme')
      } else {
        setTabState('no_programme')
      }
    }

    void check()
    return () => {
      cancelled = true
    }
  }, [user])

  // ── Loading ──
  if (tabState === 'loading') {
    return (
      <>
        <TopBar title="PROGRAMME" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={32} color={colors.accent} className="animate-spin" />
        </div>
      </>
    )
  }

  // ── No programme: generate or preview ──
  if (tabState === 'no_programme') {
    if (previewResult) {
      return (
        <>
          <TopBar title="PROGRAMME" />
          <ProgrammePreview result={previewResult} onRegenerate={() => setPreviewResult(null)} />
        </>
      )
    }

    return (
      <>
        <TopBar title="PROGRAMME" />
        <GenerateProgrammeView onSuccess={(result) => setPreviewResult(result)} />
      </>
    )
  }

  // ── Has programme ──
  const totalWeeks = phases.reduce((s: number, p: AnyData) => s + (p.weeks_count ?? 0), 0)

  const PHASE_ACCENT: Record<string, string> = {
    foundation: colors.blue,
    accumulation: colors.orange,
    intensification: colors.accent,
    realization: colors.purple,
    recovery: colors.success,
    maintenance: colors.muted,
  }

  function phaseColor(phase: AnyData): string {
    const t = (phase.name ?? '').toLowerCase()
    for (const [key, val] of Object.entries(PHASE_ACCENT)) {
      if (t.includes(key)) return val
    }
    return colors.accent
  }

  return (
    <>
      <TopBar title="PROGRAMME" />
      <div className="flex-1 overflow-y-auto pb-8 px-4 pt-4">
        {/* Programme header */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
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
          <h1
            className="font-['Bebas_Neue'] text-[26px] tracking-[2px] leading-none"
            style={{ color: colors.text }}
          >
            {activeProgramme?.name ?? 'My Programme'}
          </h1>
        </div>

        {/* Phase list */}
        <div className="space-y-3">
          {phases.map((phase: AnyData, pi: number) => {
            const accent = phaseColor(phase)
            return (
              <div
                key={pi}
                className="flex items-center gap-3 p-4"
                style={{
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.card,
                }}
              >
                <div
                  className="flex-shrink-0 w-9 h-9 flex items-center justify-center"
                  style={{ background: `${accent}22`, borderRadius: '50%' }}
                >
                  <span className="font-['Bebas_Neue'] text-[15px]" style={{ color: accent }}>
                    {pi + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-['Bebas_Neue'] text-[16px] tracking-[1px] leading-none"
                    style={{ color: colors.text }}
                  >
                    {phase.name ?? `Phase ${pi + 1}`}
                  </p>
                  {phase.goal && (
                    <p
                      className="text-[12px] font-['DM_Sans'] mt-0.5 truncate"
                      style={{ color: colors.muted }}
                    >
                      {phase.goal}
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
                  <ChevronRight size={16} color={colors.muted} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
