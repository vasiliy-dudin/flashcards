import type { Card, SortDir, SortKey, SortValue } from '../types'

function compareByKey(a: Card, b: Card, key: SortKey): number {
  switch (key) {
    case 'word':      return a.word.localeCompare(b.word)
    case 'createdAt': return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
    case 'dueDate':   return a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0
    case 'interval':  return a.interval - b.interval
  }
}

/** Returns a new sorted array; does not mutate the input. */
export function sortCards(cards: Card[], sortValue: SortValue): Card[] {
  const sep = sortValue.indexOf(':')
  const key = sortValue.slice(0, sep) as SortKey
  const dir = sortValue.slice(sep + 1) as SortDir
  return [...cards].sort((a, b) => {
    const cmp = compareByKey(a, b, key)
    return dir === 'asc' ? cmp : -cmp
  })
}
