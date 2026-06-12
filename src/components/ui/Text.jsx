import { memo } from 'react'
import { typography } from '../../styles/tokens'

const VARIANT_MAP = {
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

function Text({ variant = 'body', children, className = '', as }) {
  const { tag, cls } = VARIANT_MAP[variant] || VARIANT_MAP.body
  const Tag = as || tag
  return <Tag className={`${cls} ${className}`}>{children}</Tag>
}

export default memo(Text)
