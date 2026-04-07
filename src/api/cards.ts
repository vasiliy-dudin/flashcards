import type { Card } from '../types'

export async function fetchAllCards(): Promise<Card[]> {
  const res = await fetch('/api/cards')
  if (!res.ok) throw new Error(`Failed to fetch cards: ${res.status}`)
  return res.json() as Promise<Card[]>
}

export async function createCard(card: Card): Promise<Card> {
  const res = await fetch('/api/cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(card),
  })
  if (!res.ok) throw new Error(`Failed to create card: ${res.status}`)
  return res.json() as Promise<Card>
}

export async function updateCard(id: string, patch: Partial<Card>): Promise<Card> {
  const res = await fetch(`/api/cards/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(`Failed to update card ${id}: ${res.status}`)
  return res.json() as Promise<Card>
}
