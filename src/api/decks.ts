import type { Deck } from '../types'

export async function fetchAllDecks(): Promise<Deck[]> {
  const res = await fetch('/api/decks')
  if (!res.ok) throw new Error(`Failed to fetch decks: ${res.status}`)
  return res.json() as Promise<Deck[]>
}

export async function createDeck(name: string): Promise<Deck> {
  const deck: Deck = {
    id: crypto.randomUUID(),
    name,
    parentId: null,
    createdAt: new Date().toISOString().slice(0, 10),
  }
  const res = await fetch('/api/decks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(deck),
  })
  if (!res.ok) throw new Error(`Failed to create deck: ${res.status}`)
  return res.json() as Promise<Deck>
}
