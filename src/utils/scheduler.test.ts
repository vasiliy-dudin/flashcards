import { describe, expect, it } from 'vitest'
import {
  FORGET_MULTIPLIER,
  MAX_INTERVAL_DAYS,
  REMEMBER_MULTIPLIER,
  scheduleCard,
} from './scheduler'
import type { Card } from '../types'

const BASE_CARD: Card = {
  id: '1',
  word: 'ephemeral',
  definition: 'lasting a very short time',
  examples: [],
  dictionary: { transcription: '', meanings: [] },
  aiExample: '',
  audioUrl: null,
  deckId: 'd1',
  tags: [],
  interval: 10,
  dueDate: '2026-04-07',
  createdAt: '2026-04-01',
}

describe('scheduleCard', () => {
  it('remember: interval grows by REMEMBER_MULTIPLIER (±fuzz)', () => {
    // raw = round(10 * 1.8) = 18, fuzz ±10% → [16, 20]
    const expectedMin = Math.floor(10 * REMEMBER_MULTIPLIER * (1 - 0.1))
    const expectedMax = Math.ceil(10 * REMEMBER_MULTIPLIER * (1 + 0.1))
    const result = scheduleCard(BASE_CARD, 'remember')
    expect(result.interval).toBeGreaterThanOrEqual(expectedMin)
    expect(result.interval).toBeLessThanOrEqual(expectedMax)
  })

  it('forget: interval shrinks by FORGET_MULTIPLIER (±fuzz)', () => {
    // raw = round(10 * 0.5) = 5, fuzz ±10% → [4, 6]
    const expectedMin = Math.floor(10 * FORGET_MULTIPLIER * (1 - 0.1))
    const expectedMax = Math.ceil(10 * FORGET_MULTIPLIER * (1 + 0.1))
    const result = scheduleCard(BASE_CARD, 'forget')
    expect(result.interval).toBeGreaterThanOrEqual(expectedMin)
    expect(result.interval).toBeLessThanOrEqual(expectedMax)
  })

  it('caps interval at MAX_INTERVAL_DAYS regardless of fuzz', () => {
    const result = scheduleCard({ ...BASE_CARD, interval: 300 }, 'remember')
    expect(result.interval).toBeLessThanOrEqual(MAX_INTERVAL_DAYS)
  })

  it('interval is at least 1 for a new card (interval = 0)', () => {
    const result = scheduleCard({ ...BASE_CARD, interval: 0 }, 'forget')
    expect(result.interval).toBeGreaterThanOrEqual(1)
  })

  it('dueDate is a valid YYYY-MM-DD string after today', () => {
    const today = new Date().toISOString().slice(0, 10)
    const result = scheduleCard(BASE_CARD, 'remember')
    expect(result.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.dueDate > today).toBe(true)
  })
})

describe('scheduleCard — custom ScheduleConfig', () => {
  it('uses custom rememberMultiplier', () => {
    // interval 10, multiplier 3.0, no fuzz → raw = 30
    const result = scheduleCard(BASE_CARD, 'remember', {
      rememberMultiplier: 3.0,
      forgetMultiplier: 0.5,
      maxIntervalDays: 365,
      applyFuzzing: false,
    })
    expect(result.interval).toBe(30)
  })

  it('uses custom forgetMultiplier', () => {
    // interval 10, multiplier 0.2, no fuzz → raw = round(2) = 2
    const result = scheduleCard(BASE_CARD, 'forget', {
      rememberMultiplier: 1.8,
      forgetMultiplier: 0.2,
      maxIntervalDays: 365,
      applyFuzzing: false,
    })
    expect(result.interval).toBe(2)
  })

  it('caps at custom maxIntervalDays', () => {
    // interval 10, multiplier 3.0, no fuzz → raw 30, capped at 20
    const result = scheduleCard(BASE_CARD, 'remember', {
      rememberMultiplier: 3.0,
      forgetMultiplier: 0.5,
      maxIntervalDays: 20,
      applyFuzzing: false,
    })
    expect(result.interval).toBe(20)
  })

  it('applyFuzzing: false gives exact (deterministic) interval', () => {
    // interval 10, multiplier 1.8, no fuzz → exact 18 every time
    const results = Array.from({ length: 20 }, () =>
      scheduleCard(BASE_CARD, 'remember', {
        rememberMultiplier: 1.8,
        forgetMultiplier: 0.5,
        maxIntervalDays: 365,
        applyFuzzing: false,
      })
    )
    expect(results.every(r => r.interval === 18)).toBe(true)
  })

  it('applyFuzzing: true introduces variation over many runs', () => {
    const intervals = new Set(
      Array.from({ length: 30 }, () =>
        scheduleCard(BASE_CARD, 'remember', {
          rememberMultiplier: 1.8,
          forgetMultiplier: 0.5,
          maxIntervalDays: 365,
          applyFuzzing: true,
        }).interval
      )
    )
    // With fuzz ±10% on interval 18, we expect more than one distinct value across 30 runs
    expect(intervals.size).toBeGreaterThan(1)
  })
})
