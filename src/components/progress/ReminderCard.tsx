import { useState } from 'react'
import { Check } from 'lucide-react'
import { BottomSheet, Card, ProgressBar, Text } from '../ui'
import { colors } from '../../styles/tokens'

const REMINDER_OPTIONS = [
  { label: 'Weekly reminder', sublabel: 'Every 7 days', days: 7 },
  { label: 'Fortnightly reminder', sublabel: 'Every 15 days', days: 15 },
  { label: 'Monthly reminder', sublabel: 'Every 30 days', days: 30 },
  { label: 'Bi-monthly reminder', sublabel: 'Every 60 days', days: 60 },
] as const

export default function ReminderCard({
  label,
  dayCount,
  defaultCycleLength = 30,
}: {
  label: string
  dayCount: number
  defaultCycleLength?: number
}) {
  const [showSheet, setShowSheet] = useState(false)
  const [cycleLength, setCycleLength] = useState(defaultCycleLength)

  const daysUntilDue = cycleLength - dayCount
  const percent = Math.min(100, Math.round((dayCount / cycleLength) * 100))

  return (
    <>
      <Card className="mt-4">
        <div className="flex items-center justify-between">
          <Text variant="body" className="!text-[15px] font-semibold">
            {daysUntilDue > 0 ? `${label} due in ${daysUntilDue} days` : `${label} overdue`}
          </Text>
          <button
            onClick={() => setShowSheet(true)}
            className="text-[15px] font-semibold shrink-0"
            style={{ color: colors.accent }}
          >
            Edit
          </button>
        </div>
        <div className="mt-3">
          <ProgressBar progress={percent} color="accent" height={6} />
        </div>
        <Text variant="caption" className="mt-1.5">
          Reminds every {cycleLength} days · day {dayCount} of {cycleLength}
        </Text>
      </Card>

      <BottomSheet isOpen={showSheet} onClose={() => setShowSheet(false)}>
        <div className="px-4 pb-6">
          <Text variant="cardTitle" className="mb-2">
            Reminder frequency
          </Text>
          {REMINDER_OPTIONS.map((option, i) => {
            const isSelected = option.days === cycleLength
            return (
              <button
                key={option.days}
                onClick={() => {
                  setCycleLength(option.days)
                  setShowSheet(false)
                }}
                className="w-full flex items-center justify-between py-3 text-left"
                style={
                  i < REMINDER_OPTIONS.length - 1
                    ? { borderBottom: `1px solid ${colors.borderSubtle}` }
                    : undefined
                }
              >
                <div>
                  <Text variant="body" className="font-bold">
                    {option.label}
                  </Text>
                  <Text variant="caption" className="mt-0.5">
                    {option.sublabel}
                  </Text>
                </div>
                {isSelected && <Check size={18} strokeWidth={2.5} color={colors.accent} />}
              </button>
            )
          })}
        </div>
      </BottomSheet>
    </>
  )
}
