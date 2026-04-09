// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { mochiCardToCard } from './mochi-import.js'
import type { MochiCard } from './mochi-import.js'

const TODAY = '2026-04-09'

const SAMPLE_CARD_WITH_REVIEWS: MochiCard = {
  '~:name': 'ephemeral',
  '~:fields': {
    '~:name':     { '~:id': '~:name',     '~:value': 'ephemeral' },
    '~:SkjKVjf7': { '~:id': '~:SkjKVjf7', '~:value': 'lasting for a very short time' },
  },
  '~:tags': { '~#set': ['adjective', 'vocabulary'] },
  '~:reviews': [
    // First review has no interval (as in real Mochi exports)
    { '~:date': '~t1704067200000', '~:remembered?': true },
    // Subsequent reviews have interval
    { '~:date': '~t1704153600000', '~:interval': 1.5, '~:remembered?': true },
    { '~:date': '~t1712620800000', '~:interval': 3.2, '~:remembered?': true },
  ],
  '~:created-at': { '~#dt': 1703980800000 }, // 2023-12-31T00:00:00Z
  '~:deck-id': 'original-deck-id',
}

const SAMPLE_CARD_NO_REVIEWS: MochiCard = {
  '~:name': 'serendipity',
  '~:fields': {
    '~:name':     { '~:id': '~:name',     '~:value': 'serendipity' },
    '~:SkjKVjf7': { '~:id': '~:SkjKVjf7', '~:value': 'finding something good without looking for it' },
  },
  '~:deck-id': 'original-deck-id',
}

const SAMPLE_CARD_FIRST_REVIEW_ONLY: MochiCard = {
  '~:name': 'tenacious',
  '~:fields': {
    '~:name':     { '~:id': '~:name',     '~:value': 'tenacious' },
    '~:SkjKVjf7': { '~:id': '~:SkjKVjf7', '~:value': 'holding firm' },
  },
  '~:reviews': [
    { '~:date': '~t1704067200000', '~:remembered?': true }, // no interval
  ],
  '~:deck-id': 'original-deck-id',
}

describe('mochiCardToCard', () => {
  it('maps word correctly (from ~:name field)', () => {
    const card = mochiCardToCard(SAMPLE_CARD_WITH_REVIEWS, 'deck-1', 'card-1', TODAY)
    expect(card.word).toBe('ephemeral')
  })

  it('maps definition from the non-name field', () => {
    const card = mochiCardToCard(SAMPLE_CARD_WITH_REVIEWS, 'deck-1', 'card-1', TODAY)
    expect(card.definition).toBe('lasting for a very short time')
  })

  it('maps tags from ~#set array', () => {
    const card = mochiCardToCard(SAMPLE_CARD_WITH_REVIEWS, 'deck-1', 'card-1', TODAY)
    expect(card.tags).toEqual(['adjective', 'vocabulary'])
  })

  it('rounds interval from last review that has one', () => {
    const card = mochiCardToCard(SAMPLE_CARD_WITH_REVIEWS, 'deck-1', 'card-1', TODAY)
    expect(card.interval).toBe(3) // 3.2 rounded
  })

  it('computes dueDate as last-review-with-interval date + interval', () => {
    // last review with interval: 2024-04-09 + 3 days = 2024-04-12
    const card = mochiCardToCard(SAMPLE_CARD_WITH_REVIEWS, 'deck-1', 'card-1', TODAY)
    expect(card.dueDate).toBe('2024-04-12')
  })

  it('maps createdAt from ~#dt milliseconds', () => {
    const card = mochiCardToCard(SAMPLE_CARD_WITH_REVIEWS, 'deck-1', 'card-1', TODAY)
    expect(card.createdAt).toBe('2023-12-31T00:00:00.000Z')
  })

  it('uses provided deckId and cardId', () => {
    const card = mochiCardToCard(SAMPLE_CARD_WITH_REVIEWS, 'deck-abc', 'card-xyz', TODAY)
    expect(card.deckId).toBe('deck-abc')
    expect(card.id).toBe('card-xyz')
  })

  it('sets audioUrl to null', () => {
    const card = mochiCardToCard(SAMPLE_CARD_WITH_REVIEWS, 'deck-1', 'card-1', TODAY)
    expect(card.audioUrl).toBeNull()
  })

  it('initializes empty AI and dictionary fields', () => {
    const card = mochiCardToCard(SAMPLE_CARD_WITH_REVIEWS, 'deck-1', 'card-1', TODAY)
    expect(card.examples).toEqual([])
    expect(card.aiExample).toBe('')
    expect(card.dictionary).toEqual({ transcription: '', meanings: [] })
  })

  it('uses interval=1 and dueDate=today for cards with no reviews', () => {
    const card = mochiCardToCard(SAMPLE_CARD_NO_REVIEWS, 'deck-1', 'card-2', TODAY)
    expect(card.interval).toBe(1)
    expect(card.dueDate).toBe(TODAY)
  })

  it('uses interval=1 and dueDate=today when only first review exists (no interval)', () => {
    const card = mochiCardToCard(SAMPLE_CARD_FIRST_REVIEW_ONLY, 'deck-1', 'card-3', TODAY)
    expect(card.interval).toBe(1)
    expect(card.dueDate).toBe(TODAY)
  })

  it('handles missing tags gracefully', () => {
    const card = mochiCardToCard(SAMPLE_CARD_NO_REVIEWS, 'deck-1', 'card-2', TODAY)
    expect(card.tags).toEqual([])
  })
})
