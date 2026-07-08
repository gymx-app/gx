import { useEffect, useState } from 'react'
import { colors, radius } from '../../styles/tokens'
import BottomSheet from '../ui/BottomSheet'
import Skeleton from '../ui/Skeleton'
import { useAthleteOdinPayload } from '../../hooks/useAthleteOdinPayload'
import { useOdinSwap, MAX_ATTEMPTS, type SwapOption } from '../../hooks/useOdinSwap'
import { humanizeSwapReasons, getSharedRationale } from '../../utils/swapReasons'
import { Loader2, AlertTriangle, ChevronRight, Info, X } from 'lucide-react'

export interface SwapTarget {
  exerciseId: string
  exerciseName: string
  substitutionOptions: { approved_exercise_ids: string[] } | null
  // programme_exercises row + its day — needed by the caller to persist the
  // swap and splice the result into local state; the sheet itself never
  // touches Supabase, it only asks the caller to and reports the outcome.
  dayExerciseId: string
  dayId: string
}

interface ConfirmOutcome {
  success: boolean
  error?: string | undefined
}

interface ExerciseSwapSheetProps {
  target: SwapTarget | null
  onClose: () => void
  // Odin's confirm-swap only validates — the caller still has to resolve
  // Odin's exercise id to gx's own UUID, write it, and update local state.
  // The sheet awaits this and only closes on success; on failure it shows
  // the returned message inline and stays open so the user can retry or
  // pick a different option.
  onConfirmed: (chosen: { exercise_id: string; name: string }) => Promise<ConfirmOutcome>
}

type SheetState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'ready'; options: SwapOption[] }

const SWAP_HINT_SEEN_KEY = 'gx_swap_hint_seen'

function OptionSkeletonRow() {
  return (
    <div
      className="w-full flex items-center gap-3 px-4 py-3"
      style={{
        // Skeleton bars render at colors.surface2 (#1c1c1c) — this container
        // must NOT use that same color or the pulse animation has nothing to
        // contrast against and looks static/frozen instead of loading.
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.chip,
      }}
    >
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton width="55%" height={13} />
        <Skeleton width="80%" height={11} />
      </div>
      <Skeleton width={16} height={16} />
    </div>
  )
}

export function ExerciseSwapSheet({ target, onClose, onConfirmed }: ExerciseSwapSheetProps) {
  const {
    payload: athlete,
    loading: loadingAthlete,
    error: athleteError,
  } = useAthleteOdinPayload(target !== null)
  const { getSwapOptions, confirmSwap, confirming, optionsAttempt } = useOdinSwap()

  const [state, setState] = useState<SheetState>({ status: 'loading' })
  const [retryKey, setRetryKey] = useState(0)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  // Odin validation and gx's own persistence write are two separate awaited
  // steps — `confirming` (from useOdinSwap) only covers the first, so the
  // busy/disabled UI needs its own flag spanning both.
  const [persisting, setPersisting] = useState(false)
  const busy = confirming || persisting

  // First-few-times instructional hint — dismissed state persists the same
  // way gx already persists simple client-side flags (see cacheVersion.js):
  // a plain localStorage key, no new state-management pattern.
  const [showHint, setShowHint] = useState(() => {
    try {
      return localStorage.getItem(SWAP_HINT_SEEN_KEY) !== 'true'
    } catch {
      return true
    }
  })

  const dismissHint = () => {
    setShowHint(false)
    try {
      localStorage.setItem(SWAP_HINT_SEEN_KEY, 'true')
    } catch {
      // Private browsing / storage disabled — hint just reappears next time.
    }
  }

  useEffect(() => {
    if (!target) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ status: 'loading' })
    setConfirmError(null)
    setConfirmingId(null)
    setPersisting(false)
  }, [target])

  useEffect(() => {
    if (!target || loadingAthlete) return

    if (athleteError || !athlete) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ status: 'error', message: athleteError ?? 'Could not load your profile.' })
      return
    }

    let cancelled = false
    void (async () => {
      const result = await getSwapOptions(target.exerciseId, target.substitutionOptions, athlete)
      if (cancelled) return
      if (!result.success) {
        setState({ status: 'error', message: result.error })
        return
      }
      setState(
        result.data.options.length === 0
          ? { status: 'empty' }
          : { status: 'ready', options: result.data.options }
      )
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, loadingAthlete, athlete, athleteError, retryKey])

  const retry = () => {
    setState({ status: 'loading' })
    setRetryKey((k) => k + 1)
  }

  const handleSelect = async (option: SwapOption) => {
    if (!target || !athlete) return
    setConfirmError(null)
    setConfirmingId(option.exercise_id)

    const result = await confirmSwap(target.exerciseId, option.exercise_id, athlete)
    if (!result.success) {
      // Structured Odin error (SUBSTITUTION_GROUP_INVALID / SUBSTITUTE_EXERCISE_EXCLUDED)
      // shown inline — not a generic toast — so the user knows exactly why
      // this specific option didn't work.
      setConfirmError(result.error)
      setConfirmingId(null)
      return
    }

    setPersisting(true)
    const outcome = await onConfirmed({
      exercise_id: result.data.chosen_alternative.exercise_id,
      name: result.data.chosen_alternative.name,
    })
    setPersisting(false)

    if (!outcome.success) {
      setConfirmError(outcome.error ?? 'Could not save the swap. Please try again.')
      setConfirmingId(null)
      return
    }

    onClose()
  }

  const optionRationales =
    state.status === 'ready'
      ? state.options.map((o) => humanizeSwapReasons(o.reasons).join(' · '))
      : []
  const sharedRationale = getSharedRationale(optionRationales)

  return (
    <BottomSheet isOpen={target !== null} onClose={onClose} height="75vh">
      <div className="px-5 pb-8 pt-2 flex-1 overflow-y-auto">
        <p
          className="text-[11px] font-['DM_Sans'] font-bold tracking-[1.5px] uppercase"
          style={{ color: colors.muted }}
        >
          Swap Exercise
        </p>
        <p
          className="font-['Bebas_Neue'] text-[20px] tracking-[1px] leading-none mt-1 mb-4"
          style={{ color: colors.text }}
        >
          {target?.exerciseName}
        </p>

        {showHint && (
          <div
            className="flex items-start gap-2 mb-4 px-3 py-2.5"
            style={{
              background: `${colors.blue}14`,
              border: `1px solid ${colors.blue}40`,
              borderRadius: 8,
            }}
          >
            <Info size={15} color={colors.blue} className="flex-shrink-0 mt-0.5" />
            <p
              className="flex-1 text-[12px] font-['DM_Sans']"
              style={{ color: colors.textSecondary }}
            >
              Pick a similar exercise to replace this one in your plan.
            </p>
            <button
              onClick={dismissHint}
              className="flex-shrink-0 active:opacity-60"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
              aria-label="Dismiss hint"
            >
              <X size={14} color={colors.muted} />
            </button>
          </div>
        )}

        {confirmError && (
          <div
            className="flex items-start gap-2 mb-4 px-3 py-2.5"
            style={{
              background: `${colors.error}18`,
              border: `1px solid ${colors.error}44`,
              borderRadius: 8,
            }}
          >
            <AlertTriangle size={15} color={colors.error} className="flex-shrink-0 mt-0.5" />
            <p className="text-[12px] font-['DM_Sans']" style={{ color: colors.error }}>
              {confirmError}
            </p>
          </div>
        )}

        {(state.status === 'loading' || loadingAthlete) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Loader2 size={14} className="animate-spin flex-shrink-0" color={colors.muted} />
              <p className="text-[12px] font-['DM_Sans']" style={{ color: colors.muted }}>
                {optionsAttempt > 1
                  ? `Retrying… (${optionsAttempt}/${MAX_ATTEMPTS})`
                  : 'Finding alternatives…'}
              </p>
            </div>
            <OptionSkeletonRow />
            <OptionSkeletonRow />
            <OptionSkeletonRow />
          </div>
        )}

        {state.status === 'error' && (
          <div className="py-6 text-center">
            <p className="text-[13px] font-['DM_Sans']" style={{ color: colors.muted }}>
              {state.message}
            </p>
            <button
              onClick={retry}
              className="text-[13px] font-['DM_Sans'] font-semibold mt-2 active:opacity-60"
              style={{
                color: colors.accent,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {state.status === 'empty' && (
          <p
            className="text-[13px] font-['DM_Sans'] py-6 text-center"
            style={{ color: colors.muted }}
          >
            No suitable alternatives found for this exercise right now.
          </p>
        )}

        {state.status === 'ready' && (
          <>
            {/* When every option collapses to the same rationale (common —
                options are frequently all from the same substitution_group),
                repeating it on every card is redundant. Show it once, above
                the list, and drop the per-card sublines for that case only. */}
            {sharedRationale && (
              <p
                className="text-[12px] font-['DM_Sans'] mb-3"
                style={{ color: colors.textSecondary }}
              >
                {sharedRationale}
              </p>
            )}
            <div className="space-y-2">
              {state.options.map((option, i) => {
                const isConfirmingThis = busy && confirmingId === option.exercise_id
                const rationale = sharedRationale ? null : optionRationales[i]
                return (
                  <button
                    key={option.exercise_id}
                    onClick={() => void handleSelect(option)}
                    disabled={busy}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left active:opacity-70"
                    style={{
                      background: colors.surface2,
                      border: `1px solid ${colors.border}`,
                      borderRadius: radius.chip,
                      cursor: busy ? 'default' : 'pointer',
                      opacity: busy && !isConfirmingThis ? 0.5 : 1,
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[13px] font-['DM_Sans'] font-semibold truncate"
                        style={{ color: colors.text }}
                      >
                        {option.name}
                      </p>
                      {rationale && (
                        <p
                          className="text-[11px] font-['DM_Sans'] mt-0.5 truncate"
                          style={{ color: colors.muted }}
                        >
                          {rationale}
                        </p>
                      )}
                    </div>
                    {isConfirmingThis ? (
                      <Loader2
                        size={16}
                        color={colors.accent}
                        className="animate-spin flex-shrink-0"
                      />
                    ) : (
                      <ChevronRight size={16} color={colors.muted} className="flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  )
}
