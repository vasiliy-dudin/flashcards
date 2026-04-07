import { describe, expect, it } from 'vitest'
import { getCardDueStatus } from './cardStatus'

function offsetDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

describe('getCardDueStatus', () => {
  it('returns "overdue" for a date in the past', () => {
    expect(getCardDueStatus(offsetDate(-1))).toBe('overdue')
  })

  it('returns "overdue" for a date far in the past', () => {
    expect(getCardDueStatus('2020-01-01')).toBe('overdue')
  })

  it('returns "due" for today\'s date', () => {
    const today = new Date().toISOString().slice(0, 10)
    expect(getCardDueStatus(today)).toBe('due')
  })

  it('returns "future" for a date tomorrow', () => {
    expect(getCardDueStatus(offsetDate(1))).toBe('future')
  })

  it('returns "future" for a date far in the future', () => {
    expect(getCardDueStatus('2099-12-31')).toBe('future')
  })
})
