import type { Card, Deck, Tag } from '../types'

const DB_NAME = 'flashcards'
const DB_VERSION = 2
const STORE_CARDS = 'cards'
const STORE_DECKS = 'decks'
const STORE_TAGS = 'tags'

type StoreName = typeof STORE_CARDS | typeof STORE_DECKS | typeof STORE_TAGS

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_CARDS)) {
        db.createObjectStore(STORE_CARDS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_DECKS)) {
        db.createObjectStore(STORE_DECKS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_TAGS)) {
        // Tags use 'name' as the primary key (hierarchical path, e.g. "grammar/tense")
        db.createObjectStore(STORE_TAGS, { keyPath: 'name' })
      }
    }

    request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result)
    request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error)
  })
}

async function runTransaction<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const request = operation(tx.objectStore(storeName))

    // Close connection once the transaction fully commits
    tx.oncomplete = () => db.close()
    // Reject and close if the transaction is aborted (e.g. storage quota exceeded)
    tx.onabort = () => {
      db.close()
      reject(tx.error ?? new Error('IDB transaction aborted'))
    }

    request.onsuccess = (event) => resolve((event.target as IDBRequest<T>).result)
    request.onerror = (event) => reject((event.target as IDBRequest<T>).error)
  })
}

// Cards
export function saveCard(card: Card): Promise<IDBValidKey> {
  return runTransaction(STORE_CARDS, 'readwrite', (store) => store.put(card))
}
export function getCard(id: string): Promise<Card | undefined> {
  return runTransaction(STORE_CARDS, 'readonly', (store) => store.get(id))
}
export function getAllCards(): Promise<Card[]> {
  return runTransaction(STORE_CARDS, 'readonly', (store) => store.getAll())
}
export function deleteCard(id: string): Promise<undefined> {
  return runTransaction(STORE_CARDS, 'readwrite', (store) => store.delete(id))
}

// Decks
export function saveDeck(deck: Deck): Promise<IDBValidKey> {
  return runTransaction(STORE_DECKS, 'readwrite', (store) => store.put(deck))
}
export function getDeck(id: string): Promise<Deck | undefined> {
  return runTransaction(STORE_DECKS, 'readonly', (store) => store.get(id))
}
export function getAllDecks(): Promise<Deck[]> {
  return runTransaction(STORE_DECKS, 'readonly', (store) => store.getAll())
}
export function deleteDeck(id: string): Promise<undefined> {
  return runTransaction(STORE_DECKS, 'readwrite', (store) => store.delete(id))
}

// Tags
export function saveTag(tag: Tag): Promise<IDBValidKey> {
  return runTransaction(STORE_TAGS, 'readwrite', (store) => store.put(tag))
}
export function getAllTags(): Promise<Tag[]> {
  return runTransaction(STORE_TAGS, 'readonly', (store) => store.getAll())
}
export function deleteTag(name: string): Promise<undefined> {
  return runTransaction(STORE_TAGS, 'readwrite', (store) => store.delete(name))
}
