/**
 * Thin reference layer over the CSS custom properties in styles/globals.css,
 * which is the single source of truth for the color scheme. Never add a
 * literal hex here (or anywhere else) — add a var to globals.css instead.
 */
export const colors = {
  bg: 'var(--bg)',
  bgSubtle: 'var(--bg-subtle)',

  surface: 'var(--surface)',
  surface2: 'var(--surface-2)',
  surface3: 'var(--surface-3)',

  border: 'var(--border)',
  borderSubtle: 'var(--border-subtle)',
  borderFocus: 'var(--border-focus)',
  mutedBorder: 'var(--muted-border)',

  text: 'var(--text)',
  textSecondary: 'var(--text-secondary)',
  muted: 'var(--muted)',
  placeholder: 'var(--placeholder)',
  disabled: 'var(--disabled)',
  white: 'var(--white)',

  accent: 'var(--accent)',
  accentMuted: 'var(--accent-muted)',

  success: 'var(--success)',
  successMuted: 'var(--success-muted)',
  warning: 'var(--warning)',
  warningMuted: 'var(--warning-muted)',
  error: 'var(--error)',
  errorMuted: 'var(--error-muted)',
  dangerBorder: 'var(--danger-border)',

  orange: 'var(--orange)',
  orangeMuted: 'var(--orange-muted)',
  blue: 'var(--blue)',
  blueMuted: 'var(--blue-muted)',
  purple: 'var(--purple)',
  purpleMuted: 'var(--purple-muted)',
  yellow: 'var(--yellow)',
  yellowMuted: 'var(--yellow-muted)',
  cyan: 'var(--cyan)',
  cyanMuted: 'var(--cyan-muted)',
  gold: 'var(--warning)',
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
  pageTitle: "font-['Bebas_Neue'] text-[32px] tracking-[2px] text-text leading-none",
  sectionTitle: "font-['Bebas_Neue'] text-[24px] tracking-[2px] text-text leading-none",
  cardTitle: "font-['Bebas_Neue'] text-[20px] tracking-[1.5px] text-text",
  body: 'text-[14px] text-text leading-relaxed',
  bodyMuted: 'text-[13px] text-muted leading-relaxed',
  caption: 'text-[12px] text-muted',
  label: 'text-[10px] font-bold tracking-[2px] uppercase text-muted',
  micro: 'text-[9px] font-bold tracking-[0.5px] uppercase text-muted',
  stat: "font-['Bebas_Neue'] text-[26px] text-text leading-none",
} as const

export type TypographyVariant = keyof typeof typography

export const spacing = {
  pagePadding: 'px-4',
  sectionGap: 'mt-3',
  cardPadding: 'p-4',
  contentTop: 'pt-2.5',
} as const
