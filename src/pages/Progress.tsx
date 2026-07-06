import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ChevronRight, Upload, X } from 'lucide-react'
import TopBar from '../components/layout/TopBar'
import PrRow from '../components/progress/PrRow'
import { CURATED_PRS } from '../components/progress/prData'
import ReminderCard from '../components/progress/ReminderCard'
import ScanHistoryRow from '../components/progress/ScanHistoryRow'
import { mockScanHistory } from '../components/progress/scanData'
import { useToast } from '../hooks/useToast'
import {
  BottomSheet,
  Button,
  Card,
  Input,
  ProgressBar,
  SectionLabel,
  StatBlock,
  Text,
  Toggle,
} from '../components/ui'
import { colors, radius } from '../styles/tokens'

// ── MOCK DATA — replace with real hooks in a later pass ──────────────────
const mockSessions = { completed: 4, total: 5 }
const mockStreak = { days: 18, personalBest: 31 }

const GOAL_STATUS = {
  onPace: { label: 'ON PACE', color: colors.success, bg: colors.successMuted },
  behindPace: { label: 'BEHIND PACE', color: colors.accent, bg: colors.accentMuted },
  justStarted: { label: 'JUST STARTED', color: colors.muted, bg: colors.surface2 },
} as const
const mockGoalStatus: keyof typeof GOAL_STATUS = 'behindPace'

const mockGoal = {
  label: 'GOAL · FAT LOSS BY SEP 2026',
  current: 35.6,
  target: 25.0,
  startedAt: 40.2,
  progressPercent: 30,
  toGo: 10.6,
  weeksLeft: 6,
}

// A goal is always set during onboarding, so day-one users still see this
// card — just with zero progress instead of a fabricated pace.
const emptyGoal = {
  label: mockGoal.label,
  current: mockGoal.startedAt,
  target: mockGoal.target,
  startedAt: mockGoal.startedAt,
  progressPercent: 0,
  toGo: Math.abs(mockGoal.startedAt - mockGoal.target),
  weeksLeft: mockGoal.weeksLeft + 6,
}

// Total tonnage per week — the one signal that's always real no matter which
// of the 300+ exercises made up a given session.
const mockWeeklyVolume = [
  17200, 18400, 18000, 19100, 20100, 19500, 21000, 21800, 21400, 22800, 23500, 24200,
]

// Baseline 1RM tests only happen a few times per programme (per phase), not
// weekly — shown as discrete checkpoints instead of a fabricated smooth line.
const mockBaselineTests = [
  { phase: 'Foundation Phase', week: 'Wk 1', date: '3 Feb 2026', total: 460 },
  { phase: 'Accumulation Phase', week: 'Wk 5', date: '3 Mar 2026', total: 480 },
  { phase: 'Intensification Phase', week: 'Wk 9', date: '31 Mar 2026', total: 500 },
]

// 14 days, most recent last — 0 = missed, otherwise relative intensity 0-1
const mockLast14Days = [1, 1, 0.6, 1, 1, 0, 1, 0.6, 1, 1, 1, 0, 1, 1]

const PR_PREVIEW_COUNT = 5

const mockReminder = { dayCount: 24, cycleLength: 30 }
const mockMeasurementReminder = { dayCount: 12 }
// TODO: source from the user's profile once height is captured there.
const mockUserHeightCm = 178

type MeasurementKey =
  | 'neck'
  | 'shoulders'
  | 'chest'
  | 'bicepL'
  | 'bicepR'
  | 'waist'
  | 'hip'
  | 'thighL'
  | 'thighR'
  | 'calf'
type MeasurementValues = Record<MeasurementKey, number>
interface MeasurementField {
  key: MeasurementKey
  label: string
}

// Grouped by body region so the form and history both read logically
// (top to bottom, matching how a lifter actually thinks about their body)
// instead of an arbitrary insertion-order grid.
const MEASUREMENT_GROUPS: { title: string; fields: MeasurementField[] }[] = [
  {
    title: 'Upper body',
    fields: [
      { key: 'neck', label: 'Neck' },
      { key: 'shoulders', label: 'Shoulders' },
      { key: 'chest', label: 'Chest' },
      { key: 'bicepL', label: 'Bicep (L)' },
      { key: 'bicepR', label: 'Bicep (R)' },
    ],
  },
  {
    title: 'Core',
    fields: [
      { key: 'waist', label: 'Waist' },
      { key: 'hip', label: 'Hip' },
    ],
  },
  {
    title: 'Lower body',
    fields: [
      { key: 'thighL', label: 'Thigh (L)' },
      { key: 'thighR', label: 'Thigh (R)' },
      { key: 'calf', label: 'Calf' },
    ],
  },
]
const ALL_MEASUREMENT_FIELDS = MEASUREMENT_GROUPS.flatMap((g) => g.fields)

interface MeasurementEntry {
  id: number
  date: string
  values: MeasurementValues
}

const mockMeasurements: MeasurementEntry[] = [
  {
    id: 1,
    date: '22 Jun 2026',
    values: {
      neck: 39.5,
      shoulders: 118,
      chest: 104,
      waist: 86,
      hip: 98,
      bicepL: 37.2,
      bicepR: 37.5,
      thighL: 62,
      thighR: 62.5,
      calf: 39,
    },
  },
  {
    id: 0,
    date: '25 May 2026',
    values: {
      neck: 39.5,
      shoulders: 117,
      chest: 102,
      waist: 88,
      hip: 98,
      bicepL: 36.5,
      bicepR: 36.8,
      thighL: 61,
      thighR: 61.5,
      calf: 39,
    },
  },
]
// ── END MOCK DATA ──────────────────────────────────────────────────────

const TABS = ['Training', 'Body Scan', 'Measure'] as const
type TabName = (typeof TABS)[number]

function SegmentedControl({
  active,
  onChange,
}: {
  active: TabName
  onChange: (t: TabName) => void
}) {
  return (
    <div className="flex w-full p-1 rounded-full" style={{ background: colors.surface2 }}>
      {TABS.map((tab) => {
        const isActive = tab === active
        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className={`flex-1 py-2.5 rounded-full transition-all duration-150 ${
              isActive
                ? "font-['Bebas_Neue'] text-[15px] tracking-[1px]"
                : "font-['DM_Sans'] text-[13px] font-bold"
            }`}
            style={{
              background: isActive ? colors.accent : 'transparent',
              color: colors.text,
            }}
          >
            {tab}
          </button>
        )
      })}
    </div>
  )
}

function SessionDots({ completed, total }: { completed: number; total: number }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: i < completed ? colors.accent : colors.surface3 }}
        />
      ))}
    </div>
  )
}

function GoalStatusBadge({ status }: { status: keyof typeof GOAL_STATUS }) {
  const { label, color, bg } = GOAL_STATUS[status]
  return (
    <span
      className="px-[8px] py-[3px] text-[10px] font-bold tracking-[0.3px] uppercase rounded-[4px]"
      style={{ color, background: bg }}
    >
      {label}
    </span>
  )
}

function VolumeBarChart({ weeks }: { weeks: number[] }) {
  const w = 280
  const h = 72
  const max = Math.max(...weeks)
  const gap = 4
  const barWidth = w / weeks.length - gap

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {weeks.map((v, i) => {
        const barH = (v / max) * h
        const x = i * (w / weeks.length)
        const isCurrent = i === weeks.length - 1
        return (
          <rect
            key={i}
            x={x}
            y={h - barH}
            width={barWidth}
            height={barH}
            rx={2}
            fill={isCurrent ? colors.accent : colors.surface3}
          />
        )
      })}
    </svg>
  )
}

function BaselineTestRow({
  phase,
  week,
  date,
  total,
  delta,
  isLast,
}: {
  phase: string
  week: string
  date: string
  total: number
  delta: number | null
  isLast: boolean
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colors.accent }} />
        {!isLast && (
          <span className="w-px flex-1 mt-1" style={{ background: colors.borderSubtle }} />
        )}
      </div>
      <div className={isLast ? '' : 'pb-5'}>
        <Text variant="caption">
          {phase} · {week} · {date}
        </Text>
        <div className="flex items-baseline gap-2 mt-1">
          <span
            className="font-['Bebas_Neue'] text-[22px] tracking-[1px]"
            style={{ color: colors.text }}
          >
            {total} kg
          </span>
          {delta !== null && (
            <span className="text-[12px] font-bold" style={{ color: colors.success }}>
              +{delta} since last test
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function Last14DaysRow({ days }: { days: number[] }) {
  return (
    <div className="flex justify-end gap-1.5">
      {days.map((intensity, i) => (
        <span
          key={i}
          className="w-3 h-3 rounded-[3px]"
          style={
            intensity === 0
              ? { background: colors.surface3 }
              : { background: colors.success, opacity: intensity }
          }
        />
      ))}
    </div>
  )
}

function EmptyState({
  message,
  action,
}: {
  message: string
  action?: { label: string; onPress: () => void }
}) {
  return (
    <div className="py-4 text-center">
      <Text variant="bodyMuted">{message}</Text>
      {action && (
        <div className="mt-3 flex justify-center">
          <Button
            variant="secondary"
            label={action.label}
            onPress={action.onPress}
            fullWidth={false}
          />
        </div>
      )}
    </div>
  )
}

function BodyScanTab() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <ReminderCard
        label="Next scan"
        dayCount={mockReminder.dayCount}
        defaultCycleLength={mockReminder.cycleLength}
      />

      <div
        className="flex flex-col items-center text-center mt-3 px-4"
        style={{
          border: `1.5px dashed ${colors.border}`,
          borderRadius: radius.card,
          paddingTop: 22,
          paddingBottom: 22,
        }}
      >
        <Upload size={26} strokeWidth={1.5} color={colors.muted} />
        <Text variant="body" className="!text-[14px] font-semibold mt-3">
          Upload InBody scan
        </Text>
        <Text variant="caption" className="mt-1">
          Photo of the printout or a PDF export
        </Text>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={() => {}}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="mt-3 px-5 py-2 rounded-full text-[13px] font-bold"
          style={{ border: `1.5px solid ${colors.border}`, color: colors.text }}
        >
          Choose file
        </button>
      </div>

      <Text variant="caption" className="!text-[13px] font-medium mt-6">
        History
      </Text>
      <Card className="mt-2" padding="p-4">
        {mockScanHistory.length > 0 ? (
          mockScanHistory.map((scan, i) => (
            <ScanHistoryRow
              key={scan.date}
              scan={scan}
              isLast={i === mockScanHistory.length - 1}
              onPress={() => void navigate('/progress/scan', { state: { scan } })}
            />
          ))
        ) : (
          <EmptyState message="No scans yet — upload your first InBody scan to start tracking." />
        )}
      </Card>
    </>
  )
}

function TrainingTab() {
  const navigate = useNavigate()
  // ponytail: preview-only toggle so both states can be reviewed live; the
  // conditional rendering below is the real logic once data is wired up.
  const [previewEmpty, setPreviewEmpty] = useState(false)

  const sessions = previewEmpty ? { completed: 0, total: mockSessions.total } : mockSessions
  const streak = previewEmpty ? { days: 0, personalBest: null } : mockStreak
  const goal = previewEmpty ? emptyGoal : mockGoal
  const goalStatus: keyof typeof GOAL_STATUS = previewEmpty ? 'justStarted' : mockGoalStatus
  const weeklyVolume = previewEmpty ? [] : mockWeeklyVolume
  const baselineTests = previewEmpty ? [] : mockBaselineTests
  const last14 = previewEmpty ? mockLast14Days.map(() => 0) : mockLast14Days
  const prs = previewEmpty ? [] : CURATED_PRS
  const previewPRs = prs.slice(0, PR_PREVIEW_COUNT)

  const currentVolume = weeklyVolume[weeklyVolume.length - 1]
  const prior4wk = weeklyVolume.slice(-5, -1)
  const prior4wkAvg = prior4wk.reduce((sum, v) => sum + v, 0) / prior4wk.length
  const volumePct = Math.round(((currentVolume! - prior4wkAvg) / prior4wkAvg) * 100)

  return (
    <>
      <div className="flex items-center justify-between mt-4">
        <Text variant="micro">Preview: fresh-user empty state</Text>
        <Toggle value={previewEmpty} onChange={() => setPreviewEmpty((v) => !v)} />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <Card>
          <SectionLabel label="This week" />
          <div className="mt-3">
            <SessionDots completed={sessions.completed} total={sessions.total} />
          </div>
          <Text variant="cardTitle" className="mt-3">
            {sessions.completed} / {sessions.total} SESSIONS
          </Text>
        </Card>

        <Card>
          <SectionLabel label="Streak" />
          <Text variant="pageTitle" className="mt-3">
            {streak.days} DAYS
          </Text>
          <Text variant="caption" className="mt-1">
            {streak.personalBest !== null
              ? `Personal best: ${streak.personalBest}`
              : 'Complete a workout to start your streak'}
          </Text>
        </Card>
      </div>

      <Card className="mt-3">
        <div className="flex items-center justify-between">
          <Text variant="caption">{goal.label}</Text>
          <GoalStatusBadge status={goalStatus} />
        </div>
        <div className="mt-3">
          <ProgressBar progress={goal.progressPercent} color="accent" />
        </div>
        <div className="flex items-baseline gap-2 mt-3">
          <span
            className="font-['Bebas_Neue'] text-[28px] tracking-[1px]"
            style={{ color: colors.text }}
          >
            {goal.current}%
          </span>
          <ArrowRight size={14} strokeWidth={2} color={colors.muted} />
          <Text variant="caption">{goal.target.toFixed(1)}% target</Text>
        </div>
        <Text variant="caption" className="mt-1">
          {previewEmpty
            ? `${goal.weeksLeft} weeks left · starting at ${goal.startedAt}%`
            : `${goal.toGo}% to go · ${goal.weeksLeft} weeks left · started at ${goal.startedAt}%`}
        </Text>
      </Card>

      <Card className="mt-3">
        <Text variant="caption">TRAINING VOLUME · 12 WEEKS</Text>
        {weeklyVolume.length > 0 ? (
          <>
            <div className="mt-3">
              <VolumeBarChart weeks={weeklyVolume} />
            </div>
            <div className="flex items-baseline gap-2 mt-3">
              <span
                className="font-['Bebas_Neue'] text-[24px] tracking-[1px]"
                style={{ color: colors.text }}
              >
                {currentVolume!.toLocaleString()} kg
              </span>
              <span
                className="text-[12px] font-bold"
                style={{ color: volumePct >= 0 ? colors.success : colors.error }}
              >
                {volumePct >= 0 ? '+' : ''}
                {volumePct}% vs last 4wk avg
              </span>
            </div>
          </>
        ) : (
          <EmptyState message="No training volume yet — complete your first workout to see trends here." />
        )}
      </Card>

      <Card className="mt-3">
        <Text variant="caption">BASELINE TESTS</Text>
        {baselineTests.length > 0 ? (
          <div className="mt-3">
            {baselineTests.map((test, i) => (
              <BaselineTestRow
                key={test.phase}
                {...test}
                delta={i > 0 ? test.total - baselineTests[i - 1]!.total : null}
                isLast={i === baselineTests.length - 1}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            message="Complete your baseline test to unlock strength benchmarks."
            action={{ label: 'Start Baseline Test', onPress: () => {} }}
          />
        )}
      </Card>

      <Card className="mt-3">
        <div className="flex items-center justify-between">
          <Text variant="caption">LAST 14 DAYS</Text>
          <Last14DaysRow days={last14} />
        </div>
      </Card>

      <Card className="mt-3" padding="p-4">
        <Text variant="caption">Recent PRs</Text>
        {prs.length > 0 ? (
          <div className="mt-2" style={{ borderTop: `1px solid ${colors.borderSubtle}` }}>
            {previewPRs.map((pr) => (
              <PrRow key={pr.name} {...pr} />
            ))}
          </div>
        ) : (
          <EmptyState message="No PRs yet — they'll show up here as you set new records." />
        )}
        {prs.length > PR_PREVIEW_COUNT && (
          <button
            onClick={() => void navigate('/progress/prs')}
            className="w-full flex items-center justify-center gap-1 pt-3"
            style={{ borderTop: `1px solid ${colors.borderSubtle}` }}
          >
            <span className="text-[12px] font-bold" style={{ color: colors.accent }}>
              View more
            </span>
            <ChevronRight size={14} strokeWidth={2} color={colors.accent} />
          </button>
        )}
      </Card>
    </>
  )
}

const CM_PER_INCH = 2.54

function emptyFormValues(): Record<MeasurementKey, string> {
  return ALL_MEASUREMENT_FIELDS.reduce(
    (acc, f) => ({ ...acc, [f.key]: '' }),
    {} as Record<MeasurementKey, string>
  )
}

function toFormValues(values: MeasurementValues): Record<MeasurementKey, string> {
  return ALL_MEASUREMENT_FIELDS.reduce(
    (acc, f) => ({ ...acc, [f.key]: String(values[f.key]) }),
    {} as Record<MeasurementKey, string>
  )
}

function convertValue(value: string, fromUnit: 'cm' | 'in', toUnit: 'cm' | 'in'): string {
  if (fromUnit === toUnit) return value
  const num = parseFloat(value)
  if (!Number.isFinite(num)) return value
  const cm = fromUnit === 'cm' ? num : num * CM_PER_INCH
  const converted = toUnit === 'cm' ? cm : cm / CM_PER_INCH
  return String(Math.round(converted * 10) / 10)
}

function MeasureTab() {
  const toast = useToast()
  const [entries, setEntries] = useState<MeasurementEntry[]>(mockMeasurements)
  const [showForm, setShowForm] = useState(false)
  const [unit, setUnit] = useState<'cm' | 'in'>('cm')
  const [formValues, setFormValues] = useState<Record<MeasurementKey, string>>(emptyFormValues())

  const latest = entries[0] ?? null
  const whr = latest ? (latest.values.waist / latest.values.hip).toFixed(2) : null
  const whtr = latest ? (latest.values.waist / mockUserHeightCm).toFixed(2) : null

  const todayDisplay = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  function openForm() {
    setUnit('cm')
    setFormValues(latest ? toFormValues(latest.values) : emptyFormValues())
    setShowForm(true)
  }

  function toggleUnit() {
    const nextUnit = unit === 'cm' ? 'in' : 'cm'
    setFormValues((prev) => {
      const next = {} as Record<MeasurementKey, string>
      for (const field of ALL_MEASUREMENT_FIELDS) {
        next[field.key] = convertValue(prev[field.key], unit, nextUnit)
      }
      return next
    })
    setUnit(nextUnit)
  }

  function handleSave() {
    const values = ALL_MEASUREMENT_FIELDS.reduce((acc, f) => {
      const raw = parseFloat(formValues[f.key])
      const cm = Number.isFinite(raw) ? (unit === 'cm' ? raw : raw * CM_PER_INCH) : 0
      return { ...acc, [f.key]: Math.round(cm * 10) / 10 }
    }, {} as MeasurementValues)

    setEntries((prev) => [{ id: Date.now(), date: todayDisplay, values }, ...prev])
    setShowForm(false)
    toast.show({ message: 'Measurements saved', type: 'success' })
  }

  return (
    <>
      {latest && (
        <Card className="mt-4">
          <SectionLabel label="Body ratios" className="mb-3" />
          <div className="grid grid-cols-2 gap-3">
            <StatBlock value={whr!} label="Waist-hip ratio" />
            <StatBlock value={whtr!} label="Waist-height ratio" />
          </div>
        </Card>
      )}

      <ReminderCard
        label="Next measurement"
        dayCount={mockMeasurementReminder.dayCount}
        defaultCycleLength={30}
      />

      <div className="mt-4" style={{ paddingBottom: 88 }}>
        {entries.length === 0 ? (
          <EmptyState message="No measurements yet — add your first to start tracking." />
        ) : (
          entries.map((entry) => (
            <Card key={entry.id} className="mb-3">
              <Text variant="cardTitle">{entry.date}</Text>
              {MEASUREMENT_GROUPS.map((group, gi) => (
                <div key={group.title} className={gi === 0 ? 'mt-3' : 'mt-4'}>
                  <Text variant="caption" className="!text-[11px] font-medium mb-1">
                    {group.title}
                  </Text>
                  <div style={{ borderTop: `1px solid ${colors.borderSubtle}` }}>
                    {group.fields.map((field, i) => (
                      <div
                        key={field.key}
                        className="flex items-center justify-between py-[10px]"
                        style={
                          i < group.fields.length - 1
                            ? { borderBottom: `1px solid ${colors.borderSubtle}` }
                            : undefined
                        }
                      >
                        <span className="text-[14px]" style={{ color: colors.text }}>
                          {field.label}
                        </span>
                        <span
                          className="text-[14px] font-bold"
                          style={{ color: colors.textSecondary }}
                        >
                          {entry.values[field.key]} cm
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </Card>
          ))
        )}
      </div>

      <div
        className="fixed left-4 right-4 z-20"
        style={{ bottom: 'calc(var(--nav-height) + env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <Button variant="primary" label="Add new measurement" onPress={openForm} />
      </div>

      <BottomSheet isOpen={showForm} onClose={() => setShowForm(false)} height="90vh">
        <div className="px-4 pb-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <Text variant="cardTitle">New Measurement</Text>
            <button onClick={() => setShowForm(false)} aria-label="Close">
              <X size={20} color={colors.muted} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="mb-4">
              <Input label="Date" value={todayDisplay} onChange={() => {}} readOnly />
            </div>
            <div className="flex items-center justify-center gap-3 mb-4">
              <Text variant="caption">CM</Text>
              <Toggle value={unit === 'in'} onChange={toggleUnit} />
              <Text variant="caption">IN</Text>
            </div>
            {MEASUREMENT_GROUPS.map((group) => (
              <div key={group.title} className="mb-4">
                <SectionLabel label={group.title} className="mb-2" />
                <div className="grid grid-cols-2 gap-3">
                  {group.fields.map((field) => (
                    <Input
                      key={field.key}
                      label={`${field.label} (${unit})`}
                      inputMode="decimal"
                      value={formValues[field.key]}
                      onChange={(e) =>
                        setFormValues((v) => ({ ...v, [field.key]: e.target.value }))
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="pt-3">
            <Button variant="primary" label="Save measurements" onPress={handleSave} />
          </div>
        </div>
      </BottomSheet>
    </>
  )
}

export default function Progress() {
  const [tab, setTab] = useState<TabName>('Training')

  return (
    <>
      <TopBar title="PROGRESS" />
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <div className="pt-4">
          <SegmentedControl active={tab} onChange={setTab} />
        </div>
        {tab === 'Training' && <TrainingTab />}
        {tab === 'Body Scan' && <BodyScanTab />}
        {tab === 'Measure' && <MeasureTab />}
      </div>
    </>
  )
}
