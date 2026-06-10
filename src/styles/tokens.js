/** Design tokens — single source of truth for all visual values. */

export const colors = {
  bg: '#0a0a0a',
  elevated: '#111111',
  card: '#1a1a1a',
  input: '#161616',
  border: '#1a1a1a',
  borderActive: '#2a2a2a',
  borderFocus: '#ff4520',
  textPrimary: '#ffffff',
  textSecondary: '#888888',
  textMuted: '#555555',
  textDim: '#444444',
  textGhost: '#2a2a2a',
  accent: '#ff4520',
  accentHover: '#e03a1a',
  accentMuted: 'rgba(255,69,32,0.12)',
  success: '#22c55e',
  successMuted: 'rgba(34,197,94,0.12)',
  warning: '#f59e0b',
  error: '#ef4444',
}

export const typography = {
  pageTitle: 'text-4xl font-black tracking-[-0.04em] text-white leading-none',
  sectionTitle: 'text-2xl font-black tracking-[-0.03em] text-white',
  label: 'text-[11px] tracking-[0.08em] uppercase text-[#555555] font-medium',
  body: 'text-[15px] text-white leading-relaxed',
  bodyMuted: 'text-[15px] text-[#888888] leading-relaxed',
  caption: 'text-[13px] text-[#555555]',
  stat: 'text-[40px] font-black tracking-[-0.04em] text-white leading-none',
}

export const spacing = {
  pagePadding: 'px-4',
  sectionGap: 'mt-6',
  cardPadding: 'p-4',
}
