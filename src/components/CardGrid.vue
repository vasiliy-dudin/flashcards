<template>
  <p v-if="cards.length === 0" class="card-grid__empty">No cards here yet.</p>
  <ul v-else class="card-grid">
    <li v-for="card in cards" :key="card.id">
      <CardItem :card="card" />
    </li>
  </ul>
</template>

<script setup lang="ts">
import CardItem from './CardItem.vue'
import type { Card } from '../types'

defineProps<{ cards: Card[] }>()
</script>

<style lang="scss" scoped>
.card-grid {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
}

.card-grid__empty {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  font-style: italic;
}
</style>
