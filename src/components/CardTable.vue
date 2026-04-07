<template>
  <p v-if="cards.length === 0" class="card-table__empty">No cards here yet.</p>
  <div v-else class="card-table-wrap">
    <table class="card-table">
      <thead>
        <tr>
          <th
            v-for="col in COLUMNS"
            :key="col.key"
            class="card-table__th"
            :class="{ 'is-sorted': sortKey === col.key }"
            @click="setSort(col.key)"
          >
            {{ col.label }}
            <span class="card-table__sort-icon">
              {{ sortKey === col.key ? (sortDir === 'asc' ? '↑' : '↓') : '↕' }}
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="card in sortedCards" :key="card.id" class="card-table__row">
          <td class="card-table__td card-table__td--word">{{ card.word }}</td>
          <td class="card-table__td">{{ formatDate(card.createdAt) }}</td>
          <td class="card-table__td">
            <span class="card-table__due" :class="dueBadgeClass(card.dueDate)">
              {{ formatDate(card.dueDate) }}
            </span>
          </td>
          <td class="card-table__td">{{ card.interval }}d</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Card } from '../types'
import { formatDate } from '../utils/formatDate'
import { getCardDueStatus } from '../utils/cardStatus'

type SortKey = 'word' | 'createdAt' | 'dueDate' | 'interval'
type SortDir = 'asc' | 'desc'

interface Column {
  key: SortKey
  label: string
}

const COLUMNS: Column[] = [
  { key: 'word', label: 'Word' },
  { key: 'createdAt', label: 'Created' },
  { key: 'dueDate', label: 'Due date' },
  { key: 'interval', label: 'Interval' },
]

const { cards } = defineProps<{ cards: Card[] }>()

const sortKey = ref<SortKey>('word')
const sortDir = ref<SortDir>('asc')

function setSort(key: SortKey): void {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

const sortedCards = computed<Card[]>(() => {
  return [...cards].sort((a, b) => {
    const cmp = String(a[sortKey.value]).localeCompare(
      String(b[sortKey.value]),
      undefined,
      { numeric: true },
    )
    return sortDir.value === 'asc' ? cmp : -cmp
  })
})

function dueBadgeClass(dueDate: string): string {
  return `is-${getCardDueStatus(dueDate)}`
}
</script>

<style lang="scss" scoped>
.card-table-wrap {
  overflow-x: auto;
}

.card-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.card-table__th {
  padding: var(--space-2) var(--space-4);
  text-align: left;
  font-weight: var(--font-weight-medium);
  color: var(--color-text-muted);
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transition: color var(--transition-fast);

  &:hover,
  &.is-sorted {
    color: var(--color-text);
  }
}

.card-table__sort-icon {
  margin-left: var(--space-1);
  font-size: var(--font-size-xs);
  opacity: 0.5;
}

.card-table__row {
  border-bottom: 1px solid var(--color-border);
  transition: background-color var(--transition-fast);

  &:hover {
    background-color: var(--color-surface-2);
  }
}

.card-table__td {
  padding: var(--space-3) var(--space-4);
  color: var(--color-text-muted);
}

.card-table__td--word {
  font-weight: var(--font-weight-medium);
  color: var(--color-text);
}

.card-table__due {
  &.is-overdue {
    color: var(--color-danger);
  }

  &.is-due {
    color: var(--color-warning);
  }

  &.is-future {
    color: var(--color-text-muted);
  }
}

.card-table__empty {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  font-style: italic;
}
</style>
