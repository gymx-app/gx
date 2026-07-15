import { colors } from '../../styles/tokens'
import { Text, Card, SectionLabel } from '../../components/ui'
import { describeReference } from '../../services/narrativeMatching'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = any

interface EvidenceTabProps {
  validationScore: number | null
  findings: AnyData[]
  citations: AnyData[] | null
  narratives: AnyData
  phases: AnyData[]
  highlightCode: string | null
  citationRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>
}

function scoreTier(score: number): { color: string; label: string } {
  if (score >= 90) return { color: colors.success, label: 'Fully validated — no issues found' }
  if (score >= 80) return { color: colors.success, label: 'Validated — minor notes below' }
  if (score >= 60)
    return { color: colors.warning, label: 'Validated with flags — see details below' }
  return { color: colors.error, label: 'Validated with flags — see details below' }
}

export default function EvidenceTab({
  validationScore,
  findings,
  citations,
  narratives,
  phases,
  highlightCode,
  citationRefs,
}: EvidenceTabProps) {
  const tier = validationScore != null ? scoreTier(validationScore) : null
  const flagged = (findings ?? []).filter((f) => f.severity === 'warning' || f.severity === 'error')

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 space-y-4">
      {validationScore != null && tier && (
        <Card>
          <div className="flex items-baseline gap-2">
            <span
              className="font-['Bebas_Neue'] text-[42px] leading-none"
              style={{ color: tier.color }}
            >
              {validationScore}
            </span>
            <span className="text-[14px] font-['DM_Sans']" style={{ color: colors.muted }}>
              /100
            </span>
          </div>
          <Text variant="bodyMuted" className="mt-1.5">
            {tier.label}
          </Text>

          {flagged.length > 0 && (
            <div className="mt-3 space-y-2">
              {flagged.map((f, i) => (
                <div
                  key={i}
                  className="text-[12px] font-['DM_Sans'] px-3 py-2"
                  style={{
                    background: `color-mix(in srgb, ${colors.warning} 9%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${colors.warning} 27%, transparent)`,
                    borderRadius: 8,
                    color: colors.textSecondary,
                  }}
                >
                  {f.message}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <SectionLabel label="Research Behind This Programme" />

      {!citations || citations.length === 0 ? (
        <Text variant="bodyMuted">
          No specific research citations available for this programme.
        </Text>
      ) : (
        <div className="space-y-2">
          {citations.map((c) => {
            const isHighlighted = highlightCode === c.code
            const refLabels = (c.referenced_by ?? []).map((r: string) =>
              describeReference(r, narratives, phases)
            )
            return (
              <div
                key={c.code}
                ref={(el) => {
                  citationRefs.current[c.code] = el
                }}
                className="p-4 transition-colors duration-700"
                style={{
                  background: isHighlighted
                    ? `color-mix(in srgb, ${colors.accent} 15%, ${colors.surface})`
                    : colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 16,
                }}
              >
                <Text variant="body" className="font-bold">
                  {c.author}, {c.year}
                </Text>
                <Text variant="bodyMuted" className="mt-1">
                  {c.finding}
                </Text>
                {refLabels.length > 0 && (
                  <Text variant="caption" className="mt-2">
                    Referenced in: {refLabels.join(', ')}
                  </Text>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
