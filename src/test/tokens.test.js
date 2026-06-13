import { describe, it, expect } from 'vitest'
import { colors, radius, typography, shadows } from '../styles/tokens'

describe('Design tokens', () => {
  it('exports all required color groups', () => {
    expect(colors.bg).toBeDefined()
    expect(colors.surface).toBeDefined()
    expect(colors.text).toBeDefined()
    expect(colors.accent).toBeDefined()
    expect(colors.success).toBeDefined()
    expect(colors.error).toBeDefined()
  })

  it('has semantic text color tokens', () => {
    expect(colors.textSecondary).toBe('#aaaaaa')
    expect(colors.placeholder).toBe('#444444')
    expect(colors.disabled).toBe('#555555')
    expect(colors.muted).toBe('#666666')
  })

  it('uses warm cream for primary text, not pure white', () => {
    expect(colors.text).toBe('#f0ede8')
    expect(colors.text).not.toBe('#ffffff')
  })

  it('has consistent surface hierarchy (darker → lighter)', () => {
    const toNum = hex => parseInt(hex.replace('#', ''), 16)
    expect(toNum(colors.bg)).toBeLessThan(toNum(colors.surface))
    expect(toNum(colors.surface)).toBeLessThan(toNum(colors.surface2))
    expect(toNum(colors.surface2)).toBeLessThan(toNum(colors.surface3))
  })

  it('exports radius tokens for all component types', () => {
    expect(radius.card).toBeDefined()
    expect(radius.button).toBeDefined()
    expect(radius.input).toBeDefined()
    expect(radius.pill).toBeDefined()
    expect(radius.sheet).toBeDefined()
    expect(radius.checkbox).toBeDefined()
  })

  it('exports typography presets', () => {
    expect(typography.pageTitle).toContain('Bebas_Neue')
    expect(typography.body).toContain('text-[14px]')
    expect(typography.label).toContain('uppercase')
  })

  it('uses flat shadows (gymtracker aesthetic)', () => {
    expect(shadows.card).toBe('none')
    expect(shadows.button).toBe('none')
    expect(shadows.nav).toBe('none')
  })
})
