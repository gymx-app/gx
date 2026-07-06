import { Component, type ReactNode } from 'react'
import {
  Dumbbell,
  ChevronDown,
  Check,
  CheckCircle2,
  Loader2,
  X,
  AlertTriangle,
  Trash2,
} from 'lucide-react'
import {
  Text,
  Button,
  Input,
  Card,
  Badge,
  SectionLabel,
  Checkbox,
  Toggle,
  StatBlock,
  ProgressBar,
  Skeleton,
} from '../components/ui'
import { colors, radius, typography } from '../styles/tokens'

class SectionBoundary extends Component<
  { name: string; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (this.state.failed) {
      return (
        <p className="text-[13px] text-[#ef4444]">
          Component failed to render — check {this.props.name}.tsx
        </p>
      )
    }
    return this.props.children
  }
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <Text variant="sectionTitle" className="mb-4">
        {title}
      </Text>
      <SectionBoundary name={title}>{children}</SectionBoundary>
    </section>
  )
}

function DesignSystem() {
  return (
    <div className="min-h-screen px-4 pb-20 pt-6" style={{ background: colors.bg }}>
      <Text variant="pageTitle">GYMX DESIGN SYSTEM</Text>
      <Text variant="bodyMuted" className="mt-2 max-w-[520px]">
        Live component reference — reads real tokens.ts and ui/ components. Screenshot this page for
        design briefs. If this page is wrong, tokens.ts or a component is wrong — fix there, not
        here.
      </Text>

      <Section title="Colors">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {Object.entries(colors).map(([name, value]) => (
            <div key={name}>
              <div
                className="h-16 w-full"
                style={{
                  background: value,
                  borderRadius: radius.chip,
                  border: `1px solid ${colors.border}`,
                }}
              />
              <Text variant="caption" className="mt-1">
                {name}
              </Text>
              <Text variant="micro">{value}</Text>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div className="flex flex-col gap-3">
          {(Object.keys(typography) as Array<keyof typeof typography>).map((variant) => (
            <div key={variant} className="flex items-baseline gap-3">
              <Text variant={variant}>{variant}</Text>
              <Text variant="micro">{variant}</Text>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-col gap-3 max-w-[280px]">
          <Button variant="primary" label="Primary" onPress={() => {}} />
          <Button variant="secondary" label="Secondary" onPress={() => {}} />
          <Button variant="ghost" label="Ghost" onPress={() => {}} />
          <Button variant="success" label="Success" onPress={() => {}} />
          <Button variant="danger" label="Danger" onPress={() => {}} />
          <Button variant="primary" label="Disabled" disabled onPress={() => {}} />
          <Button variant="primary" label="Loading" loading onPress={() => {}} />
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge label="Strength" />
          <Badge label="Equipment: Barbell" />
          <Badge label="Completed" icon={<Check size={12} />} />
        </div>
      </Section>

      <Section title="Cards">
        <div className="flex flex-col gap-3">
          {(['default', 'elevated', 'accentLeft', 'successLeft', 'transparent'] as const).map(
            (variant) => (
              <Card key={variant} variant={variant}>
                <Text variant="cardTitle">{variant}</Text>
                <Text variant="bodyMuted" className="mt-1">
                  Example content inside a {variant} card.
                </Text>
              </Card>
            )
          )}
        </div>
      </Section>

      <Section title="Stat blocks">
        <Text variant="micro" className="mb-2 block">
          StatBlock has no delta/color prop — value, label, unit only.
        </Text>
        <div className="grid grid-cols-3 gap-3">
          <StatBlock value="+12" label="Volume" unit="%" />
          <StatBlock value="-4" label="Bodyweight" unit="kg" />
          <StatBlock value="0" label="Streak" unit="days" />
        </div>
      </Section>

      <Section title="Skeleton / loading states">
        <div className="flex flex-col gap-3 max-w-[280px]">
          <Skeleton height={14} width="60%" />
          <Skeleton height={14} width="90%" />
          <Skeleton height={80} width="100%" />
          <Skeleton height={40} width={40} className="rounded-full" />
        </div>
      </Section>

      <Section title="Progress bar">
        <div className="flex flex-col gap-3 max-w-[280px]">
          <ProgressBar progress={25} />
          <ProgressBar progress={60} color="success" />
          <ProgressBar progress={90} color="yellow" height={6} />
        </div>
      </Section>

      <Section title="Toggle">
        <div className="flex gap-4">
          <Toggle value={true} onChange={() => {}} />
          <Toggle value={false} onChange={() => {}} />
        </div>
      </Section>

      <Section title="Checkbox">
        <div className="flex gap-4">
          <Checkbox checked={true} />
          <Checkbox checked={false} />
        </div>
      </Section>

      <Section title="Section labels">
        <SectionLabel label="Example Section" />
      </Section>

      <Section title="Inputs">
        <div className="flex flex-col gap-4 max-w-[280px]">
          <Input
            variant="field"
            value=""
            onChange={() => {}}
            placeholder="Field input"
            label="Field"
          />
          <Input variant="large" value="185" onChange={() => {}} unit="lbs" />
        </div>
      </Section>

      <Section title="Border radius scale">
        <div className="flex flex-wrap gap-4">
          {Object.entries(radius).map(([name, value]) => (
            <div key={name} className="text-center">
              <div
                className="w-16 h-16"
                style={{
                  background: colors.surface2,
                  border: `1px solid ${colors.border}`,
                  borderRadius: value,
                }}
              />
              <Text variant="caption" className="mt-1">
                {name}
              </Text>
              <Text variant="micro">{value}</Text>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Icons">
        <div className="flex flex-wrap items-end gap-6">
          {[
            { Icon: Dumbbell, size: 24, color: colors.accent },
            { Icon: ChevronDown, size: 18, color: colors.muted },
            { Icon: Check, size: 16, color: colors.success },
            { Icon: CheckCircle2, size: 24, color: colors.success },
            { Icon: Loader2, size: 24, color: colors.accent },
            { Icon: X, size: 18, color: colors.muted },
            { Icon: AlertTriangle, size: 24, color: colors.warning },
            { Icon: Trash2, size: 18, color: colors.error },
          ].map(({ Icon, size, color }, i) => (
            <div key={i} className="text-center">
              <Icon size={size} strokeWidth={1.5} color={color} />
              <Text variant="micro" className="mt-1 block">
                {Icon.displayName ?? Icon.name}
              </Text>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

export default DesignSystem
