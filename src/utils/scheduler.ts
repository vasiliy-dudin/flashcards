import type { Card, SettingsConfig } from '../types'

export const REMEMBER_MULTIPLIER = 1.8
export const FORGET_MULTIPLIER = 0.5
export const MAX_INTERVAL_DAYS = 365

const FUZZ_FACTOR = 0.1

export type ReviewResult = 'remember' | 'forget'

export type ScheduleConfig = Pick<SettingsConfig, 'rememberMultiplier' | 'forgetMultiplier' | 'maxIntervalDays' | 'applyFuzzing'>

const DEFAULT_SCHEDULE_CONFIG: ScheduleConfig = {
  rememberMultiplier: REMEMBER_MULTIPLIER,
  forgetMultiplier: FORGET_MULTIPLIER,
  maxIntervalDays: MAX_INTERVAL_DAYS,
  applyFuzzing: true,
}

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
export function scheduleCard(
  card: Card,
  result: ReviewResult,
  config: ScheduleConfig = DEFAULT_SCHEDULE_CONFIG,
): Pick<Card, 'interval' | 'dueDate'> {
  const multiplier = result === 'remember' ? config.rememberMultiplier : config.forgetMultiplier
  const effectiveInterval = Math.max(1, card.interval)
  const rawInterval = Math.min(Math.round(effectiveInterval * multiplier), config.maxIntervalDays)
  const fuzzed = config.applyFuzzing ? applyFuzz(rawInterval) : rawInterval
  const newInterval = Math.min(fuzzed, config.maxIntervalDays)
  return { interval: newInterval, dueDate: addDays(new Date(), newInterval) }
}
