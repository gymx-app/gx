import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, ChevronRight, Upload } from 'lucide-react'
import TopBar from '../components/layout/TopBar'
import PrRow from '../components/progress/PrRow'
import { CURATED_PRS } from '../components/progress/prData'
import ScanHistoryRow from '../components/progress/ScanHistoryRow'
import { mockScanHistory } from '../components/progress/scanData'
import {
  BottomSheet,
  Button,
  Card,
  ProgressBar,
  SectionLabel,
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

const REMINDER_OPTIONS = [
  { label: 'Weekly reminder', sublabel: 'Every 7 days', days: 7 },
  { label: 'Fortnightly reminder', sublabel: 'Every 15 days', days: 15 },
  { label: 'Monthly reminder', sublabel: 'Every 30 days', days: 30 },
  { label: 'Bi-monthly reminder', sublabel: 'Every 60 days', days: 60 },
] as const
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
  const [showReminderSheet, setShowReminderSheet] = useState(false)
  const [reminderDays, setReminderDays] = useState<number>(mockReminder.cycleLength)

  const daysUntilDue = reminderDays - mockReminder.dayCount
  const reminderPercent = Math.min(100, Math.round((mockReminder.dayCount / reminderDays) * 100))

  return (
    <>
      <Card className="mt-4">
        <div className="flex items-center justify-between">
          <Text variant="body" className="!text-[15px] font-semibold">
            {daysUntilDue > 0 ? `Next scan due in ${daysUntilDue} days` : 'Scan overdue'}
          </Text>
          <button
            onClick={() => setShowReminderSheet(true)}
            className="text-[15px] font-semibold shrink-0"
            style={{ color: colors.accent }}
          >
            Edit
          </button>
        </div>
        <div className="mt-3">
          <ProgressBar progress={reminderPercent} color="accent" height={6} />
        </div>
        <Text variant="caption" className="mt-1.5">
          Reminds every {reminderDays} days · day {mockReminder.dayCount} of {reminderDays}
        </Text>
      </Card>

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

      <BottomSheet isOpen={showReminderSheet} onClose={() => setShowReminderSheet(false)}>
        <div className="px-4 pb-6">
          <Text variant="cardTitle" className="mb-2">
            Reminder frequency
          </Text>
          {REMINDER_OPTIONS.map((option, i) => {
            const isSelected = option.days === reminderDays
            return (
              <button
                key={option.days}
                onClick={() => {
                  setReminderDays(option.days)
                  setShowReminderSheet(false)
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

function ComingSoonTab({ label }: { label: string }) {
  return (
    <Card className="mt-4">
      <Text variant="cardTitle">{label}</Text>
      <Text variant="bodyMuted" className="mt-1">
        Coming soon.
      </Text>
    </Card>
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
        {tab === 'Measure' && <ComingSoonTab label="Measure" />}
      </div>
    </>
  )
}
