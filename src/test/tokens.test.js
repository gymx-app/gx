import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { describe, it, expect } from 'vitest'
import { colors, radius, typography, shadows } from '../styles/tokens'

// Colors live in styles/globals.css (:root), not as literals in tokens.ts —
// resolve the CSS custom properties here so the semantic invariants below
// stay meaningful across palette changes instead of pinning exact hex values.
const cssPath = join(dirname(fileURLToPath(import.meta.url)), '../styles/globals.css')
const css = readFileSync(cssPath, 'utf-8')
const rawVars = Object.fromEntries(
  [...css.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()])
)
const resolveVar = (value, seen = new Set()) => {
  const match = value.match(/^var\(--([\w-]+)\)$/)
  if (!match) return value
  const name = match[1]
  if (seen.has(name)) throw new Error(`circular var reference: --${name}`)
  return resolveVar(rawVars[name], new Set(seen).add(name))
}
const cssVar = (name) => resolveVar(rawVars[name])
const toNum = (hex) => parseInt(hex.replace('#', ''), 16)

describe('Design tokens', () => {
  it('exports all required color groups', () => {
    expect(colors.bg).toBeDefined()
    expect(colors.surface).toBeDefined()
    expect(colors.text).toBeDefined()
    expect(colors.accent).toBeDefined()
    expect(colors.success).toBeDefined()
    expect(colors.error).toBeDefined()
  })

  it('exposes colors as CSS var references, not hardcoded hex', () => {
    for (const value of Object.values(colors)) {
      expect(value).toMatch(/^var\(--[\w-]+\)$/)
    }
  })

  it('has semantic text color tokens that resolve to distinct colors', () => {
    const values = [
      cssVar('text-secondary'),
      cssVar('placeholder'),
      cssVar('disabled'),
      cssVar('muted'),
    ]
    for (const v of values) expect(v).toMatch(/^#[0-9a-f]{6}$/i)
    expect(new Set(values).size).toBe(values.length)
  })

  it('uses a warm/soft primary text color, not pure white', () => {
    expect(cssVar('text').toLowerCase()).not.toBe('#ffffff')
  })

  it('has consistent surface hierarchy (darker → lighter)', () => {
    expect(toNum(cssVar('bg'))).toBeLessThan(toNum(cssVar('surface')))
    expect(toNum(cssVar('surface'))).toBeLessThan(toNum(cssVar('surface-2')))
    expect(toNum(cssVar('surface-2'))).toBeLessThan(toNum(cssVar('surface-3')))
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
