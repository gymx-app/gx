import { useState, useEffect, useMemo, memo } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { upsertChecklistLog } from '../../services/checklistService'
import { supabase } from '../../lib/supabase'
import { logger } from '../../lib/logger'
import { Text, Button, Badge, SectionLabel, Toggle } from '../ui'

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

// ── Equipment configurations ──

const EQUIPMENT_CONFIG = {
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
const TRAVEL_OPTIONS = ['walking', 'swimming']

const LissDay = memo(function LissDay({
  workout,
  dateStr,
  phase,
  totalWeek,
  checklistLogs,
  isTravelMode,
  onToggleTravel,
  onUpdate,
}) {
  const { user } = useAuth()
  const cooldown = workout.cd || []

  const equipmentOptions = isTravelMode ? TRAVEL_OPTIONS : GYM_OPTIONS
  const defaultEquipment = isTravelMode ? 'walking' : 'treadmill'

  const [selectedEquipment, setSelectedEquipment] = useState(defaultEquipment)
  const [inputValues, setInputValues] = useState({})
  const [isLogged, setIsLogged] = useState(false)
  const [previousLog, setPreviousLog] = useState(null)

  useEffect(() => {
    if (isTravelMode && !TRAVEL_OPTIONS.includes(selectedEquipment)) {
      setSelectedEquipment('walking')
      setInputValues({})
    } else if (!isTravelMode && !GYM_OPTIONS.includes(selectedEquipment)) {
      setSelectedEquipment('treadmill')
      setInputValues({})
    }
  }, [isTravelMode, selectedEquipment])

  const config = EQUIPMENT_CONFIG[selectedEquipment]
  const completedKeys = new Set(checklistLogs.filter(l => l.completed).map(l => l.item_key))

  const dateContext = useMemo(() => {
    const d = new Date(dateStr + 'T00:00:00')
    return `${d.getDate()} ${MONTHS[d.getMonth()]} · WEEK ${totalWeek || 1} · PHASE ${phase || 1}`
  }, [dateStr, totalWeek, phase])

  const hasDuration = !!(inputValues.duration || inputValues.laps || inputValues.distance)

  useEffect(() => {
    const existing = checklistLogs.find(l => l.item_key === 'liss' && l.item_type === 'cardio')
    if (existing?.completed) {
      setIsLogged(true)
      try {
        const data = JSON.parse(existing.notes || '{}')
        if (data.equipment && EQUIPMENT_CONFIG[data.equipment]) {
          setSelectedEquipment(data.equipment)
        }
        const vals = { ...data }
        delete vals.equipment
        setInputValues(vals)
      } catch { /* ignore parse errors */ }
    }

    async function fetchPrev() {
      const { data } = await supabase
        .from('checklist_logs')
        .select('notes, date')
        .eq('user_id', user.id)
        .eq('item_key', 'liss')
        .eq('item_type', 'cardio')
        .eq('completed', true)
        .lt('date', dateStr)
        .order('date', { ascending: false })
        .limit(1)

      if (data?.[0]?.notes) {
        try { setPreviousLog(JSON.parse(data[0].notes)) } catch { /* ignore */ }
      }
    }
    fetchPrev()
  }, [checklistLogs, dateStr, user.id])

  function handleInputChange(name, value) {
    setInputValues(prev => ({ ...prev, [name]: value }))
  }

  function handleSelectEquipment(key) {
    if (isLogged) return
    setSelectedEquipment(key)
    setInputValues({})
  }

  async function handleLog() {
    if (!hasDuration) return
    setIsLogged(true)
    if (navigator.vibrate) navigator.vibrate(50)

    const notes = { equipment: selectedEquipment }
    for (const name of config.inputs) {
      const val = inputValues[name]
      if (val) notes[name] = parseFloat(val)
    }

    const { error } = await upsertChecklistLog(user.id, {
      date: dateStr,
      item_type: 'cardio',
      item_key: 'liss',
      completed: true,
      notes: JSON.stringify(notes),
    })
    if (error) logger.error('handleLog LISS:', error)
    onUpdate()
  }

  async function toggleCooldown(key) {
    const done = completedKeys.has(key)
    const { error } = await upsertChecklistLog(user.id, {
      date: dateStr,
      item_type: 'cooldown',
      item_key: key,
      completed: !done,
    })
    if (error) logger.error('toggleCooldown:', error)
    onUpdate()
  }

  const showPrevious = previousLog && previousLog.equipment === selectedEquipment
  const prevConfig = showPrevious ? EQUIPMENT_CONFIG[previousLog.equipment] : null

  return (
    <div>
      {/* Workout header */}
      <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#444444]">
        {dateContext}
      </p>

      <div className="flex items-baseline justify-between mt-2">
        <Text variant="pageTitle">{workout.title || 'LISS + RECOVERY'}</Text>
        {workout.dur && (
          <span className="text-[22px] font-black text-[#ff4520] tracking-tight shrink-0 ml-3">
            {workout.dur}&prime;
          </span>
        )}
      </div>

      {workout.sub && (
        <Text variant="bodyMuted" className="mt-1.5">{workout.sub}</Text>
      )}

      <div className="flex items-center gap-2 mt-3">
        {workout.tags?.map(tag => (
          <Badge key={tag} label={tag} variant="accent" />
        ))}
      </div>

      {/* Travel toggle */}
      <div className="flex items-center justify-between mt-4 py-3 border-t border-b border-[#111111]">
        <div className="flex items-center gap-2">
          <span className="text-[14px]">✈</span>
          <Text variant="body" className="text-[#666666]">Travelling?</Text>
        </div>
        <Toggle value={isTravelMode} onChange={onToggleTravel} />
      </div>

      {/* Equipment selector */}
      <div className="mt-5">
        <SectionLabel label="Equipment" className="mb-2" />
        <div className="flex flex-wrap gap-2">
          {equipmentOptions.map(key => {
            const eq = EQUIPMENT_CONFIG[key]
            const isActive = selectedEquipment === key
            return (
              <button
                key={key}
                onClick={() => handleSelectEquipment(key)}
                aria-pressed={isActive}
                className={`flex items-center gap-1.5 px-3 h-9 text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[#ff4520] text-white'
                    : 'bg-[#111111] border border-[#2a2a2a] text-[#888888] active:bg-[#1a1a1a]'
                }`}
              >
                <span className="text-[14px]">{eq.icon}</span>
                <span>{eq.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Session instructions */}
      <div className="mt-5">
        <SectionLabel label="How to" className="mb-3" />
        {config.instructions.map((line, i) => (
          <p key={i} className="text-[15px] text-white leading-[1.9]">{line}</p>
        ))}
      </div>

      {/* Input cards */}
      <div className="flex gap-2 mt-6">
        {config.inputs.map(name => (
          <div
            key={name}
            className="flex-1 bg-[#111111] border border-[#2a2a2a] focus-within:border-[#ff4520] p-4 flex flex-col items-center transition-colors"
          >
            <label className="text-[9px] font-bold tracking-[0.1em] uppercase text-[#555555] mb-2">
              {name.charAt(0).toUpperCase() + name.slice(1)}
            </label>
            <input
              type="number"
              inputMode="decimal"
              step={name === 'speed' || name === 'rpm' || name === 'distance' ? '0.1' : '1'}
              value={inputValues[name] || ''}
              onChange={e => handleInputChange(name, e.target.value)}
              readOnly={isLogged}
              className="w-full bg-transparent text-center text-[24px] font-black text-white placeholder-[#555555] focus:outline-none"
              placeholder={config.placeholders[name] || ''}
              aria-label={`${name} value`}
            />
            <span className="text-[10px] text-[#444444] mt-1">{config.units[name]}</span>
          </div>
        ))}
      </div>

      {/* Last session row */}
      {showPrevious && prevConfig && (
        <Text variant="caption" className="mt-3 text-center tracking-wide uppercase">
          Last session
          {prevConfig.inputs.map(name => {
            const val = previousLog[name]
            return val != null ? ` · ${val}${prevConfig.units[name]}` : ''
          }).join('')}
        </Text>
      )}

      {/* Log cardio button */}
      <div className="mt-4">
        <Button
          variant={isLogged ? 'success' : 'primary'}
          label={isLogged ? '✓ CARDIO LOGGED' : 'LOG CARDIO'}
          onPress={handleLog}
          disabled={isLogged || !hasDuration}
        />
      </div>

      {/* Logged summary */}
      {isLogged && (
        <Text variant="caption" className="text-center mt-2 font-medium">
          {config.icon} {config.label}
          {config.inputs.map(name => {
            const val = inputValues[name]
            return val ? ` · ${val} ${config.units[name]}` : ''
          }).join('')}
        </Text>
      )}

      {/* Cooldown */}
      {cooldown.length > 0 && (
        <div className="mt-6">
          <SectionLabel label="Cooldown" className="mb-2" />
          <div className="border border-[#1a1a1a]">
            {cooldown.map((item, idx) => {
              const key = `cd-${idx}`
              const done = completedKeys.has(key)
              return (
                <button
                  key={key}
                  className={`w-full flex items-center gap-3 px-3 py-3 text-left active:bg-[#1a1a1a] transition-colors ${
                    idx > 0 ? 'border-t border-[#111111]' : ''
                  }`}
                  onClick={() => toggleCooldown(key)}
                  aria-label={`${item} — ${done ? 'completed' : 'not completed'}`}
                >
                  <div className={`w-5 h-5 flex items-center justify-center shrink-0 transition-colors ${
                    done ? 'bg-[#22c55e] text-white' : 'border border-[#2a2a2a] text-transparent'
                  }`}>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className={`text-[13px] ${done ? 'text-[#555555] line-through' : 'text-[#999999]'}`}>
                    {item}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
})

export default LissDay
