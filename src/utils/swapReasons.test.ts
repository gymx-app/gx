import { describe, it, expect } from 'vitest'
import { humanizeSwapReasons, getSharedRationale } from './swapReasons'

describe('humanizeSwapReasons', () => {
  it('maps same-group + movement-pattern overlap to a plain "works the same muscles" phrase', () => {
    expect(
      humanizeSwapReasons(['same substitution group', 'shared movement pattern: horizontal_push'])
    ).toEqual(['Works the same muscles in a similar way'])
  })

  it('maps shared primary muscles to a body-region phrase', () => {
    expect(humanizeSwapReasons(['shared primary muscle: quadriceps, glutes'])).toEqual([
      'Targets your legs the same way',
    ])
  })

  it('combines both when both are present, capped at 2 phrases', () => {
    expect(
      humanizeSwapReasons([
        'same substitution group',
        'shared movement pattern: horizontal_push',
        'shared primary muscle: chest',
      ])
    ).toEqual(['Works the same muscles in a similar way', 'Targets your chest the same way'])
  })

  it('joins multiple distinct regions with "and", sorted for consistency', () => {
    expect(humanizeSwapReasons(['shared primary muscle: chest, biceps'])).toEqual([
      'Targets your arms and chest the same way',
    ])
  })

  it('produces an identical phrase regardless of muscle list order (so consolidation is not defeated by ordering noise)', () => {
    const a = humanizeSwapReasons(['shared primary muscle: back, upper_back'])
    const b = humanizeSwapReasons(['shared primary muscle: upper_back, back'])
    expect(a).toEqual(b)
  })

  it('dedupes muscles that map to the same region', () => {
    expect(humanizeSwapReasons(['shared primary muscle: quadriceps, hamstrings, glutes'])).toEqual([
      'Targets your legs the same way',
    ])
  })

  it('falls back to a humanized slug for an unrecognized muscle', () => {
    expect(humanizeSwapReasons(['shared primary muscle: some_new_tag'])).toEqual([
      'Targets your some new tag the same way',
    ])
  })

  it('ignores an empty movement-pattern list (no false-positive "works the same way")', () => {
    expect(humanizeSwapReasons(['shared movement pattern: '])).toEqual([
      'A close alternative for this exercise',
    ])
  })

  it('falls back to a generic phrase when no recognizable reason is present', () => {
    expect(humanizeSwapReasons([])).toEqual(['A close alternative for this exercise'])
    expect(humanizeSwapReasons(['some unrelated reason'])).toEqual([
      'A close alternative for this exercise',
    ])
  })
})

describe('getSharedRationale', () => {
  it('returns the phrase when every option has the identical rationale', () => {
    expect(
      getSharedRationale([
        'Works the same muscles in a similar way',
        'Works the same muscles in a similar way',
        'Works the same muscles in a similar way',
      ])
    ).toBe('Works the same muscles in a similar way')
  })

  it('returns null when rationale genuinely differs between options', () => {
    expect(
      getSharedRationale([
        'Works the same muscles in a similar way',
        'Targets your legs the same way',
      ])
    ).toBeNull()
  })

  it('returns null for a single option (nothing to consolidate)', () => {
    expect(getSharedRationale(['Works the same muscles in a similar way'])).toBeNull()
  })

  it('returns null for zero options', () => {
    expect(getSharedRationale([])).toBeNull()
  })
})
