import { describe, expect, it } from 'vitest'
import { buildReviewQueue } from './buildReviewQueue'
import type { Card } from '../types'

const TODAY = '2026-04-08'
const YESTERDAY = '2026-04-07'
const TOMORROW = '2026-04-09'

function makeCard(overrides: Partial<Card> & { id: string }): Card {
  return {
    word: 'test',
    definition: 'test def',
    examples: [],
    dictionary: { transcription: '', meanings: [] },
    aiExample: '',
    audioUrl: null,
    deckId: 'd1',
    tags: [],
    interval: 10,
    dueDate: TODAY,
    createdAt: '2026-01-01',
    ...overrides,
  }
}

const BASE_CONFIG = {
  retireCards: false,
  maxIntervalDays: 365,
  limitNewCardsPerDay: null,
}

describe('buildReviewQueue', () => {
  it('includes cards due today or earlier, excludes future cards', () => {
    const cards = [
      makeCard({ id: 'past', dueDate: YESTERDAY }),
      makeCard({ id: 'today', dueDate: TODAY }),
      makeCard({ id: 'future', dueDate: TOMORROW }),
    ]
    const result = buildReviewQueue(cards, TODAY, BASE_CONFIG)
    expect(result.map(c => c.id)).toEqual(['past', 'today'])
  })

  it('sorts queue by dueDate ascending (oldest first)', () => {
    const cards = [
      makeCard({ id: 'b', dueDate: TODAY }),
      makeCard({ id: 'a', dueDate: YESTERDAY }),
    ]
    const result = buildReviewQueue(cards, TODAY, BASE_CONFIG)
    expect(result.map(c => c.id)).toEqual(['a', 'b'])
  })

  it('retireCards: true excludes cards with interval >= maxIntervalDays', () => {
    const cards = [
      makeCard({ id: 'active', interval: 100 }),
      makeCard({ id: 'retired', interval: 365 }),
      makeCard({ id: 'over', interval: 400 }),
    ]
    const result = buildReviewQueue(cards, TODAY, {
      ...BASE_CONFIG,
      retireCards: true,
      maxIntervalDays: 365,
    })
    expect(result.map(c => c.id)).toEqual(['active'])
  })

  it('retireCards: false keeps all cards regardless of interval', () => {
    const cards = [
      makeCard({ id: 'active', interval: 100 }),
      makeCard({ id: 'maxed', interval: 365 }),
    ]
    const result = buildReviewQueue(cards, TODAY, {
      ...BASE_CONFIG,
      retireCards: false,
      maxIntervalDays: 365,
    })
    expect(result).toHaveLength(2)
  })

  it('limitNewCardsPerDay caps new cards, keeps review cards', () => {
    // New card = interval 1 && dueDate === createdAt
    const cards = [
      makeCard({ id: 'new1', interval: 1, dueDate: '2026-01-01', createdAt: '2026-01-01' }),
      makeCard({ id: 'new2', interval: 1, dueDate: '2026-01-02', createdAt: '2026-01-02' }),
      makeCard({ id: 'new3', interval: 1, dueDate: '2026-01-03', createdAt: '2026-01-03' }),
      makeCard({ id: 'review', interval: 5, dueDate: YESTERDAY }),
    ]
    const result = buildReviewQueue(cards, TODAY, {
      ...BASE_CONFIG,
      limitNewCardsPerDay: 2,
    })
    const ids = result.map(c => c.id)
    expect(ids).toContain('new1')
    expect(ids).toContain('new2')
    expect(ids).not.toContain('new3')
    expect(ids).toContain('review')
  })

  it('limitNewCardsPerDay: null means unlimited new cards', () => {
    const cards = Array.from({ length: 10 }, (_, i) =>
      makeCard({ id: `new${i}`, interval: 1, dueDate: `2026-01-0${i + 1}`, createdAt: `2026-01-0${i + 1}` })
    )
    const result = buildReviewQueue(cards, TODAY, {
      ...BASE_CONFIG,
      limitNewCardsPerDay: null,
    })
    expect(result).toHaveLength(10)
  })

  it('retireCards + limitNewCardsPerDay both apply together', () => {
    const cards = [
      makeCard({ id: 'retired', interval: 365 }),
      makeCard({ id: 'new1', interval: 1, dueDate: TODAY, createdAt: TODAY }),
      makeCard({ id: 'new2', interval: 1, dueDate: TODAY, createdAt: TODAY }),
      makeCard({ id: 'review', interval: 5 }),
    ]
    const result = buildReviewQueue(cards, TODAY, {
      retireCards: true,
      maxIntervalDays: 365,
      limitNewCardsPerDay: 1,
    })
    const ids = result.map(c => c.id)
    expect(ids).not.toContain('retired')
    expect(ids).toContain('new1')
    expect(ids).not.toContain('new2')
    expect(ids).toContain('review')
  })
})
