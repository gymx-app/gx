import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowUp, ChevronLeft, FileText, Minus } from 'lucide-react'
import ScanHistoryRow from '../components/progress/ScanHistoryRow'
import { mockScanHistory, type ScanEntry } from '../components/progress/scanData'
import { SectionLabel, Text } from '../components/ui'
import { colors } from '../styles/tokens'

type Trend = 'up' | 'down' | 'flat'

function trendFor(current: string | number, previous: string | number | null): Trend {
  if (previous === null) return 'flat'
  const cur = typeof current === 'number' ? current : parseFloat(current)
  const prev = typeof previous === 'number' ? previous : parseFloat(previous)
  if (cur > prev) return 'up'
  if (cur < prev) return 'down'
  return 'flat'
}

function TrendIcon({ trend }: { trend: Trend }) {
  if (trend === 'up') return <ArrowUp size={15} strokeWidth={2.5} color={colors.success} />
  if (trend === 'down') return <ArrowDown size={15} strokeWidth={2.5} color={colors.success} />
  return <Minus size={15} strokeWidth={2.5} color={colors.muted} />
}

function MetricRow({
  label,
  value,
  trend,
  isLast,
}: {
  label: string
  value: string
  trend: Trend
  isLast: boolean
}) {
  return (
    <div
      className="flex items-center justify-between py-[14px]"
      style={isLast ? undefined : { borderBottom: `1px solid ${colors.borderSubtle}` }}
    >
      <span className="text-[16px]" style={{ color: colors.text }}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-[15px]" style={{ color: colors.textSecondary }}>
          {value}
        </span>
        <TrendIcon trend={trend} />
      </div>
    </div>
  )
}

export default function ScanReport() {
  const navigate = useNavigate()
  const location = useLocation()
  const scan = (location.state as { scan?: ScanEntry } | null)?.scan

  const scanIndex = scan ? mockScanHistory.findIndex((s) => s.date === scan.date) : -1
  const previousScan = scanIndex >= 0 ? (mockScanHistory[scanIndex + 1] ?? null) : null

  const metrics = scan
    ? [
        { label: 'Weight', value: scan.weight, previous: previousScan?.weight ?? null },
        {
          label: 'Muscle mass',
          value: scan.muscleMass,
          previous: previousScan?.muscleMass ?? null,
        },
        {
          label: 'Fat mass',
          value: scan.details.fatMass,
          previous: previousScan?.details.fatMass ?? null,
        },
        {
          label: 'Visceral fat',
          value: String(scan.details.visceralFat),
          previous: previousScan ? String(previousScan.details.visceralFat) : null,
        },
        {
          label: 'BMR',
          value: `${scan.details.bmr} kcal`,
          previous: previousScan?.details.bmr ?? null,
        },
        {
          label: 'Body water',
          value: scan.details.bodyWater,
          previous: previousScan?.details.bodyWater ?? null,
        },
        {
          label: 'Bone mineral',
          value: scan.details.boneMineral,
          previous: previousScan?.details.boneMineral ?? null,
        },
        {
          label: 'Protein mass',
          value: scan.details.proteinMass,
          previous: previousScan?.details.proteinMass ?? null,
        },
      ]
    : []

  return (
    <div className="app-shell" style={{ background: colors.bg }}>
      <div
        className="flex items-center gap-3 px-4 h-[52px] shrink-0"
        style={{ borderBottom: `1px solid ${colors.border}` }}
      >
        <button onClick={() => void navigate(-1)} aria-label="Back">
          <ChevronLeft size={22} color={colors.text} />
        </button>
        <Text variant="cardTitle">{scan ? scan.date : 'Scan report'}</Text>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {!scan ? (
          <Text variant="bodyMuted" className="text-center mt-8">
            Scan report not found.
          </Text>
        ) : (
          <>
            <div className="text-center mt-6">
              <Text variant="pageTitle">{scan.bodyFat}</Text>
              <Text variant="caption" className="mt-1">
                Body fat · {scan.isBaseline ? 'Baseline scan' : scan.delta}
              </Text>
              {scan.source && (
                <a
                  href={scan.source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-full text-[13px] font-bold"
                  style={{ border: `1.5px solid ${colors.border}`, color: colors.text }}
                >
                  <FileText size={14} strokeWidth={2} />
                  View source ({scan.source.type === 'pdf' ? 'PDF' : 'photo'})
                </a>
              )}
            </div>

            <div className="mt-6" style={{ borderTop: `1px solid ${colors.borderSubtle}` }}>
              {metrics.map((metric, i) => (
                <MetricRow
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                  trend={trendFor(metric.value, metric.previous)}
                  isLast={i === metrics.length - 1}
                />
              ))}
            </div>

            <SectionLabel label="Records" className="mt-8 mb-2" />
            <div style={{ borderTop: `1px solid ${colors.borderSubtle}` }}>
              {mockScanHistory.map((entry, i) => (
                <ScanHistoryRow
                  key={entry.date}
                  scan={entry}
                  isLast={i === mockScanHistory.length - 1}
                  isActive={entry.date === scan.date}
                  onPress={() =>
                    void navigate('/progress/scan', { state: { scan: entry }, replace: true })
                  }
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
