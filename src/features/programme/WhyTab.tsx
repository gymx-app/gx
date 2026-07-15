import { Text, Card, SectionLabel } from '../../components/ui'
import CitationChip from '../../components/programme/CitationChip'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = any

interface WhyTabProps {
  narratives: AnyData
  narrativesUnavailable: boolean
  citations: AnyData[]
  phases: AnyData[]
  onCitationTap: (code: string) => void
}

function citationLookup(citations: AnyData[]) {
  const map = new Map<string, AnyData>()
  for (const c of citations) map.set(c.code, c)
  return map
}

function CitationChips({
  codes,
  citations,
  onTap,
}: {
  codes: string[] | undefined
  citations: AnyData[]
  onTap: (code: string) => void
}) {
  if (!codes || codes.length === 0) return null
  const map = citationLookup(citations)
  return (
    <div className="flex flex-wrap mt-1">
      {codes.map((code) => {
        const c = map.get(code)
        if (!c) return null
        return <CitationChip key={code} author={c.author} year={c.year} onTap={() => onTap(code)} />
      })}
    </div>
  )
}

export default function WhyTab({
  narratives,
  narrativesUnavailable,
  citations,
  phases,
  onCitationTap,
}: WhyTabProps) {
  if (narrativesUnavailable || !narratives) {
    return (
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8">
        <Card>
          <Text variant="body">Detailed explanations aren't available for this programme.</Text>
          <Text variant="bodyMuted" className="mt-2">
            This happens occasionally — your programme is still fully valid, just without the
            extended reasoning breakdown.
          </Text>
        </Card>
      </div>
    )
  }

  const phaseNarratives: AnyData[] = narratives.phases ?? []
  const dayPatterns: AnyData[] = narratives.day_patterns ?? []
  const finishers: AnyData[] = narratives.conditioning_finishers ?? []

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 space-y-4">
      {narratives.overall?.text && (
        <Text variant="body" className="!text-[15px] leading-relaxed">
          {narratives.overall.text}
        </Text>
      )}
      {narratives.overall?.citation_codes?.length > 0 && (
        <CitationChips
          codes={narratives.overall.citation_codes}
          citations={citations}
          onTap={onCitationTap}
        />
      )}

      {phaseNarratives.length > 0 && (
        <>
          <SectionLabel label="Phases" />
          <div className="space-y-2">
            {phaseNarratives.map((n: AnyData, idx: number) => (
              <Card key={n.phase_id ?? idx}>
                <Text variant="cardTitle" className="!text-[15px]">
                  {phases[idx]?.name ?? `Phase ${idx + 1}`}
                </Text>
                <Text variant="bodyMuted" className="mt-1.5">
                  {n.narrative?.text}
                </Text>
                <CitationChips
                  codes={n.narrative?.citation_codes}
                  citations={citations}
                  onTap={onCitationTap}
                />
              </Card>
            ))}
          </div>
        </>
      )}

      {dayPatterns.length > 0 && (
        <>
          <SectionLabel label="Training Split" />
          <div className="space-y-2">
            {dayPatterns.map((n: AnyData, idx: number) => (
              <Card key={n.pattern_label ?? idx}>
                <Text variant="cardTitle" className="!text-[15px]">
                  {n.pattern_label}
                </Text>
                <Text variant="bodyMuted" className="mt-1.5">
                  {n.narrative?.text}
                </Text>
                <CitationChips
                  codes={n.narrative?.citation_codes}
                  citations={citations}
                  onTap={onCitationTap}
                />
              </Card>
            ))}
          </div>
        </>
      )}

      {finishers.length > 0 && (
        <>
          <SectionLabel label="Conditioning" />
          <div className="space-y-2">
            {finishers.map((n: AnyData, idx: number) => (
              <Card key={n.day_id ?? idx}>
                <Text variant="bodyMuted">{n.narrative?.text}</Text>
                <CitationChips
                  codes={n.narrative?.citation_codes}
                  citations={citations}
                  onTap={onCitationTap}
                />
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
