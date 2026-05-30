import { useCardsStore } from './stores/cards'
import { useDecksStore } from './stores/decks'
import { useTagsStore } from './stores/tags'
import { fetchAllCards } from './api/cards'
import { fetchAllDecks } from './api/decks'
import { fetchAllTags } from './api/tags'
import { loadCards, loadDecks, loadTags } from './lib/offline-store'

/** Fetches all cards, decks, and tags from the server and populates the stores. */
export async function loadAllData(): Promise<void> {
  const [cards, decks, tags] = await Promise.all([
    fetchAllCards(),
    fetchAllDecks(),
    fetchAllTags(),
  ])
  useCardsStore().setCards(cards)
  useDecksStore().setDecks(decks)
  useTagsStore().setTags(tags)
}

/** Loads all cards, decks, and tags from the local IndexedDB cache and populates the stores. */
export async function loadAllDataOffline(): Promise<void> {
  const [cards, decks, tags] = await Promise.all([loadCards(), loadDecks(), loadTags()])
  useCardsStore().setCards(cards)
  useDecksStore().setDecks(decks)
  useTagsStore().setTags(tags)
}
