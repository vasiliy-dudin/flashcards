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

  function getDeckById(id: string): Deck | undefined {
    return decks.value.find((d) => d.id === id)
  }

  return { decks, addDeck, removeDeck, getDeckById }
})
