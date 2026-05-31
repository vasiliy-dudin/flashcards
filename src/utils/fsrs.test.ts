import { describe, expect, it } from 'vitest'
import { scheduleCardFsrs, type FsrsConfig, type FsrsGrade } from './fsrs'
import { DEFAULT_SETTINGS } from '../types'
import type { Card } from '../types'

const today = new Date().toISOString().slice(0, 10)

const TEST_CONFIG: FsrsConfig = {
  fsrsTargetRetention: 0.9,
  fsrsParameters: DEFAULT_SETTINGS.fsrsParameters,
  maxIntervalDays: 365,
  applyFuzzing: false,
}

const NEW_CARD: Card = {
  id: '1',
  word: 'ephemeral',
  definition: 'lasting a very short time',
  examples: [],
  dictionary: { transcription: '', meanings: [] },
  aiExample: '',
  audioUrl: null,
  deckId: 'd1',
  tags: [],
  interval: 1,
  dueDate: today,
  createdAt: today,
  inReview: true,
  archived: false,
  stability: null,
  difficulty: null,
}

// Card due today → elapsed = interval + 0 overdue = deterministic
const REVIEWED_CARD: Card = {
  ...NEW_CARD,
  stability: 10,
  difficulty: 5,
  interval: 10,
  dueDate: today,
}

const w = DEFAULT_SETTINGS.fsrsParameters

describe('scheduleCardFsrs — first review (stability = null)', () => {
  it.each([1, 2, 3, 4] as FsrsGrade[])('grade %i: stability equals w[grade - 1]', (grade) => {
    const result = scheduleCardFsrs(NEW_CARD, grade, TEST_CONFIG)
    expect(result.stability).toBeCloseTo(w[grade - 1], 6)
  })

  it('grade Again (1): difficulty is clamped to [1, 10]', () => {
    const result = scheduleCardFsrs(NEW_CARD, 1, TEST_CONFIG)
    expect(result.difficulty).toBeGreaterThanOrEqual(1)
    expect(result.difficulty).toBeLessThanOrEqual(10)
  })

  it('grade Easy (4): difficulty is clamped to 1 (formula gives negative without clamp)', () => {
    const result = scheduleCardFsrs(NEW_CARD, 4, TEST_CONFIG)
    expect(result.difficulty).toBe(1)
  })

  it('interval is at least 1 for all grades', () => {
    for (const grade of [1, 2, 3, 4] as FsrsGrade[]) {
      expect(scheduleCardFsrs(NEW_CARD, grade, TEST_CONFIG).interval).toBeGreaterThanOrEqual(1)
    }
  })

  it('first-review interval respects targetRetention: lower retention → longer interval', () => {
    const highRetention = scheduleCardFsrs(NEW_CARD, 3, { ...TEST_CONFIG, fsrsTargetRetention: 0.95 })
    const lowRetention = scheduleCardFsrs(NEW_CARD, 3, { ...TEST_CONFIG, fsrsTargetRetention: 0.80 })
    expect(lowRetention.interval).toBeGreaterThan(highRetention.interval)
  })

  it('dueDate is a valid YYYY-MM-DD string after today', () => {
    const result = scheduleCardFsrs(NEW_CARD, 3, TEST_CONFIG)
    expect(result.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.dueDate >= today).toBe(true)
  })
})

describe('scheduleCardFsrs — subsequent review', () => {
  it('recall (grade Good): stability increases', () => {
    const result = scheduleCardFsrs(REVIEWED_CARD, 3, TEST_CONFIG)
    expect(result.stability).toBeGreaterThan(REVIEWED_CARD.stability!)
  })

  it('recall (grade Easy): stability increases more than Good', () => {
    const good = scheduleCardFsrs(REVIEWED_CARD, 3, TEST_CONFIG)
    const easy = scheduleCardFsrs(REVIEWED_CARD, 4, TEST_CONFIG)
    expect(easy.stability).toBeGreaterThan(good.stability!)
  })

  it('recall (grade Hard): stability increases less than Good', () => {
    const hard = scheduleCardFsrs(REVIEWED_CARD, 2, TEST_CONFIG)
    const good = scheduleCardFsrs(REVIEWED_CARD, 3, TEST_CONFIG)
    expect(hard.stability).toBeLessThan(good.stability!)
  })

  it('lapse (grade Again): stability decreases', () => {
    const result = scheduleCardFsrs(REVIEWED_CARD, 1, TEST_CONFIG)
    expect(result.stability).toBeLessThan(REVIEWED_CARD.stability!)
  })

  it('caps interval at maxIntervalDays', () => {
    const highStabilityCard: Card = { ...REVIEWED_CARD, stability: 1000, interval: 365 }
    const result = scheduleCardFsrs(highStabilityCard, 3, { ...TEST_CONFIG, maxIntervalDays: 30 })
    expect(result.interval).toBeLessThanOrEqual(30)
  })

  it('applyFuzzing false: same result across multiple calls', () => {
    const results = Array.from({ length: 10 }, () =>
      scheduleCardFsrs(REVIEWED_CARD, 3, TEST_CONFIG)
    )
    const intervals = new Set(results.map(r => r.interval))
    expect(intervals.size).toBe(1)
  })

  it('applyFuzzing true: introduces variation over many calls', () => {
    const config: FsrsConfig = { ...TEST_CONFIG, applyFuzzing: true }
    const card: Card = { ...REVIEWED_CARD, stability: 50, interval: 50 }
    const intervals = new Set(
      Array.from({ length: 30 }, () => scheduleCardFsrs(card, 3, config).interval)
    )
    expect(intervals.size).toBeGreaterThan(1)
  })
})
