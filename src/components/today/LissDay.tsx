import { useState, useEffect, useMemo, memo } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { upsertChecklistLog } from '../../services/checklistService'
import { supabase } from '../../lib/supabase'
import { Text, Button, Badge, SectionLabel } from '../ui'
import CooldownSection from './CooldownSection'
import { colors, radius } from '../../styles/tokens'
import useOptimisticUpdate from '../../hooks/useOptimisticUpdate'
import * as idbCache from '../../services/idbCache'

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

interface EquipmentConfig {
  label: string
  icon: string
  inputs: string[]
  units: Record<string, string>
  placeholders: Record<string, string>
  instructions: string[]
}

const EQUIPMENT_CONFIG: Record<string, EquipmentConfig> = {
  treadmill: {
    label: 'Treadmill',
    icon: '🏃',
    inputs: ['incline', 'speed', 'duration'],
    units: { incline: '%', speed: 'km/h', duration: 'min' },
    placeholders: { incline: '6', speed: '5.5', duration: '45' },
    instructions: [
      'Incline 5–7%, Speed 5.5–6.5 km/h',
      'HR target: 120–140 bpm — conversational pace',
      'Fat-burning zone — not punishment',
      'Build speed 0.5 km/h every 2 weeks',
    ],
  },
  crosstrainer: {
    label: 'Cross Trainer',
    icon: '🔄',
    inputs: ['resistance', 'duration'],
    units: { resistance: 'lvl', duration: 'min' },
    placeholders: { resistance: '7', duration: '45' },
    instructions: [
      'Resistance level 6–8',
      'HR target: 120–140 bpm — conversational pace',
      'Full stride, upright posture',
      'Easy on knees — good treadmill alternative',
    ],
  },
  bike: {
    label: 'Stationary Bike',
    icon: '🚴',
    inputs: ['resistance', 'rpm', 'duration'],
    units: { resistance: 'lvl', rpm: 'rpm', duration: 'min' },
    placeholders: { resistance: '10', rpm: '80', duration: '45' },
    instructions: [
      'Resistance 8–12, RPM 70–90',
      'HR target: 120–140 bpm',
      'Seat height — knee slightly bent at bottom of stroke',
      'Steady cadence throughout',
    ],
  },
  rowing: {
    label: 'Rowing Machine',
    icon: '🚣',
    inputs: ['resistance', 'duration'],
    units: { resistance: 'lvl', duration: 'min' },
    placeholders: { resistance: '5', duration: '35' },
    instructions: [
      'Damper setting 4–6',
      'HR target: 120–140 bpm',
      'Drive with legs first — not arms',
      'Sustainable pace throughout — 30–40 min',
    ],
  },
  stairmaster: {
    label: 'Stairmaster',
    icon: '🪜',
    inputs: ['level', 'duration'],
    units: { level: 'lvl', duration: 'min' },
    placeholders: { level: '7', duration: '35' },
    instructions: [
      'Level 6–8',
      'HR target: 120–140 bpm',
      'Full step — do not lean on handles',
      'Glute activation every step — 30–40 min',
    ],
  },
  swimming: {
    label: 'Swimming',
    icon: '🏊',
    inputs: ['laps', 'duration'],
    units: { laps: 'laps', duration: 'min' },
    placeholders: { laps: '20', duration: '40' },
    instructions: [
      'Any stroke, continuous movement',
      'HR target: 120–140 bpm',
      'No rest longer than 30s between laps',
      '30–45 min total',
    ],
  },
  walking: {
    label: 'Walking',
    icon: '🚶',
    inputs: ['distance', 'duration'],
    units: { distance: 'km', duration: 'min' },
    placeholders: { distance: '4', duration: '50' },
    instructions: [
      'Brisk walk — slight incline if available',
      'HR target: 110–130 bpm',
      'Maintain pace — not a casual stroll',
      '45–60 min',
    ],
  },
}

const GYM_OPTIONS = ['treadmill', 'crosstrainer', 'bike', 'rowing', 'stairmaster']

interface ChecklistLog {
  item_key: string
  item_type: string
  completed: boolean
  notes?: string
}

interface CooldownItem {
  label?: string
  item_key: string
}

interface Workout {
  title?: string
  sub?: string
  dur?: string
  tags?: string[]
}

interface DayData {
  title?: string
  subtitle?: string
  duration_min?: number
  tags?: string[]
}

interface LissDayProps {
  workout: Workout
  dayData: DayData | null
  dateStr: string
  phase: number
  totalWeek: number
  checklistLogs: ChecklistLog[]
  cooldownItems: CooldownItem[]
  onUpdate: () => void
  readOnly?: boolean
}

const LissDay = memo(function LissDay({
  workout,
  dayData,
  dateStr,
  phase,
  totalWeek,
  checklistLogs,
  cooldownItems: dbCooldownItems,
  onUpdate,
  readOnly = false,
}: LissDayProps) {
  const { user } = useAuth()
  const { execute } = useOptimisticUpdate()

  const cooldown = useMemo(() => {
    if (dbCooldownItems && dbCooldownItems.length > 0) {
      return dbCooldownItems.map((ci) => ci.label ?? ci.item_key)
    }
    return []
  }, [dbCooldownItems])

  const title = dayData?.title ?? workout?.title ?? 'LISS + RECOVERY'
  const subtitle = dayData?.subtitle ?? workout?.sub
  const duration = dayData?.duration_min ? String(dayData.duration_min) : workout?.dur
  const tags = dayData?.tags ?? workout?.tags

  const equipmentOptions = GYM_OPTIONS
  const defaultEquipment = 'treadmill'

  const [selectedEquipment, setSelectedEquipment] = useState(defaultEquipment)
  const [inputValues, setInputValues] = useState<Record<string, string>>({})
  const [isLogged, setIsLogged] = useState(false)
  const [previousLog, setPreviousLog] = useState<Record<string, unknown> | null>(null)

  const config = EQUIPMENT_CONFIG[selectedEquipment]!

  const dateContext = useMemo(() => {
    const d = new Date(dateStr + 'T00:00:00')
    return `${d.getDate()} ${MONTHS[d.getMonth()]} · WEEK ${totalWeek ?? 1} · PHASE ${phase ?? 1}`
  }, [dateStr, totalWeek, phase])

  const hasDuration = !!(inputValues.duration ?? inputValues.laps ?? inputValues.distance)

  useEffect(() => {
    const existing = checklistLogs.find((l) => l.item_key === 'liss' && l.item_type === 'cardio')
    if (existing?.completed) {
      setIsLogged(true)
      try {
        const data = JSON.parse(existing.notes ?? '{}')
        if (data.equipment && EQUIPMENT_CONFIG[data.equipment]) {
          setSelectedEquipment(data.equipment)
        }
        const vals = { ...data }
        delete vals.equipment
        setInputValues(vals)
      } catch {
        /* ignore parse errors */
      }
    }

    let cancelled = false
    async function fetchPrev() {
      const { data } = await supabase
        .from('checklist_logs')
        .select('notes, date')
        .eq('user_id', user!.id)
        .eq('item_key', 'liss')
        .eq('item_type', 'cardio')
        .eq('completed', true)
        .lt('date', dateStr)
        .order('date', { ascending: false })
        .limit(1)

      if (!cancelled && data?.[0]?.notes) {
        try {
          setPreviousLog(JSON.parse(data[0].notes))
        } catch {
          /* ignore */
        }
      }
    }
    void fetchPrev()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- user is stable when authenticated
  }, [checklistLogs, dateStr, user?.id])

  function handleInputChange(name: string, value: string) {
    setInputValues((prev) => ({ ...prev, [name]: value }))
  }

  function handleSelectEquipment(key: string) {
    if (isLogged) return
    setSelectedEquipment(key)
    setInputValues({})
  }

  function handleLog() {
    if (!hasDuration) return

    const notes: Record<string, unknown> = { equipment: selectedEquipment }
    for (const name of config.inputs) {
      const val = inputValues[name]
      if (val) notes[name] = parseFloat(val)
    }
    const notesStr = JSON.stringify(notes)

    void execute({
      optimisticUpdate: () => {
        setIsLogged(true)
        if (navigator.vibrate) navigator.vibrate(50)
      },
      idbWrite: async () => {
        await idbCache.invalidate('workout-data', `${user!.id}_${dateStr}`)
      },
      supabaseWrite: async () => {
        const { error } = await upsertChecklistLog(user!.id, {
          date: dateStr,
          item_type: 'cardio',
          item_key: 'liss',
          completed: true,
          notes: notesStr,
        })
        if (error) throw new Error(error)
        onUpdate()
      },
      rollback: () => {
        setIsLogged(false)
      },
      syncKey: `liss_${dateStr}`,
    })
  }

  const showPrevious = previousLog && previousLog.equipment === selectedEquipment
  const prevConfig = showPrevious
    ? (EQUIPMENT_CONFIG[previousLog.equipment as string] ?? null)
    : null

  return (
    <div>
      <p className="text-[11px] text-muted uppercase tracking-[2px] pt-2.5 mb-1">{dateContext}</p>

      {readOnly && (
        <span
          className="text-[11px] tracking-[0.08em] uppercase text-disabled px-3 py-1 inline-flex mb-2"
          style={{ background: colors.bgSubtle, border: `1px solid ${colors.surface}` }}
        >
          UPCOMING ·{' '}
          {(() => {
            const d = new Date(dateStr + 'T00:00:00')
            const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
            return `${days[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
          })()}
        </span>
      )}

      <div className="flex items-baseline justify-between">
        <Text variant="pageTitle">{title}</Text>
        {duration && (
          <span className="font-['Bebas_Neue'] text-[20px] text-accent shrink-0 ml-3">
            {duration}&prime;
          </span>
        )}
      </div>

      {subtitle && (
        <Text variant="bodyMuted" className="mt-0.5">
          {subtitle}
        </Text>
      )}

      <div className="flex items-center gap-2 mt-2">
        {tags?.map((tag) => (
          <Badge key={tag} label={tag} />
        ))}
      </div>

      <div className="mt-5">
        <SectionLabel label="Equipment" className="mb-2" />
        <div className="flex flex-wrap gap-2">
          {equipmentOptions.map((key) => {
            const eq = EQUIPMENT_CONFIG[key]!
            const isActive = selectedEquipment === key
            return (
              <button
                key={key}
                onClick={() => handleSelectEquipment(key)}
                aria-pressed={isActive}
                className="flex items-center gap-1.5 px-3 h-11 text-[13px] font-medium transition-all duration-150"
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
                <span className="text-[14px]">{eq.icon}</span>
                <span>{eq.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-5">
        <SectionLabel label="How to" className="mb-3" />
        {config.instructions.map((line, i) => (
          <p key={i} className="text-[14px] text-text leading-[1.9]">
            {line}
          </p>
        ))}
      </div>

      {!readOnly && (
        <>
          <div className="flex gap-2 mt-6">
            {config.inputs.map((name) => (
              <div
                key={name}
                className="flex-1 focus-within:border-accent p-4 flex flex-col items-center transition-colors"
                style={{
                  background: colors.surface2,
                  border: `1.5px solid ${colors.border}`,
                  borderRadius: radius.input,
                }}
              >
                <label className="text-[9px] font-bold tracking-[0.1em] uppercase text-disabled mb-2">
                  {name.charAt(0).toUpperCase() + name.slice(1)}
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step={name === 'speed' || name === 'rpm' || name === 'distance' ? '0.1' : '1'}
                  value={inputValues[name] ?? ''}
                  onChange={(e) => handleInputChange(name, e.target.value)}
                  readOnly={isLogged}
                  className="w-full bg-transparent text-center text-[24px] font-['Bebas_Neue'] tracking-[1px] text-text placeholder-disabled focus:outline-none"
                  placeholder={config.placeholders[name] ?? ''}
                  aria-label={`${name} value`}
                />
                <span className="text-[10px] text-placeholder mt-1">{config.units[name]}</span>
              </div>
            ))}
          </div>

          {showPrevious && prevConfig && (
            <Text variant="caption" className="mt-3 text-center tracking-wide uppercase">
              Last session
              {prevConfig.inputs
                .map((name) => {
                  const val = previousLog[name]
                  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- numeric values from DB
                  return val != null ? ` · ${String(val)}${String(prevConfig.units[name])}` : ''
                })
                .join('')}
            </Text>
          )}

          <div className="mt-4">
            <Button
              variant={isLogged ? 'success' : 'primary'}
              label={isLogged ? '✓ CARDIO LOGGED' : 'LOG CARDIO'}
              onPress={handleLog}
              disabled={isLogged || !hasDuration}
            />
          </div>

          {isLogged && (
            <Text variant="caption" className="text-center mt-2 font-medium">
              {config.icon} {config.label}
              {config.inputs
                .map((name) => {
                  const val = inputValues[name]
                  return val ? ` · ${val} ${config.units[name]}` : ''
                })
                .join('')}
            </Text>
          )}
        </>
      )}

      <CooldownSection
        items={cooldown}
        dateStr={dateStr}
        checklistLogs={checklistLogs}
        onUpdate={onUpdate}
        readOnly={readOnly}
      />
    </div>
  )
})

export default LissDay
