/** Design tokens — single source of truth for all visual values. */

export const colors = {
  // Page backgrounds — dead flat
  bg: '#0a0a0a',
  bgSubtle: '#0d0d0d',

  // Elevation levels — z-axis depth
  elevation0: '#0a0a0a',
  elevation1: '#111111',
  elevation2: '#161616',
  elevation3: '#1c1c1c',
  elevation4: '#222222',
  elevation5: '#2a2a2a',

  // Borders per elevation
  borderSubtle: '#111111',
  borderDefault: '#1a1a1a',
  borderElevated: '#222222',
  borderFocus: '#ff4520',

  // Text
  textPrimary: '#ffffff',
  textSecondary: '#888888',
  textMuted: '#555555',
  textDim: '#333333',
  textGhost: '#1a1a1a',

  // Accent
  accent: '#ff4520',
  accentHover: '#e03a1a',
  accentMuted: 'rgba(255,69,32,0.12)',

  // Status
  success: '#22c55e',
  successMuted: 'rgba(34,197,94,0.12)',
  warning: '#f59e0b',
  error: '#ef4444',
}

export const shadows = {
  card: '0 1px 3px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.03) inset',
  cardElevated: '0 4px 12px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.05) inset',
  sheet: '0 -4px 24px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.04) inset',
  button: '0 1px 0 rgba(255,255,255,0.08) inset, 0 2px 4px rgba(0,0,0,0.3)',
  buttonAccent: '0 1px 0 rgba(255,255,255,0.15) inset, 0 2px 8px rgba(255,69,32,0.3)',
  input: '0 1px 0 rgba(255,255,255,0.03) inset, 0 1px 3px rgba(0,0,0,0.3)',
  nav: '0 -1px 0 rgba(255,255,255,0.04)',
}

export const gradients = {
  buttonAccent: 'linear-gradient(180deg, #ff5533 0%, #ff4520 100%)',
  buttonSecondary: 'linear-gradient(180deg, #1e1e1e 0%, #161616 100%)',
  buttonSuccess: 'linear-gradient(180deg, #25d366 0%, #22c55e 100%)',
  card: 'linear-gradient(180deg, #141414 0%, #111111 100%)',
  cardElevated: 'linear-gradient(180deg, #1a1a1a 0%, #161616 100%)',
  sheet: 'linear-gradient(180deg, #141414 0%, #111111 100%)',
  nav: 'linear-gradient(180deg, #131313 0%, #0f0f0f 100%)',
  input: 'linear-gradient(180deg, #191919 0%, #161616 100%)',
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
