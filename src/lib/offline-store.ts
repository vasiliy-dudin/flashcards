import Dexie, { type Table } from 'dexie'

import type { Card, Deck, Tag } from '../types'

export interface PendingReview {
  id: string
  cardId: string
  interval: number
  dueDate: string
  reviewedAt: string
  stability?: number | null
  difficulty?: number | null
}

class FlashcardsDb extends Dexie {
  cards!: Table<Card>
  decks!: Table<Deck>
  tags!: Table<Tag>
  pendingReviews!: Table<PendingReview>

  constructor() {
    super('flashcards-offline')
    this.version(1).stores({
      cards: 'id, deckId, dueDate',
      decks: 'id',
      tags: 'name',
      pendingReviews: 'id, cardId',
    })
  }
}

export const db = new FlashcardsDb()

export async function saveCards(cards: Card[]): Promise<void> {
  await db.cards.bulkPut(cards)
}

export async function loadCards(): Promise<Card[]> {
  return db.cards.toArray()
}

export async function saveDecks(decks: Deck[]): Promise<void> {
  await db.decks.bulkPut(decks)
}

export async function loadDecks(): Promise<Deck[]> {
  return db.decks.toArray()
}

export async function saveTags(tags: Tag[]): Promise<void> {
  await db.tags.bulkPut(tags)
}

export async function loadTags(): Promise<Tag[]> {
  return db.tags.toArray()
}

export async function addPendingReview(review: Omit<PendingReview, 'id'>): Promise<void> {
  await db.pendingReviews.add({ ...review, id: crypto.randomUUID() })
}

export async function loadPendingReviews(): Promise<PendingReview[]> {
  return db.pendingReviews.toArray()
}

export async function clearPendingReviews(): Promise<void> {
  await db.pendingReviews.clear()
}
