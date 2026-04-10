<template>
  <p v-if="cards.length === 0" class="card-grid__empty">No cards here yet.</p>
  <ul v-else class="card-grid" :class="{ 'has-selection': selectedIds.size > 0 }">
    <li
      v-for="card in cards"
      :key="card.id"
      class="card-grid__item"
      :class="{ 'is-selected': selectedIds.has(card.id) }"
      @click="onItemClick(card, $event)"
    >
      <label class="card-grid__checkbox" @click.stop>
        <input
          type="checkbox"
          :checked="selectedIds.has(card.id)"
          @click.stop="onCheckboxClick(card, $event)"
        />
      </label>
      <CardItem :card="card" />
    </li>
  </ul>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import CardItem from './CardItem.vue'
import type { Card } from '../types'

const props = withDefaults(
  defineProps<{ cards: Card[]; selectedIds?: Set<string> }>(),
  { selectedIds: () => new Set<string>() }
)
const emit = defineEmits<{
  open: [card: Card]
  'update:selectedIds': [ids: Set<string>]
}>()

const lastSelectedId = ref<string | null>(null)

watch(() => props.selectedIds.size, (size) => {
  if (size === 0) lastSelectedId.value = null
})

function toggle(set: Set<string>, id: string): Set<string> {
  const next = new Set(set)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

function rangeSelect(anchorId: string, targetId: string): Set<string> {
  const ids = props.cards.map(c => c.id)
  const from = ids.indexOf(anchorId)
  const to = ids.indexOf(targetId)
  if (from === -1 || to === -1) return new Set(props.selectedIds)
  const [lo, hi] = from < to ? [from, to] : [to, from]
  const next = new Set(props.selectedIds)
  ids.slice(lo, hi + 1).forEach(id => next.add(id))
  return next
}

function onCheckboxClick(card: Card, event: MouseEvent): void {
  if (event.shiftKey && lastSelectedId.value) {
    emit('update:selectedIds', rangeSelect(lastSelectedId.value, card.id))
  } else {
    lastSelectedId.value = card.id
    emit('update:selectedIds', toggle(props.selectedIds, card.id))
  }
}

function onItemClick(card: Card, event: MouseEvent): void {
  if (event.ctrlKey || event.metaKey) {
    lastSelectedId.value = card.id
    emit('update:selectedIds', toggle(props.selectedIds, card.id))
    return
  }
  if (event.shiftKey && lastSelectedId.value) {
    emit('update:selectedIds', rangeSelect(lastSelectedId.value, card.id))
    return
  }
  emit('open', card)
}
</script>

<style lang="scss" scoped>
.card-grid {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  align-items: stretch;
  gap: var(--space-4);
  padding-top: var(--space-2);
  padding-left: var(--space-2);
}

.card-grid__item {
  position: relative;
  height: 100%;
  cursor: pointer;

  &.is-selected > :last-child {
    outline: 2px solid var(--color-primary);
    outline-offset: 0;
  }
}

.card-grid__checkbox {
  --_size: 32px;
  position: absolute;
  top: calc(-1 * var(--space-2));
  left: calc(-1 * var(--space-2));
  z-index: 1;
  width: var(--_size);
  height: var(--_size);
  border-radius: 50%;
  background-color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity var(--transition-fast);

  input[type='checkbox'] {
    width: 15px;
    height: 15px;
    cursor: pointer;
    accent-color: var(--color-primary);
    margin: 0;
  }
}

// Show on hover of this card
.card-grid__item:hover .card-grid__checkbox { opacity: 1; }

// Always show when this card is selected
.card-grid__item.is-selected .card-grid__checkbox { opacity: 1; }

// When any card is selected, show all checkboxes
.card-grid.has-selection .card-grid__checkbox { opacity: 1; }

.card-grid__empty {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  font-style: italic;
}
</style>
