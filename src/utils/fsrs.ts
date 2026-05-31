import type { Card, SettingsConfig } from '../types'

export type FsrsGrade = 1 | 2 | 3 | 4

export type FsrsConfig = Pick<SettingsConfig, 'fsrsTargetRetention' | 'fsrsParameters' | 'maxIntervalDays' | 'applyFuzzing'>

/** Exponent in the power forgetting curve. */
const DECAY = -0.5
/** Scaling factor derived from DECAY so that R(S, S) = 0.9 exactly. */
const FACTOR = Math.pow(0.9, 1 / DECAY) - 1
const MS_PER_DAY = 86_400_000

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function addDays(base: Date, days: number): string {
  const result = new Date(base)
  result.setDate(result.getDate() + days)
  return result.toISOString().slice(0, 10)
}

function initialDifficulty(grade: FsrsGrade, w: number[]): number {
  return clamp(w[4] - Math.exp(w[5] * (grade - 1)) + 1, 1, 10)
}

function retrievability(elapsed: number, stability: number): number {
  return Math.pow(1 + FACTOR * elapsed / stability, DECAY)
}

function nextInterval(stability: number, targetRetention: number, maxIntervalDays: number): number {
  const days = (stability / FACTOR) * (Math.pow(targetRetention, 1 / DECAY) - 1)
  return clamp(Math.round(days), 1, maxIntervalDays)
}

function updateDifficulty(d: number, grade: FsrsGrade, w: number[]): number {
  const nextD = d - w[6] * (grade - 3)
  const d0Easy = initialDifficulty(4, w)
  return clamp(w[7] * d0Easy + (1 - w[7]) * nextD, 1, 10)
}

function recallStability(d: number, s: number, r: number, grade: FsrsGrade, w: number[]): number {
  const hardPenalty = grade === 2 ? w[15] : 1
  const easyBonus = grade === 4 ? w[16] : 1
  const increase = (
    Math.exp(w[8]) *
    (11 - d) *
    Math.pow(s, -w[9]) *
    (Math.exp(w[10] * (1 - r)) - 1) *
    hardPenalty *
    easyBonus
  )
  return s * (increase + 1)
}

function lapseStability(d: number, s: number, r: number, w: number[]): number {
  const newS = w[11] * Math.pow(d, -w[12]) * (Math.pow(s + 1, w[13]) - 1) * Math.exp(w[14] * (1 - r))
  return Math.min(newS, s)
}

function applyFuzz(interval: number, enabled: boolean): number {
  if (!enabled) return interval
  const fuzz = interval * 0.1 * (Math.random() * 2 - 1)
  return Math.max(1, Math.round(interval + fuzz))
}

/** Elapsed days since last review, accounting for overdue reviews. */
function elapsedSinceLastReview(card: Card): number {
  const daysOverdue = Math.round(
    (Date.now() - new Date(card.dueDate).getTime()) / MS_PER_DAY
  )
  return Math.max(1, card.interval + daysOverdue)
}

/** Computes the new FSRS memory state and schedule for a reviewed card. */
export function scheduleCardFsrs(
  card: Card,
  grade: FsrsGrade,
  config: FsrsConfig,
): Pick<Card, 'interval' | 'dueDate' | 'stability' | 'difficulty'> {
  const w = config.fsrsParameters

  if (card.stability === null) {
    const stability = w[grade - 1]
    const difficulty = initialDifficulty(grade, w)
    const rawInterval = nextInterval(stability, config.fsrsTargetRetention, config.maxIntervalDays)
    const interval = applyFuzz(rawInterval, config.applyFuzzing)
    return { interval, dueDate: addDays(new Date(), interval), stability, difficulty }
  }

  const elapsed = elapsedSinceLastReview(card)
  const r = retrievability(elapsed, card.stability)
  const prevDifficulty = card.difficulty ?? initialDifficulty(3, w)
  const difficulty = updateDifficulty(prevDifficulty, grade, w)
  const stability = grade === 1
    ? lapseStability(difficulty, card.stability, r, w)
    : recallStability(difficulty, card.stability, r, grade, w)
  const rawInterval = nextInterval(stability, config.fsrsTargetRetention, config.maxIntervalDays)
  const interval = applyFuzz(rawInterval, config.applyFuzzing)
  return { interval, dueDate: addDays(new Date(), interval), stability, difficulty }
}
