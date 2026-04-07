import type { Deck } from '../types'

export async function fetchAllDecks(): Promise<Deck[]> {
  const res = await fetch('/api/decks')
  if (!res.ok) throw new Error(`Failed to fetch decks: ${res.status}`)
  return res.json() as Promise<Deck[]>
}
