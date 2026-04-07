import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { deleteCard, deleteDeck, deleteTag, getAllCards, getAllDecks, getAllTags, getCard, getDeck, saveCard, saveDeck, saveTag } from './index'
import type { Card, Deck, Tag } from '../types'

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

const TEST_DECK: Deck = {
  id: 'deck-1',
  name: 'My Deck',
  parentId: null,
  createdAt: '2026-04-07T00:00:00.000Z',
}

const TEST_TAG: Tag = {
  name: 'vocabulary',
  cardCount: 1,
}

beforeEach(() => {
  // Fresh in-memory IDB instance per test — avoids blocked deleteDatabase
  globalThis.indexedDB = new IDBFactory()
})

describe('cards', () => {
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

describe('decks', () => {
  it('saves and retrieves a deck by id', async () => {
    await saveDeck(TEST_DECK)
    const result = await getDeck(TEST_DECK.id)
    expect(result).toEqual(TEST_DECK)
  })

  it('retrieves all saved decks', async () => {
    const deck2: Deck = { ...TEST_DECK, id: 'deck-2', name: 'Sub-deck' }
    await saveDeck(TEST_DECK)
    await saveDeck(deck2)
    const all = await getAllDecks()
    expect(all).toHaveLength(2)
  })

  it('deletes a deck', async () => {
    await saveDeck(TEST_DECK)
    await deleteDeck(TEST_DECK.id)
    const result = await getDeck(TEST_DECK.id)
    expect(result).toBeUndefined()
  })
})

describe('tags', () => {
  it('saves and retrieves all tags', async () => {
    await saveTag(TEST_TAG)
    const all = await getAllTags()
    expect(all).toEqual([TEST_TAG])
  })

  it('deletes a tag by name', async () => {
    await saveTag(TEST_TAG)
    await deleteTag(TEST_TAG.name)
    const all = await getAllTags()
    expect(all).toHaveLength(0)
  })
})
