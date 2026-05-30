import { beforeEach, describe, expect, it } from 'vitest'
import 'fake-indexeddb/auto'

import type { Card, Deck, Tag } from '../types'
import {
  addPendingReview,
  clearPendingReviews,
  db,
  loadCards,
  loadDecks,
  loadPendingReviews,
  loadTags,
  saveCards,
  saveDecks,
  saveTags,
} from './offline-store'

const MOCK_CARD: Card = {
  id: 'card-1',
  word: 'serendipity',
  definition: 'happy accident',
  examples: [],
  dictionary: { transcription: 'ˌserənˈdɪpɪti', meanings: ['a pleasant surprise'] },
  aiExample: 'It was pure serendipity.',
  audioUrl: '/audio/serendipity.mp3',
  deckId: 'deck-1',
  tags: [],
  interval: 1,
  dueDate: '2026-06-01',
  createdAt: '2026-05-30',
  inReview: false,
  archived: false,
}

const MOCK_DECK: Deck = {
  id: 'deck-1',
  name: 'My Deck',
  parentId: null,
  createdAt: '2026-05-30',
}

const MOCK_TAG: Tag = { name: 'grammar', cardCount: 3 }

beforeEach(async () => {
  await db.cards.clear()
  await db.decks.clear()
  await db.tags.clear()
  await db.pendingReviews.clear()
})

describe('cards', () => {
  it('saves and loads cards', async () => {
    await saveCards([MOCK_CARD])
    const result = await loadCards()
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(MOCK_CARD)
  })

  it('bulkPut overwrites on re-sync', async () => {
    await saveCards([MOCK_CARD])
    await saveCards([{ ...MOCK_CARD, interval: 5 }])
    const result = await loadCards()
    expect(result).toHaveLength(1)
    expect(result[0].interval).toBe(5)
  })
})

describe('decks', () => {
  it('saves and loads decks', async () => {
    await saveDecks([MOCK_DECK])
    const result = await loadDecks()
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(MOCK_DECK)
  })
})

describe('tags', () => {
  it('saves and loads tags', async () => {
    await saveTags([MOCK_TAG])
    const result = await loadTags()
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(MOCK_TAG)
  })
})

describe('pendingReviews', () => {
  it('adds a pending review with auto-generated id', async () => {
    await addPendingReview({ cardId: 'card-1', interval: 5, dueDate: '2026-06-05', reviewedAt: '2026-05-30T10:00:00Z' })
    const result = await loadPendingReviews()
    expect(result).toHaveLength(1)
    expect(result[0].cardId).toBe('card-1')
    expect(result[0].id).toBeTruthy()
  })

  it('clears all pending reviews', async () => {
    await addPendingReview({ cardId: 'card-1', interval: 5, dueDate: '2026-06-05', reviewedAt: '2026-05-30T10:00:00Z' })
    await clearPendingReviews()
    expect(await loadPendingReviews()).toHaveLength(0)
  })
})
