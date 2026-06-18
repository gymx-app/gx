export const colors = {
  bg: '#0a0a0a',
  bgSubtle: '#0e0e0e',

  surface: '#141414',
  surface2: '#1c1c1c',
  surface3: '#242424',

  border: '#2a2a2a',
  borderSubtle: '#1c1c1c',
  borderFocus: '#ff4520',

  text: '#f0ede8',
  textSecondary: '#aaaaaa',
  muted: '#666666',
  dim: '#666666',
  placeholder: '#444444',
  disabled: '#555555',

  accent: '#ff4520',
  accentMuted: 'rgba(255,69,32,0.12)',

  success: '#22c55e',
  successMuted: 'rgba(34,197,94,0.15)',
  warning: '#f59e0b',
  error: '#ef4444',

  orange: '#ff8c00',
  blue: '#3b82f6',
  purple: '#a855f7',
  yellow: '#fbbf24',
  cyan: '#06b6d4',
  gold: '#f59e0b',
} as const

export type ColorToken = keyof typeof colors

export const shadows = {
  card: 'none',
  cardElevated: 'none',
  sheet: 'none',
  button: 'none',
  buttonAccent: 'none',
  input: 'none',
  nav: 'none',
  restTimer: '0 4px 20px rgba(0,0,0,0.4)',
  toggle: '0 1px 3px rgba(0,0,0,0.35)',
} as const

export const gradients = {
  buttonAccent: '#ff4520',
  buttonSecondary: '#242424',
  buttonSuccess: '#22c55e',
  card: '#141414',
  cardElevated: '#1c1c1c',
  sheet: '#141414',
  nav: '#141414',
  input: '#1c1c1c',
} as const

export const radius = {
  card: '16px',
  cardLg: '20px',
  settings: '14px',
  button: '12px',
  buttonSm: '11px',
  input: '10px',
  pill: '8px',
  chip: '10px',
  tag: '4px',
  checkbox: '5px',
  sheet: '20px 20px 0 0',
} as const

export type RadiusToken = keyof typeof radius

export const typography = {
  pageTitle: "font-['Bebas_Neue'] text-[32px] tracking-[2px] text-[#f0ede8] leading-none",
  sectionTitle: "font-['Bebas_Neue'] text-[24px] tracking-[2px] text-[#f0ede8] leading-none",
  cardTitle: "font-['Bebas_Neue'] text-[20px] tracking-[1.5px] text-[#f0ede8]",
  body: 'text-[14px] text-[#f0ede8] leading-relaxed',
  bodyMuted: 'text-[13px] text-[#666666] leading-relaxed',
  caption: 'text-[12px] text-[#666666]',
  label: 'text-[10px] font-bold tracking-[2px] uppercase text-[#666666]',
  micro: 'text-[9px] font-bold tracking-[0.5px] uppercase text-[#666666]',
  stat: "font-['Bebas_Neue'] text-[26px] text-[#f0ede8] leading-none",
} as const

export type TypographyVariant = keyof typeof typography

export const spacing = {
  pagePadding: 'px-4',
  sectionGap: 'mt-3',
  cardPadding: 'p-4',
  contentTop: 'pt-2.5',
} as const
