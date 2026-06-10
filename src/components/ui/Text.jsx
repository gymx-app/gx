import { memo } from 'react'
import { typography } from '../../styles/tokens'

const VARIANT_MAP = {
  pageTitle: { tag: 'h1', cls: typography.pageTitle },
  sectionTitle: { tag: 'h2', cls: typography.sectionTitle },
  label: { tag: 'span', cls: typography.label },
  body: { tag: 'p', cls: typography.body },
  bodyMuted: { tag: 'p', cls: typography.bodyMuted },
  caption: { tag: 'p', cls: typography.caption },
  stat: { tag: 'span', cls: typography.stat },
}

/**
 * Polymorphic text component mapped to design tokens.
 * @param {{ variant: string, children: React.ReactNode, className?: string, as?: string }} props
 */
function Text({ variant = 'body', children, className = '', as }) {
  const { tag, cls } = VARIANT_MAP[variant] || VARIANT_MAP.body
  const Tag = as || tag
  return <Tag className={`${cls} ${className}`}>{children}</Tag>
}

export default memo(Text)
