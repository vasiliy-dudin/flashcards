import { useCardsStore } from './stores/cards'
import { useDecksStore } from './stores/decks'
import { useTagsStore } from './stores/tags'
import { fetchAllCards } from './api/cards'
import { fetchAllDecks } from './api/decks'
import { fetchAllTags } from './api/tags'

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
