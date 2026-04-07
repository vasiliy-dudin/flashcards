import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Deck } from '../types'

export const useDecksStore = defineStore('decks', () => {
  const decks = ref<Deck[]>([])

  function addDeck(deck: Deck): void {
    decks.value.push(deck)
  }

  function removeDeck(id: string): void {
    decks.value = decks.value.filter((d) => d.id !== id)
  }

  function updateDeck(id: string, patch: Partial<Omit<Deck, 'id' | 'createdAt'>>): void {
    const index = decks.value.findIndex((d) => d.id === id)
    if (index !== -1) {
      decks.value[index] = { ...decks.value[index], ...patch }
    }
  }

  function setDecks(next: Deck[]): void {
    decks.value = next
  }

  function getDeckById(id: string): Deck | undefined {
    return decks.value.find((d) => d.id === id)
  }

  return { decks, setDecks, addDeck, removeDeck, updateDeck, getDeckById }
})
