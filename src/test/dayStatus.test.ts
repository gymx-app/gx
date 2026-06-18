import { describe, it, expect } from 'vitest'
import { getDayStatus } from '../utils/dayStatus'

describe('getDayStatus', () => {
  const noCompleted = new Set<string>()
  const noRest = new Set<number>()

  describe('pre_programme', () => {
    it('returns pre_programme when date is before programmeStartDate', () => {
      expect(getDayStatus('2024-01-01', noCompleted, noRest, '2024-02-01', '2024-03-01', 0)).toBe(
        'pre_programme'
      )
    })

    it('returns pre_programme for the day before programme start', () => {
      expect(getDayStatus('2024-01-31', noCompleted, noRest, '2024-02-01', '2024-03-01', 2)).toBe(
        'pre_programme'
      )
    })
  })

  describe('rest day', () => {
    it('returns rest when dayIndex is in restDayIndices', () => {
      const restDays = new Set([6]) // Sunday
      expect(getDayStatus('2024-03-10', noCompleted, restDays, '2024-01-01', '2024-03-15', 6)).toBe(
        'rest'
      )
    })

    it('rest takes priority over completed', () => {
      const completed = new Set(['2024-03-10'])
      const restDays = new Set([6])
      expect(getDayStatus('2024-03-10', completed, restDays, '2024-01-01', '2024-03-15', 6)).toBe(
        'rest'
      )
    })
  })

  describe('completed', () => {
    it('returns completed when date is in completedDates', () => {
      const completed = new Set(['2024-03-11'])
      expect(getDayStatus('2024-03-11', completed, noRest, '2024-01-01', '2024-03-15', 0)).toBe(
        'completed'
      )
    })

    it('returns completed even when date is today', () => {
      const today = '2024-03-15'
      const completed = new Set([today])
      expect(getDayStatus(today, completed, noRest, '2024-01-01', today, 4)).toBe('completed')
    })
  })

  describe('today', () => {
    it('returns today when date equals todayStr and no session', () => {
      expect(getDayStatus('2024-03-15', noCompleted, noRest, '2024-01-01', '2024-03-15', 4)).toBe(
        'today'
      )
    })
  })

  describe('skipped', () => {
    it('returns skipped for past date with no session and not rest', () => {
      expect(getDayStatus('2024-03-10', noCompleted, noRest, '2024-01-01', '2024-03-15', 0)).toBe(
        'skipped'
      )
    })
  })

  describe('future', () => {
    it('returns future for date after today', () => {
      expect(getDayStatus('2024-03-20', noCompleted, noRest, '2024-01-01', '2024-03-15', 2)).toBe(
        'future'
      )
    })
  })

  describe('edge cases', () => {
    it('programmeStartDate === today returns today (not pre_programme)', () => {
      const today = '2024-03-15'
      expect(getDayStatus(today, noCompleted, noRest, today, today, 4)).toBe('today')
    })

    it('null programmeStartDate skips pre_programme check', () => {
      expect(getDayStatus('2020-01-01', noCompleted, noRest, null, '2024-03-15', 2)).toBe('skipped')
    })

    it('priority order: pre_programme > rest > completed > today > skipped > future', () => {
      const date = '2024-01-15'
      const completed = new Set([date])
      const restDays = new Set([0])

      // pre_programme wins over everything
      expect(getDayStatus(date, completed, restDays, '2024-02-01', date, 0)).toBe('pre_programme')
    })

    it('completed on a past date returns completed, not skipped', () => {
      const completed = new Set(['2024-03-01'])
      expect(getDayStatus('2024-03-01', completed, noRest, '2024-01-01', '2024-03-15', 4)).toBe(
        'completed'
      )
    })

    it('string comparison handles year boundaries correctly', () => {
      expect(getDayStatus('2023-12-31', noCompleted, noRest, '2024-01-01', '2024-03-15', 6)).toBe(
        'pre_programme'
      )
    })
  })
})
