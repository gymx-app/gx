import { useState, memo } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { upsertChecklistLog } from '../../services/checklistService'
import { Text, Button, SectionLabel } from '../ui'
import { colors, radius } from '../../styles/tokens'

interface Finisher {
  title: string
  desc?: string
  type?: string
  rounds?: string[]
  dur?: string
  kcal?: string
}

interface ChecklistLog {
  item_key: string
  item_type: string
  completed: boolean
  notes?: string
}

interface FinisherBlockProps {
  fin: Finisher
  dateStr: string
  checklistLogs: ChecklistLog[]
  onUpdate: () => void
}

function FinisherBlock({ fin, dateStr, checklistLogs, onUpdate }: FinisherBlockProps) {
  const { user } = useAuth()
  const existing = checklistLogs.find(l => l.item_key === 'fin-main' && l.item_type === 'finisher')
  const isLogged = existing?.completed || false

  const [finInputs, setFinInputs] = useState<Record<string, string>>(() => {
    if (isLogged && existing?.notes) {
      try { return JSON.parse(existing.notes) } catch { return {} }
    }
    return {}
  })

  const isCardio = fin.type === 'cardio'
  const hasDuration = !!finInputs.duration

  async function handleLogFinisher() {
    if (isCardio && !hasDuration) return
    if (navigator.vibrate) navigator.vibrate(50)

    const notes: Record<string, number> = {}
    if (isCardio) {
      if (finInputs.incline) notes.incline = parseFloat(finInputs.incline)
      if (finInputs.speed) notes.speed = parseFloat(finInputs.speed)
      if (finInputs.duration) notes.duration = parseFloat(finInputs.duration)
    }

    await upsertChecklistLog(user.id, {
      date: dateStr,
      item_type: 'finisher',
      item_key: 'fin-main',
      completed: true,
      notes: JSON.stringify(notes),
    })
    onUpdate()
  }

  return (
    <div className="mt-6">
      <SectionLabel label="Finisher" className="mb-3" />

      <h4 className="font-['Bebas_Neue'] text-[18px] tracking-[1.5px] text-[#ff4520] mb-[5px]">{fin.title}</h4>
      {fin.desc && <p className="text-[13px] leading-[1.6] mt-1" style={{ color: colors.textSecondary }}>{fin.desc}</p>}

      {fin.rounds && fin.rounds.length > 0 && (
        <div className="mt-2">
          {fin.rounds.map((round, i) => (
            <p key={i} className="text-[13px] leading-[1.6]" style={{ color: colors.textSecondary }}>{round}</p>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mt-2">
        {fin.dur && <span className="text-[12px] text-[#666666]">{fin.dur}</span>}
        {fin.kcal && <><span className="text-[12px] text-[#666666]">·</span><span className="text-[12px] text-[#666666]">{fin.kcal}</span></>}
      </div>

      {isCardio && (
        <div className="flex gap-2 mt-4">
          {[
            { name: 'incline', unit: '%', placeholder: '7' },
            { name: 'speed', unit: 'km/h', placeholder: '5.5' },
            { name: 'duration', unit: 'min', placeholder: '20' },
          ].map(({ name, unit, placeholder }) => (
            <div
              key={name}
              className="flex-1 focus-within:border-[#ff4520] p-4 flex flex-col items-center transition-all duration-150"
              style={{ background: colors.surface2, border: `1.5px solid ${colors.border}`, borderRadius: radius.input }}
            >
              <label className="text-[9px] font-bold tracking-[1px] uppercase text-[#666666] mb-2">
                {name.charAt(0).toUpperCase() + name.slice(1)}
              </label>
              <input
                type="number"
                inputMode="decimal"
                step={name === 'speed' ? '0.1' : '1'}
                value={finInputs[name] || ''}
                onChange={e => setFinInputs(prev => ({ ...prev, [name]: e.target.value }))}
                readOnly={isLogged}
                className="w-full bg-transparent text-center text-[24px] font-['Bebas_Neue'] tracking-[1px] text-[#f0ede8] focus:outline-none"
                style={{ color: colors.text }}
                placeholder={placeholder}
                aria-label={`${name} value`}
              />
              <span className="text-[10px] mt-1" style={{ color: colors.placeholder }}>{unit}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <Button
          variant={isLogged ? 'success' : 'primary'}
          label={isLogged ? '✓ FINISHER LOGGED' : 'LOG FINISHER'}
          onPress={handleLogFinisher}
          disabled={isLogged || (isCardio && !hasDuration)}
        />
      </div>

      {isLogged && isCardio && (
        <Text variant="caption" className="text-center mt-2 font-medium">
          {finInputs.incline && `${finInputs.incline}%`}
          {finInputs.speed && ` · ${finInputs.speed} km/h`}
          {finInputs.duration && ` · ${finInputs.duration} min`}
        </Text>
      )}
    </div>
  )
}

export default memo(FinisherBlock)
