/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst } from 'workbox-strategies'

import { clearPendingReviews, loadPendingReviews } from './lib/offline-store'
import { FLUSH_REVIEWS_SYNC_TAG } from './lib/sync-constants'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

interface SyncEvent extends ExtendableEvent {
  readonly tag: string
}

self.skipWaiting()

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

registerRoute(
  ({ url }) => url.pathname.startsWith('/audio/'),
  new CacheFirst({ cacheName: 'audio-v1' })
)

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({ cacheName: 'api-cache' })
)

self.addEventListener('sync', (event) => {
  const syncEvent = event as SyncEvent
  if (syncEvent.tag === FLUSH_REVIEWS_SYNC_TAG) {
    syncEvent.waitUntil(flushReviews())
  }
})

async function flushReviews(): Promise<void> {
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
