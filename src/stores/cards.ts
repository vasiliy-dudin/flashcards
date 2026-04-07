import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Card } from '../types'

export const useCardsStore = defineStore('cards', () => {
  const cards = ref<Card[]>([])

  function addCard(card: Card): void {
    cards.value.push(card)
  }

  function removeCard(id: string): void {
    cards.value = cards.value.filter((c) => c.id !== id)
  }

  function updateCard(id: string, patch: Partial<Card>): void {
    const index = cards.value.findIndex((c) => c.id === id)
    if (index !== -1) {
      cards.value[index] = { ...cards.value[index], ...patch }
    }
  }

  function getCardById(id: string): Card | undefined {
    return cards.value.find((c) => c.id === id)
  }

  return { cards, addCard, removeCard, updateCard, getCardById }
})
