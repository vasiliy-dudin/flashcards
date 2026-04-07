import type { Card } from '../types'

const DB_NAME = 'flashcards'
const DB_VERSION = 1
const STORE_CARDS = 'cards'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_CARDS)) {
        db.createObjectStore(STORE_CARDS, { keyPath: 'id' })
      }
    }

    request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result)
    request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error)
  })
}

async function runTransaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_CARDS, mode)
    const request = operation(tx.objectStore(STORE_CARDS))

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

export function saveCard(card: Card): Promise<IDBValidKey> {
  return runTransaction('readwrite', (store) => store.put(card))
}

export function getCard(id: string): Promise<Card | undefined> {
  return runTransaction('readonly', (store) => store.get(id))
}

export function getAllCards(): Promise<Card[]> {
  return runTransaction('readonly', (store) => store.getAll())
}

export function deleteCard(id: string): Promise<undefined> {
  return runTransaction('readwrite', (store) => store.delete(id))
}
