import { describe, it, expect } from 'vitest'
import {
  buildCompletedSets,
  isDeloadActive,
  applyVolumeFactor,
  applyConditioningDeload,
} from './progression'

describe('buildCompletedSets', () => {
  const odinSets = [
    { set_number: 1, target_reps: 8, rpe_ceiling: 8 },
    { set_number: 2, target_reps: 8, rpe_ceiling: 8 },
  ]

  it('matches completed working sets to their prescribed set by set_number', () => {
    const logs = [
      { set_number: 1, reps: 8, rpe: 7, completed: true, is_mm_set: false },
      { set_number: 2, reps: 9, rpe: 6, completed: true, is_mm_set: false },
    ]
    expect(buildCompletedSets(logs, odinSets)).toEqual([
      { target_reps: 8, rpe_ceiling: 8, reps_achieved: 8, rpe_reported: 7 },
      { target_reps: 8, rpe_ceiling: 8, reps_achieved: 9, rpe_reported: 6 },
    ])
  })

  it('drops uncompleted, myo-match, and RPE-less sets', () => {
    const logs = [
      { set_number: 1, reps: 8, rpe: 7, completed: false, is_mm_set: false },
      { set_number: 2, reps: 8, rpe: 7, completed: true, is_mm_set: true },
      { set_number: 1, reps: 8, rpe: null, completed: true, is_mm_set: false },
    ]
    expect(buildCompletedSets(logs, odinSets)).toEqual([])
  })

  it('drops sets with no matching prescribed set_number', () => {
    const logs = [{ set_number: 5, reps: 8, rpe: 7, completed: true, is_mm_set: false }]
    expect(buildCompletedSets(logs, odinSets)).toEqual([])
  })
})

describe('isDeloadActive', () => {
  it('is false with no pending deload', () => {
    expect(isDeloadActive(null, '2026-07-15')).toBe(false)
  })

  it('is true within the 7-day window after checked_at', () => {
    const pending = { checked_at: '2026-07-15T00:00:00.000Z' }
    expect(isDeloadActive(pending, '2026-07-15')).toBe(true)
    expect(isDeloadActive(pending, '2026-07-20')).toBe(true)
  })

  it('is false before checked_at or once the window has passed', () => {
    const pending = { checked_at: '2026-07-15T00:00:00.000Z' }
    expect(isDeloadActive(pending, '2026-07-14')).toBe(false)
    expect(isDeloadActive(pending, '2026-07-22')).toBe(false)
  })
})

describe('applyVolumeFactor', () => {
  it('scales the set count and keeps the rep count', () => {
    expect(applyVolumeFactor('4×8', 0.7)).toBe('3×8')
  })

  it('never scales below 1 set', () => {
    expect(applyVolumeFactor('1×8', 0.7)).toBe('1×8')
  })
})

describe('applyConditioningDeload', () => {
  it('scales duration and target_rpe by the given factors', () => {
    const items = [{ duration_min: 20, target_rpe: 8 }]
    expect(
      applyConditioningDeload(items, { conditioning_factor: 0.8, effort_factor: 0.8 })
    ).toEqual([{ duration_min: 16, target_rpe: 6 }])
  })

  it('leaves fields unchanged when no matching factor is given', () => {
    const items = [{ duration_min: 20, target_rpe: null }]
    expect(applyConditioningDeload(items, { conditioning_factor: 0.8 })).toEqual([
      { duration_min: 16, target_rpe: null },
    ])
  })
})
