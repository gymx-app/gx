import { useState, useEffect, useMemo, memo } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { upsertChecklistLog } from '../../services/checklistService'
import { supabase } from '../../lib/supabase'
import { Text, Button, SectionLabel } from '../ui'
import { mapConditioningTypeLabel } from '../../utils/odinMappers'
import { colors, radius } from '../../styles/tokens'
import useOptimisticUpdate from '../../hooks/useOptimisticUpdate'
import * as idbCache from '../../services/idbCache'

interface ConditioningIntervals {
  work_duration_s: number
  rest_duration_s: number
  rounds: number
}

export interface ConditioningItem {
  id?: string
  conditioning_id: string | null
  activity_id: string
  activity_name: string
  conditioning_type: string
  purpose: string | null
  duration_min: number
  target_rpe: number | null
  heart_rate_zone: number | null
  intensity_description: string | null
  intervals: ConditioningIntervals | null
  fatigue_cost?: string | null
  rationale: string | null
}

interface EquipmentConfig {
  options: string[]
  default: string
}

const EQUIPMENT_BY_ACTIVITY: Record<string, EquipmentConfig> = {
  stationary_bike: { options: ['Bike', 'Rowing', 'Elliptical', 'Treadmill'], default: 'Bike' },
  rowing: { options: ['Rowing', 'Bike', 'Elliptical'], default: 'Rowing' },
  incline_walking: { options: ['Treadmill', 'Stairmaster', 'Walking'], default: 'Treadmill' },
  walking: { options: ['Treadmill', 'Stairmaster', 'Walking'], default: 'Treadmill' },
  running: { options: ['Treadmill', 'Running Track'], default: 'Treadmill' },
  elliptical: { options: ['Elliptical'], default: 'Elliptical' },
  stair_machine: { options: ['Stairmaster'], default: 'Stairmaster' },
  swimming: { options: ['Swimming'], default: 'Swimming' },
  assault_bike: { options: ['Assault Bike'], default: 'Assault Bike' },
}

const ALL_EQUIPMENT_OPTIONS = [
  'Treadmill',
  'Bike',
  'Rowing',
  'Elliptical',
  'Stairmaster',
  'Walking',
  'Running Track',
  'Swimming',
  'Assault Bike',
]

const DISTANCE_ACTIVITIES = new Set(['running', 'walking', 'rowing', 'swimming'])

const RPE_OPTIONS = [5, 6, 7, 8, 9]

interface LoggedNotes {
  equipment: string
  actual_duration_min: number
  actual_rpe: number
  distance_km: number | null
  rounds_completed: number | null
  notes: string
}

interface ConditioningDayProps {
  dayData?: { title?: string | null; subtitle?: string | null } | null
  conditioningItems: ConditioningItem[]
  date: string
  userId: string
  isFuture?: boolean
}

const ConditioningDay = memo(function ConditioningDay({
  conditioningItems,
  date,
  userId,
  isFuture = false,
}: ConditioningDayProps) {
  useAuth()
  const { execute } = useOptimisticUpdate()

  const item = conditioningItems?.[0] ?? null
  const itemKey = item?.conditioning_id ?? item?.activity_id ?? 'conditioning'

  const equipmentConfig = useMemo(
    () => (item ? (EQUIPMENT_BY_ACTIVITY[item.activity_id] ?? null) : null),
    [item]
  )
  const equipmentOptions = equipmentConfig?.options ?? ALL_EQUIPMENT_OPTIONS

  const showDistance = item ? DISTANCE_ACTIVITIES.has(item.activity_id) : false

  const [selectedEquipment, setSelectedEquipment] = useState(equipmentConfig?.default ?? '')
  const [actualDuration, setActualDuration] = useState(
    item?.duration_min ? String(item.duration_min) : ''
  )
  const [actualRpe, setActualRpe] = useState<number | null>(item?.target_rpe ?? null)
  const [distance, setDistance] = useState('')
  const [distanceUnit, setDistanceUnit] = useState<'km' | 'miles'>('km')
  const [roundsCompleted, setRoundsCompleted] = useState(0)
  const [notes, setNotes] = useState('')
  const [showRationale, setShowRationale] = useState(false)

  const [isLogged, setIsLogged] = useState(false)
  const [loggedSummary, setLoggedSummary] = useState<LoggedNotes | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function checkExisting() {
      const { data } = await supabase
        .from('checklist_logs')
        .select('notes, completed')
        .eq('user_id', userId)
        .eq('date', date)
        .eq('item_type', 'conditioning')
        .eq('item_key', itemKey)
        .maybeSingle()

      if (cancelled || !data?.completed) return
      setIsLogged(true)
      try {
        setLoggedSummary(JSON.parse(data.notes ?? '{}'))
      } catch {
        /* ignore parse errors */
      }
    }
    void checkExisting()
    return () => {
      cancelled = true
    }
  }, [userId, date, itemKey])

  if (!item) return null

  const hasDuration = parseFloat(actualDuration) > 0
  const canComplete = !!selectedEquipment && hasDuration && actualRpe != null

  function handleComplete() {
    if (!canComplete || !item) return
    setSubmitError(null)

    const payload: LoggedNotes = {
      equipment: selectedEquipment,
      actual_duration_min: parseFloat(actualDuration),
      actual_rpe: actualRpe,
      distance_km: distance
        ? distanceUnit === 'miles'
          ? parseFloat(distance) * 1.60934
          : parseFloat(distance)
        : null,
      rounds_completed: item.intervals ? roundsCompleted : null,
      notes,
    }
    const notesStr = JSON.stringify(payload)

    void execute({
      optimisticUpdate: () => {
        setIsLogged(true)
        setLoggedSummary(payload)
        if (navigator.vibrate) navigator.vibrate(50)
      },
      idbWrite: async () => {
        await idbCache.invalidate('workout-data', `${userId}_${date}`)
      },
      supabaseWrite: async () => {
        const { error } = await upsertChecklistLog(userId, {
          date,
          item_type: 'conditioning',
          item_key: itemKey,
          completed: true,
          notes: notesStr,
        })
        if (error) throw new Error(error)
      },
      rollback: () => {
        setIsLogged(false)
        setLoggedSummary(null)
        setSubmitError('Failed to save — tap to retry')
      },
      syncKey: `conditioning_${date}_${itemKey}`,
    })
  }

  return (
    <div className="pt-2.5">
      <Text variant="pageTitle" as="h1" className="!text-[26px]">
        {item.activity_name}
      </Text>
      <Text variant="bodyMuted" className="mt-0.5">
        {mapConditioningTypeLabel(item.conditioning_type)}
      </Text>
      {item.purpose && <p className="text-[12px] text-muted italic mt-1">{item.purpose}</p>}

      <div className="grid grid-cols-3 gap-2 mt-4">
        <div
          className="flex flex-col items-center py-3"
          style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.card,
          }}
        >
          <span className="font-['Bebas_Neue'] text-[22px] text-text">{item.duration_min}</span>
          <span className="text-[9px] font-bold tracking-[0.1em] uppercase text-muted mt-1">
            Duration (min)
          </span>
        </div>
        <div
          className="flex flex-col items-center py-3"
          style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.card,
          }}
        >
          <span className="font-['Bebas_Neue'] text-[22px] text-accent">
            {item.target_rpe ?? '—'}
          </span>
          <span className="text-[9px] font-bold tracking-[0.1em] uppercase text-muted mt-1">
            Effort level
          </span>
        </div>
        <div
          className="flex flex-col items-center py-3"
          style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.card,
          }}
        >
          <span className="font-['Bebas_Neue'] text-[22px] text-text">
            {item.heart_rate_zone ?? '—'}
          </span>
          <span className="text-[9px] font-bold tracking-[0.1em] uppercase text-muted mt-1">
            Heart rate zone
          </span>
        </div>
      </div>

      {item.intervals && (
        <p className="text-[13px] text-text-secondary mt-3">
          {item.intervals.rounds} rounds · {item.intervals.work_duration_s}s on ·{' '}
          {item.intervals.rest_duration_s}s off
        </p>
      )}

      {item.intensity_description && (
        <Text variant="bodyMuted" className="mt-2">
          {item.intensity_description}
        </Text>
      )}

      {item.rationale && (
        <div className="mt-3">
          <button
            onClick={() => setShowRationale((v) => !v)}
            className="text-[11px] font-bold tracking-[0.08em] uppercase text-muted"
          >
            {showRationale ? '▾' : '▸'} Why this session?
          </button>
          {showRationale && (
            <p className="text-[13px] text-text-secondary leading-[1.6] mt-2">{item.rationale}</p>
          )}
        </div>
      )}

      {!isFuture && !isLogged && (
        <>
          <div className="mt-5">
            <SectionLabel label="Equipment" className="mb-2" />
            <div className="flex flex-wrap gap-2">
              {equipmentOptions.map((eq) => {
                const isActive = selectedEquipment === eq
                return (
                  <button
                    key={eq}
                    onClick={() => setSelectedEquipment(eq)}
                    aria-pressed={isActive}
                    className="px-3 h-11 text-[13px] font-medium transition-all duration-150"
                    style={{
                      borderRadius: radius.pill,
                      ...(isActive
                        ? { background: colors.accent, color: colors.white, border: 'none' }
                        : {
                            background: colors.surface,
                            border: `1.5px solid ${colors.border}`,
                            color: colors.muted,
                          }),
                    }}
                  >
                    {eq}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex gap-2 mt-5">
            <div
              className="flex-1 focus-within:border-accent p-4 flex flex-col items-center transition-colors"
              style={{
                background: colors.surface2,
                border: `1.5px solid ${colors.border}`,
                borderRadius: radius.input,
              }}
            >
              <label className="text-[9px] font-bold tracking-[0.1em] uppercase text-disabled mb-2">
                Actual Duration
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={actualDuration}
                onChange={(e) => setActualDuration(e.target.value)}
                className="w-full bg-transparent text-center text-[24px] font-['Bebas_Neue'] tracking-[1px] text-text focus:outline-none"
                aria-label="Actual duration in minutes"
              />
              <span className="text-[10px] text-placeholder mt-1">min</span>
            </div>
            {showDistance && (
              <div
                className="flex-1 focus-within:border-accent p-4 flex flex-col items-center transition-colors"
                style={{
                  background: colors.surface2,
                  border: `1.5px solid ${colors.border}`,
                  borderRadius: radius.input,
                }}
              >
                <label className="text-[9px] font-bold tracking-[0.1em] uppercase text-disabled mb-2">
                  Distance
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  placeholder="optional"
                  className="w-full bg-transparent text-center text-[24px] font-['Bebas_Neue'] tracking-[1px] text-text placeholder-disabled focus:outline-none"
                  aria-label="Distance"
                />
                <button
                  onClick={() => setDistanceUnit((u) => (u === 'km' ? 'miles' : 'km'))}
                  className="text-[10px] text-muted mt-1"
                >
                  {distanceUnit}
                </button>
              </div>
            )}
          </div>
          <p className="text-[11px] text-disabled mt-1">Adjust if you did more or less</p>

          <div className="mt-5">
            <SectionLabel label="How hard was it?" className="mb-2" />
            <div className="flex gap-2">
              {RPE_OPTIONS.map((rpe) => {
                const isActive = actualRpe === rpe
                return (
                  <button
                    key={rpe}
                    onClick={() => setActualRpe(rpe)}
                    aria-pressed={isActive}
                    className="flex-1 h-12 font-['Bebas_Neue'] text-[18px] transition-all duration-150"
                    style={{
                      borderRadius: radius.buttonSm,
                      ...(isActive
                        ? { background: colors.accent, color: colors.white, border: 'none' }
                        : {
                            background: colors.surface,
                            border: `1.5px solid ${colors.border}`,
                            color: colors.muted,
                          }),
                    }}
                  >
                    {rpe}
                  </button>
                )
              })}
            </div>
          </div>

          {item.intervals && (
            <div className="mt-5">
              <SectionLabel label="Rounds Completed" className="mb-2" />
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setRoundsCompleted((r) => Math.max(0, r - 1))}
                  className="w-11 h-11 text-[20px] font-bold"
                  style={{
                    background: colors.surface,
                    border: `1.5px solid ${colors.border}`,
                    borderRadius: radius.buttonSm,
                    color: colors.text,
                  }}
                >
                  −
                </button>
                <span className="font-['Bebas_Neue'] text-[24px] text-text min-w-[2ch] text-center">
                  {roundsCompleted}
                </span>
                <button
                  onClick={() => setRoundsCompleted((r) => Math.min(item.intervals!.rounds, r + 1))}
                  className="w-11 h-11 text-[20px] font-bold"
                  style={{
                    background: colors.surface,
                    border: `1.5px solid ${colors.border}`,
                    borderRadius: radius.buttonSm,
                    color: colors.text,
                  }}
                >
                  +
                </button>
                <span className="text-[12px] text-muted">of {item.intervals.rounds}</span>
              </div>
            </div>
          )}

          <div className="mt-5">
            <SectionLabel label="Notes" className="mb-2" />
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it feel?"
              className="w-full bg-transparent text-[14px] text-text placeholder-disabled focus:outline-none p-3"
              style={{
                background: colors.surface2,
                border: `1.5px solid ${colors.border}`,
                borderRadius: radius.input,
              }}
            />
          </div>

          {submitError && (
            <Text variant="caption" className="mt-2 text-error">
              {submitError}
            </Text>
          )}

          <div className="mt-6">
            <Button
              variant="primary"
              label="COMPLETE SESSION"
              onPress={handleComplete}
              disabled={!canComplete}
            />
          </div>
        </>
      )}

      {isLogged && loggedSummary && (
        <div className="mt-6 flex flex-col items-center py-6 text-center">
          <CheckCircle2 size={36} color={colors.success} />
          <Text variant="cardTitle" className="mt-2 text-success">
            SESSION COMPLETE
          </Text>
          <Text variant="bodyMuted" className="mt-1">
            {loggedSummary.equipment} · {loggedSummary.actual_duration_min} min · RPE{' '}
            {loggedSummary.actual_rpe}
          </Text>
        </div>
      )}
    </div>
  )
})

export default ConditioningDay
