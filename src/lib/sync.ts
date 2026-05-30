import { fetchAllCards } from '../api/cards'
import { fetchAllDecks } from '../api/decks'
import { fetchAllTags } from '../api/tags'
import { db, clearPendingReviews, loadPendingReviews } from './offline-store'
import { LAST_SYNCED_KEY } from './sync-constants'

export { FLUSH_REVIEWS_SYNC_TAG, LAST_SYNCED_KEY } from './sync-constants'

const AUDIO_CACHE_NAME = 'audio-v1'

export async function downloadAll(onProgress?: (done: number, total: number) => void): Promise<void> {
  const [cards, decks, tags] = await Promise.all([fetchAllCards(), fetchAllDecks(), fetchAllTags()])

  await db.transaction('rw', [db.cards, db.decks, db.tags], async () => {
    await Promise.all([db.cards.clear(), db.decks.clear(), db.tags.clear()])
    await Promise.all([db.cards.bulkPut(cards), db.decks.bulkPut(decks), db.tags.bulkPut(tags)])
  })

  const audioUrls = cards.map((c) => c.audioUrl).filter((url): url is string => url !== null)

  if ('caches' in globalThis && audioUrls.length > 0) {
    const cache = await caches.open(AUDIO_CACHE_NAME)
    let done = 0
    for (const url of audioUrls) {
      try {
        await cache.add(url)
      } catch {
        // audio file temporarily unavailable — skip, do not abort the sync
      }
      done += 1
      onProgress?.(done, audioUrls.length)
    }
  }

  localStorage.setItem(LAST_SYNCED_KEY, new Date().toISOString())
}

export async function flushPendingReviews(): Promise<void> {
  const pending = await loadPendingReviews()
  if (pending.length === 0) return

  const reviews = pending.map(({ cardId, interval, dueDate }) => ({ id: cardId, interval, dueDate }))

  const res = await fetch('/api/cards/bulk-review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reviews }),
  })

  if (!res.ok) throw new Error(`bulk-review failed: ${res.status}`)

  await clearPendingReviews()
}
