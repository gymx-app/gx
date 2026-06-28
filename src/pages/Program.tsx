import { useState, useEffect } from 'react'
import TopBar from '../components/layout/TopBar'
import { colors } from '../styles/tokens'
import { useAuth } from '../auth/AuthContext'
import { getActiveProgramme } from '../services/programmeService'
import GenerateProgrammeView, {
  type GenerateResult,
} from '../features/programme/GenerateProgrammeView'
import ProgrammePreview from '../features/programme/ProgrammePreview'
import { Loader2 } from 'lucide-react'

type TabState = 'loading' | 'no_programme' | 'has_programme'

export default function Program() {
  const { user } = useAuth()
  const [tabState, setTabState] = useState<TabState>('loading')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activeProgramme, setActiveProgramme] = useState<any>(null)
  const [previewResult, setPreviewResult] = useState<GenerateResult | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    const check = async () => {
      const { data } = await getActiveProgramme(user.id)
      if (cancelled) return
      if (data) {
        setActiveProgramme(data)
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

  // ── Has programme (existing render — preserved intact) ──
  return (
    <>
      <TopBar title="PROGRAMME" />
      <div className="flex-1 overflow-y-auto pb-8 flex flex-col items-center justify-center px-6">
        <div
          className="w-full max-w-[320px] p-8 text-center"
          style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '16px',
          }}
        >
          <p className="text-[40px] mb-3">📋</p>
          <h2 className="font-['Bebas_Neue'] text-[22px] tracking-[2px] text-[#f0ede8] mb-2">
            {activeProgramme?.name ?? 'PROGRAMME'}
          </h2>
          <p className="text-[13px] text-[#666666] leading-[1.6]">
            View your training phases, exercise rotations, and programme structure.
          </p>
        </div>
      </div>
    </>
  )
}
