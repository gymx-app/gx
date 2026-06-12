/** Design tokens — single source of truth for all visual values. */

export const colors = {
  bg: '#080808',
  bgSubtle: '#0e0e0e',

  elevation0: '#080808',
  elevation1: '#141414',
  elevation2: '#1a1a1a',
  elevation3: '#1e1e1e',
  elevation4: '#222222',
  elevation5: '#2a2a2a',

  borderSubtle: '#181818',
  borderDefault: '#202020',
  borderElevated: '#2a2a2a',
  borderFocus: '#ff4520',

  textPrimary: '#ffffff',
  textSecondary: '#888888',
  textMuted: '#666666',
  textDim: '#444444',
  textGhost: '#333333',

  accent: '#ff4520',
  accentHover: '#e03a1a',
  accentMuted: 'rgba(255,69,32,0.12)',

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
  card: 'linear-gradient(180deg, #161616 0%, #141414 100%)',
  cardElevated: 'linear-gradient(180deg, #1c1c1c 0%, #1a1a1a 100%)',
  sheet: 'linear-gradient(180deg, #141414 0%, #111111 100%)',
  nav: 'linear-gradient(180deg, #131313 0%, #0f0f0f 100%)',
  input: 'linear-gradient(180deg, #1e1e1e 0%, #1a1a1a 100%)',
}

export const typography = {
  pageTitle: 'text-[56px] font-black tracking-[-0.05em] text-white leading-[0.9]',
  sectionTitle: 'text-[36px] font-extrabold tracking-[-0.04em] text-white leading-none',
  cardTitle: 'text-[20px] font-bold tracking-[-0.03em] text-white',
  body: 'text-[15px] text-white leading-relaxed tracking-[-0.01em]',
  bodyMuted: 'text-[15px] text-[#666666] leading-relaxed tracking-[-0.01em]',
  caption: 'text-[12px] font-medium tracking-[0.02em] text-[#555555]',
  label: 'text-[11px] font-semibold tracking-[0.08em] uppercase text-[#444444]',
  micro: 'text-[10px] font-semibold tracking-[0.1em] uppercase text-[#333333]',
  stat: 'text-[40px] font-black tracking-[-0.04em] text-white leading-none',
}

export const spacing = {
  pagePadding: 'px-5',
  sectionGap: 'mt-7',
  cardPadding: 'p-4',
}
