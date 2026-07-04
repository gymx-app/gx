import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { supabase } from '../../lib/supabase'
import { colors } from '../../styles/tokens'
import { useWizardState } from './useWizardState'
import { buildOdinPayloadFromWizardState } from './buildOdinPayload'
import { useOdinGenerate } from '../../hooks/useOdinGenerate'
import { useSaveProgramme } from '../../hooks/useSaveProgramme'
import type { GenerateResult } from '../programme/GenerateProgrammeView'
import { Screen1Hook } from './screens/Screen1Hook'
import { Screen2Identity } from './screens/Screen2Identity'
import { Screen3BodyBaseline } from './screens/Screen3BodyBaseline'
import { Screen4Capability } from './screens/Screen4Capability'
import { Screen5Commitment } from './screens/Screen5Commitment'
import { Screen6GoalPrecision } from './screens/Screen6GoalPrecision'
import { Screen7Logistics } from './screens/Screen7Logistics'
import { Screen8BaselineStrength } from './screens/Screen8BaselineStrength'
import { Screen9Constraints } from './screens/Screen9Constraints'
import { Screen10ProgrammeProfile } from './screens/Screen10ProgrammeProfile'
import { OdinLoader } from '../../components/OdinLoader'

const GENERATE_TIMEOUT_MS = 90000
const TOTAL_STEPS = 10

export default function OnboardingWizard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const {
    wizardState,
    loadingInitial,
    setField,
    setInbodyData,
    overrideInbodyField,
    advanceStep,
    goToStep,
    resetGeneration,
    setGenerationError,
    markStepSaved,
  } = useWizardState()

  const { generate, reset: resetOdin } = useOdinGenerate()
  const { save: saveProgramme } = useSaveProgramme()

  const [generating, setGenerating] = useState(false)
  const appliedStepParamRef = useRef(false)

  // Backward-compat entry point for the old "goal-only" gate redirect.
  useEffect(() => {
    if (appliedStepParamRef.current || loadingInitial) return
    appliedStepParamRef.current = true
    const stepParam = searchParams.get('step')
    const mode = searchParams.get('mode')
    if (mode === 'complete') goToStep(5)
    else if (stepParam) {
      const n = parseInt(stepParam, 10)
      if (n >= 1 && n <= TOTAL_STEPS) goToStep(n)
    }
  }, [loadingInitial, searchParams, goToStep])

  const handleSaved = useCallback(
    (step: number) => {
      markStepSaved(step)
      advanceStep()
    },
    [markStepSaved, advanceStep]
  )

  // ── Generation orchestration ──
  // Odin success is persisted to `programmes`/`programme_config` immediately
  // (via useSaveProgramme) before we ever navigate, so the generated result
  // can't be silently lost if router state doesn't survive to /program (e.g.
  // an auth event or backgrounding in between). /program then reads the
  // active programme from Supabase; the previewResult handed through router
  // state is only used as an instant-render fallback while that DB read is
  // in flight.
  const runGenerate = useCallback(async () => {
    if (!user) return
    resetGeneration()
    resetOdin()
    setGenerating(true)
    const payload = buildOdinPayloadFromWizardState(wizardState)
    const outcome = await generate(payload, GENERATE_TIMEOUT_MS)
    if (outcome.success) {
      const goal = wizardState.goal ?? 'general_fitness'
      const equipment = wizardState.equipment ?? 'full_gym'
      const startDate = wizardState.start_date

      const { success: saveSuccess, programmeId } = await saveProgramme({
        odinResult: outcome.result as Record<string, unknown>,
        userId: user.id,
        goal,
        equipment,
        startDate,
      })
      if (!saveSuccess) {
        setGenerationError(
          'Your programme was generated but we could not save it. Please try again.',
          'API_ERROR'
        )
        setGenerating(false)
        return
      }

      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ onboarding_completed: true })
        .eq('user_id', user.id)
      if (profileError) {
        setGenerationError(
          'Your programme was generated but we could not save your progress. Please try again.',
          'API_ERROR'
        )
        setGenerating(false)
        return
      }
      const previewResult: GenerateResult = {
        odinResult: outcome.result,
        goal,
        equipment,
        startDate,
        programmeId: programmeId ?? null,
      }
      setGenerating(false)
      void navigate('/program', {
        replace: true,
        state: { previewResult, alreadySaved: true },
      })
    } else {
      setGenerationError(outcome.error ?? 'Generation failed.', outcome.errorType)
      setGenerating(false)
    }
  }, [
    user,
    wizardState,
    generate,
    resetGeneration,
    resetOdin,
    setGenerationError,
    navigate,
    saveProgramme,
  ])

  const handlePregnancySaved = useCallback(() => {
    void navigate('/', { replace: true })
  }, [navigate])

  const handleBack = useCallback(() => {
    const step = wizardState.current_step
    if (step === 9 && wizardState.equipment === 'bodyweight_only') {
      goToStep(7)
    } else {
      goToStep(step - 1)
    }
  }, [wizardState.current_step, wizardState.equipment, goToStep])

  if (!user || loadingInitial) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ background: colors.bg, height: '100dvh' }}
      >
        <Loader2 size={28} color={colors.accent} className="animate-spin" />
      </div>
    )
  }

  const step = wizardState.current_step

  return (
    <div className="flex flex-col" style={{ background: colors.bg, height: '100dvh' }}>
      {step > 1 && (
        <div className="px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <span className="font-['Bebas_Neue'] text-[18px] tracking-[2px] text-[#f0ede8]">
              G<span style={{ color: colors.accent }}>x</span>
            </span>
            <span className="text-[12px] font-['DM_Sans']" style={{ color: colors.muted }}>
              Step {step} of {TOTAL_STEPS}
            </span>
          </div>

          <button
            onClick={handleBack}
            className="flex items-center gap-1 mb-3 active:opacity-60"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <ChevronLeft size={18} color={colors.muted} />
            <span className="text-[13px] font-['DM_Sans']" style={{ color: colors.muted }}>
              Back
            </span>
          </button>

          <div className="h-[2px] rounded-full overflow-hidden bg-zinc-800">
            <div
              className="h-full bg-white transition-all duration-300"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>
      )}

      {generating ? (
        <div className="flex-1">
          <OdinLoader />
        </div>
      ) : (
        <div className={`flex-1 overflow-y-auto pb-32 ${step === 1 ? '' : 'px-5 pt-2'}`}>
          {step === 1 && <Screen1Hook onContinue={advanceStep} />}
          {step === 2 && (
            <Screen2Identity
              wizardState={wizardState}
              setField={setField}
              userId={user.id}
              onSaved={handleSaved}
            />
          )}
          {step === 3 && (
            <Screen3BodyBaseline
              wizardState={wizardState}
              setField={setField}
              setInbodyData={setInbodyData}
              overrideInbodyField={overrideInbodyField}
              userId={user.id}
              onSaved={handleSaved}
            />
          )}
          {step === 4 && (
            <Screen4Capability
              wizardState={wizardState}
              setField={setField}
              userId={user.id}
              onSaved={handleSaved}
            />
          )}
          {step === 5 && (
            <Screen5Commitment
              wizardState={wizardState}
              setField={setField}
              onContinue={advanceStep}
            />
          )}
          {step === 6 && (
            <Screen6GoalPrecision
              wizardState={wizardState}
              setField={setField}
              onContinue={advanceStep}
            />
          )}
          {step === 7 && (
            <Screen7Logistics
              wizardState={wizardState}
              setField={setField}
              goToStep={goToStep}
              onContinue={advanceStep}
            />
          )}
          {step === 8 && (
            <Screen8BaselineStrength
              wizardState={wizardState}
              setField={setField}
              onContinue={advanceStep}
            />
          )}
          {step === 9 && (
            <Screen9Constraints
              wizardState={wizardState}
              setField={setField}
              userId={user.id}
              onSaved={handleSaved}
              onPregnancySaved={handlePregnancySaved}
            />
          )}
          {step === 10 && (
            <Screen10ProgrammeProfile
              wizardState={wizardState}
              setField={setField}
              goToStep={goToStep}
              onGenerate={() => void runGenerate()}
            />
          )}
        </div>
      )}
    </div>
  )
}
