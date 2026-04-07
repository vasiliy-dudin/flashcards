import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { deleteCard, getAllCards, getCard, saveCard } from './index'
import type { Card } from '../types'

const TEST_CARD: Card = {
  id: 'card-1',
  word: 'serendipity',
  definition: 'The occurrence of happy events by chance.',
  examples: ['It was pure serendipity that we met.'],
  usageNotes: 'Formal register, often used in written English.',
  audioUrl: null,
  deckId: 'deck-1',
  tags: ['vocabulary'],
  interval: 1,
  dueDate: '2026-04-07',
  createdAt: '2026-04-07T00:00:00.000Z',
}

beforeEach(() => {
  // Fresh in-memory IDB instance per test — avoids blocked deleteDatabase
  globalThis.indexedDB = new IDBFactory()
})

describe('IndexedDB abstraction', () => {
  it('saves and retrieves a card by id', async () => {
    await saveCard(TEST_CARD)
    const result = await getCard(TEST_CARD.id)
    expect(result).toEqual(TEST_CARD)
  })

  it('returns undefined for a missing card', async () => {
    const result = await getCard('nonexistent')
    expect(result).toBeUndefined()
  })

  it('retrieves all saved cards', async () => {
    const card2: Card = { ...TEST_CARD, id: 'card-2', word: 'ephemeral' }
    await saveCard(TEST_CARD)
    await saveCard(card2)
    const all = await getAllCards()
    expect(all).toHaveLength(2)
  })

  it('deletes a card', async () => {
    await saveCard(TEST_CARD)
    await deleteCard(TEST_CARD.id)
    const result = await getCard(TEST_CARD.id)
    expect(result).toBeUndefined()
  })
})
