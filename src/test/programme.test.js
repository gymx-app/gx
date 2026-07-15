import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  toDateStr,
  getDayKey,
  getWeekNumber,
  getWeekDays,
  computePhaseAndWeek,
  isPastWeek,
  getMinWeekOffset,
  isProgrammeWeek1,
  getProgrammeWeekNumber,
} from '../utils/programme'

describe('toDateStr', () => {
  it('formats a Date object to YYYY-MM-DD', () => {
    const d = new Date(2024, 2, 15) // March 15, 2024
    expect(toDateStr(d)).toBe('2024-03-15')
  })

  it('zero-pads single-digit months and days', () => {
    const d = new Date(2024, 0, 5) // Jan 5
    expect(toDateStr(d)).toBe('2024-01-05')
  })

  it('handles end of year', () => {
    const d = new Date(2024, 11, 31) // Dec 31
    expect(toDateStr(d)).toBe('2024-12-31')
  })

  it('accepts a date string and returns normalized YYYY-MM-DD', () => {
    expect(toDateStr('2024-03-15')).toBe('2024-03-15')
  })

  it('handles string input without timezone shift via T00:00:00 anchoring', () => {
    expect(toDateStr('2024-01-01')).toBe('2024-01-01')
  })
})

describe('getDayKey', () => {
  it('returns MON for a Monday date', () => {
    // 2024-03-11 is a Monday
    expect(getDayKey('2024-03-11')).toBe('MON')
  })

  it('returns SUN for a Sunday date', () => {
    // 2024-03-17 is a Sunday
    expect(getDayKey('2024-03-17')).toBe('SUN')
  })

  it('returns FRI for a Friday Date object', () => {
    const d = new Date(2024, 2, 15) // March 15, 2024 (Friday)
    expect(getDayKey(d)).toBe('FRI')
  })

  it('returns SAT for a Saturday', () => {
    expect(getDayKey('2024-03-16')).toBe('SAT')
  })
})

describe('getWeekNumber', () => {
  it('returns 1 for the start date itself', () => {
    expect(getWeekNumber('2024-01-01', '2024-01-01')).toBe(1)
  })

  it('returns 1 for a date in the same week as start', () => {
    // 2024-01-01 is Monday; 2024-01-05 is Friday same week
    expect(getWeekNumber('2024-01-01', '2024-01-05')).toBe(1)
  })

  it('returns 2 for the Monday of the next week', () => {
    expect(getWeekNumber('2024-01-01', '2024-01-08')).toBe(2)
  })

  it('never returns less than 1', () => {
    // date before start date
    expect(getWeekNumber('2024-03-01', '2024-02-01')).toBe(1)
  })

  it('handles multi-week spans', () => {
    expect(getWeekNumber('2024-01-01', '2024-01-29')).toBe(5)
  })

  it('handles cross-year boundaries', () => {
    // 2023-12-25 is Monday, 2024-01-01 is next Monday
    expect(getWeekNumber('2023-12-25', '2024-01-01')).toBe(2)
  })
})

describe('getWeekDays', () => {
  beforeEach(() => {
    // Mock Date to a known Wednesday: 2024-03-13
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 2, 13, 12, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns 7 days for the current week when offset=0', () => {
    const days = getWeekDays(0)
    expect(days).toHaveLength(7)
  })

  it('starts on Monday and ends on Sunday', () => {
    const days = getWeekDays(0)
    expect(days[0].dayLabel).toBe('MON')
    expect(days[6].dayLabel).toBe('SUN')
  })

  it('returns correct dates for current week', () => {
    const days = getWeekDays(0)
    // 2024-03-13 is Wed, so Monday = 2024-03-11
    expect(days[0].dateStr).toBe('2024-03-11')
    expect(days[6].dateStr).toBe('2024-03-17')
  })

  it('offset=-1 gives previous week', () => {
    const days = getWeekDays(-1)
    expect(days[0].dateStr).toBe('2024-03-04')
    expect(days[6].dateStr).toBe('2024-03-10')
  })

  it('offset=+1 gives next week', () => {
    const days = getWeekDays(1)
    expect(days[0].dateStr).toBe('2024-03-18')
    expect(days[6].dateStr).toBe('2024-03-24')
  })

  it('each day has dayLabel, date, and dateStr properties', () => {
    const days = getWeekDays(0)
    for (const day of days) {
      expect(day).toHaveProperty('dayLabel')
      expect(day).toHaveProperty('date')
      expect(day).toHaveProperty('dateStr')
      expect(day.date).toBeInstanceOf(Date)
      expect(day.dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('dateStr matches the actual date object', () => {
    const days = getWeekDays(0)
    for (const day of days) {
      expect(toDateStr(day.date)).toBe(day.dateStr)
    }
  })
})

describe('computePhaseAndWeek', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Set to Wednesday 2024-03-13
    vi.setSystemTime(new Date(2024, 2, 13, 12, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns phase 1 week 1 with no sessions', () => {
    const result = computePhaseAndWeek([], {
      start_date: '2024-03-11',
      phase_weeks: [4, 4, 4],
      min_active_days: 4,
    })
    expect(result.phase).toBe(1)
    expect(result.weekInPhase).toBe(1)
    expect(result.qualifyingWeeks).toBe(0)
  })

  it('advances phase after enough qualifying weeks', () => {
    // Create 4 qualifying weeks of sessions (Mon-Thu each week, 4 days)
    const sessions = []
    for (let w = 0; w < 4; w++) {
      const monday = new Date(2024, 0, 8 + w * 7) // Mondays starting Jan 8
      for (let d = 0; d < 4; d++) {
        const date = new Date(monday)
        date.setDate(monday.getDate() + d)
        sessions.push({
          date: toDateStr(date),
          day_of_week: ['MON', 'TUE', 'WED', 'THU'][d],
        })
      }
    }

    const result = computePhaseAndWeek(sessions, {
      start_date: '2024-01-08',
      phase_weeks: [4, 4, 4],
      min_active_days: 4,
    })
    expect(result.phase).toBe(2)
    expect(result.qualifyingWeeks).toBe(4)
  })

  it('does not count Sunday sessions toward qualifying', () => {
    const sessions = [
      { date: '2024-01-14', day_of_week: 'SUN' },
      { date: '2024-01-15', day_of_week: 'MON' },
      { date: '2024-01-16', day_of_week: 'TUE' },
    ]
    const result = computePhaseAndWeek(sessions, {
      start_date: '2024-01-08',
      phase_weeks: [4, 4],
      min_active_days: 4,
    })
    // Only 2 qualifying days in week (Mon+Tue), needs 4
    expect(result.qualifyingWeeks).toBe(0)
  })

  it('computes totalWeek from start date to now', () => {
    const result = computePhaseAndWeek([], {
      start_date: '2024-03-11',
      phase_weeks: [4],
      min_active_days: 4,
    })
    // 2024-03-11 to 2024-03-13 (Wed) — same week
    expect(result.totalWeek).toBe(1)
  })

  it('does not count the current week as qualifying', () => {
    // Sessions in current week only
    const sessions = [
      { date: '2024-03-11', day_of_week: 'MON' },
      { date: '2024-03-12', day_of_week: 'TUE' },
      { date: '2024-03-13', day_of_week: 'WED' },
      { date: '2024-03-14', day_of_week: 'THU' },
    ]
    const result = computePhaseAndWeek(sessions, {
      start_date: '2024-03-04',
      phase_weeks: [4],
      min_active_days: 4,
    })
    // Current week is not counted as qualifying (still in progress)
    expect(result.qualifyingWeeks).toBe(0)
  })
})

describe('isPastWeek', () => {
  it('returns true for negative offset', () => {
    expect(isPastWeek(-1)).toBe(true)
    expect(isPastWeek(-10)).toBe(true)
  })

  it('returns false for zero (current week)', () => {
    expect(isPastWeek(0)).toBe(false)
  })

  it('returns false for positive offset', () => {
    expect(isPastWeek(1)).toBe(false)
  })
})

describe('getMinWeekOffset', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 2, 13, 12, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns -Infinity when no programmeStartDate', () => {
    expect(getMinWeekOffset(null)).toBe(-Infinity)
  })

  it('returns 0 when programme started this week', () => {
    expect(getMinWeekOffset('2024-03-11')).toEqual(-0)
  })

  it('returns negative offset for earlier start date', () => {
    // 2024-02-12 is 4 weeks before 2024-03-11
    expect(getMinWeekOffset('2024-02-12')).toBe(-4)
  })
})

describe('isProgrammeWeek1', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 2, 13, 12, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns false without programmeStartDate', () => {
    expect(isProgrammeWeek1(0, null)).toBe(false)
  })

  it('returns true when offset matches programme start week', () => {
    // Programme started 4 weeks ago → minOffset = -4
    expect(isProgrammeWeek1(-4, '2024-02-12')).toBe(true)
  })

  it('returns false when offset does not match', () => {
    expect(isProgrammeWeek1(-3, '2024-02-12')).toBe(false)
  })
})

describe('getProgrammeWeekNumber', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 2, 13, 12, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns 1 without programmeStartDate', () => {
    expect(getProgrammeWeekNumber(0, null)).toBe(1)
  })

  it('returns correct week number for current week', () => {
    // Programme started 2024-02-12, current is 2024-03-11 (week 5)
    expect(getProgrammeWeekNumber(0, '2024-02-12')).toBe(5)
  })

  it('returns week 1 for programme start week', () => {
    expect(getProgrammeWeekNumber(-4, '2024-02-12')).toBe(1)
  })

  it('returns higher week number for future offset', () => {
    const current = getProgrammeWeekNumber(0, '2024-02-12')
    const next = getProgrammeWeekNumber(1, '2024-02-12')
    expect(next).toBe(current + 1)
  })
})
