import { memo } from 'react'
import { colors, radius } from '../../styles/tokens'

interface CitationChipProps {
  author: string
  year: number | string
  onTap: () => void
}

function CitationChip({ author, year, onTap }: CitationChipProps) {
  return (
    <button
      onClick={onTap}
      className="text-[11px] font-['DM_Sans'] font-medium px-2 py-1 mr-1.5 mt-1.5 inline-block active:opacity-60"
      style={{
        background: colors.surface3,
        color: colors.textSecondary,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.chip,
        cursor: 'pointer',
      }}
    >
      {author} {year}
    </button>
  )
}

export default memo(CitationChip)
