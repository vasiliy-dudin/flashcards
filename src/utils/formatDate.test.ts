import { describe, expect, it } from 'vitest'
import { formatDate } from './formatDate'

describe('formatDate', () => {
  it('returns a non-empty string', () => {
    expect(formatDate('2026-04-07')).toBeTruthy()
  })

  it('includes the day number in the output', () => {
    expect(formatDate('2026-04-07')).toContain('7')
  })

  it('includes the 2-digit year in the output', () => {
    expect(formatDate('2026-04-07')).toContain('26')
  })

  it('handles the first day of a month', () => {
    const result = formatDate('2026-01-01')
    expect(result).toBeTruthy()
    expect(result).toContain('1')
  })

  it('handles the last day of a year', () => {
    const result = formatDate('2026-12-31')
    expect(result).toBeTruthy()
    expect(result).toContain('31')
  })

  it('does not return the raw ISO string', () => {
    const input = '2026-04-07'
    expect(formatDate(input)).not.toBe(input)
  })
})
