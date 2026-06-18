import { memo, type ReactNode, type ElementType } from 'react'
import { typography, type TypographyVariant } from '../../styles/tokens'

const VARIANT_MAP: Record<TypographyVariant, { tag: ElementType; cls: string }> = {
  pageTitle: { tag: 'h1', cls: typography.pageTitle },
  sectionTitle: { tag: 'h2', cls: typography.sectionTitle },
  cardTitle: { tag: 'h3', cls: typography.cardTitle },
  label: { tag: 'span', cls: typography.label },
  micro: { tag: 'span', cls: typography.micro },
  body: { tag: 'p', cls: typography.body },
  bodyMuted: { tag: 'p', cls: typography.bodyMuted },
  caption: { tag: 'p', cls: typography.caption },
  stat: { tag: 'span', cls: typography.stat },
}

interface TextProps {
  variant?: TypographyVariant
  children: ReactNode
  className?: string
  as?: ElementType
  role?: string
}

function Text({ variant = 'body', children, className = '', as }: TextProps) {
  const { tag, cls } = VARIANT_MAP[variant] || VARIANT_MAP.body
  const Tag = as ?? tag
  return <Tag className={`${cls} ${className}`}>{children}</Tag>
}

export default memo(Text)
