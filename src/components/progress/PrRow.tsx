import { ArrowUp } from 'lucide-react'
import { Text } from '../ui'
import { colors } from '../../styles/tokens'

export interface PrEntry {
  name: string
  dateISO: string
  date: string
  delta: string
  value: string
  unit: string
}

export default function PrRow({ name, date, delta, value, unit }: Omit<PrEntry, 'dateISO'>) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <Text variant="body" className="font-bold">
          {name}
        </Text>
        <Text variant="caption" className="mt-0.5">
          {date}
        </Text>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="flex items-center gap-0.5" style={{ color: colors.success }}>
          <ArrowUp size={12} strokeWidth={2.5} />
          <span className="text-[12px] font-bold">{delta}</span>
        </span>
        <span
          className="font-['Bebas_Neue'] text-[26px] tracking-[1px]"
          style={{ color: colors.accent }}
        >
          {value}
        </span>
        <Text variant="micro">{unit}</Text>
      </div>
    </div>
  )
}
