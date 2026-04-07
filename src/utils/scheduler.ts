import type { Card } from '../types'

export const REMEMBER_MULTIPLIER = 1.8
export const FORGET_MULTIPLIER = 0.5
export const MAX_INTERVAL_DAYS = 365

const FUZZ_FACTOR = 0.1

export type ReviewResult = 'remember' | 'forget'

function applyFuzz(interval: number): number {
  const fuzz = interval * FUZZ_FACTOR * (Math.random() * 2 - 1)
  return Math.max(1, Math.round(interval + fuzz))
}

function addDays(base: Date, days: number): string {
  const result = new Date(base)
  result.setDate(result.getDate() + days)
  return result.toISOString().slice(0, 10)
}

/** Computes the new interval and due date for a reviewed card. */
export function scheduleCard(card: Card, result: ReviewResult): Pick<Card, 'interval' | 'dueDate'> {
  const multiplier = result === 'remember' ? REMEMBER_MULTIPLIER : FORGET_MULTIPLIER
  const effectiveInterval = Math.max(1, card.interval)
  const rawInterval = Math.min(Math.round(effectiveInterval * multiplier), MAX_INTERVAL_DAYS)
  const newInterval = Math.min(applyFuzz(rawInterval), MAX_INTERVAL_DAYS)
  return { interval: newInterval, dueDate: addDays(new Date(), newInterval) }
}
