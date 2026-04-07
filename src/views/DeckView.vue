<template>
  <main class="deck-view">
    <header class="deck-view__header">
      <h2 class="deck-view__title">{{ deck?.name ?? 'Deck' }}</h2>
      <div class="deck-view__toolbar">
        <div class="view-toggle">
          <button
            class="view-toggle__btn"
            :class="{ 'is-active': viewMode === 'grid' }"
            title="Grid view"
            @click="uiStore.setViewMode('grid')"
          >
            ▦
          </button>
          <button
            class="view-toggle__btn"
            :class="{ 'is-active': viewMode === 'table' }"
            title="Table view"
            @click="uiStore.setViewMode('table')"
          >
            ☰
          </button>
        </div>
        <button class="btn-primary" @click="showAddModal = true">+ Add card</button>
      </div>
    </header>

    <div class="deck-view__filters">
      <input
        v-model="searchText"
        class="search-input"
        type="search"
        placeholder="Search cards…"
      />
      <div class="tag-filter">
        <button
          class="tag-filter__toggle"
          :class="{ 'has-selection': selectedTags.length > 0 }"
          @click="tagsOpen = !tagsOpen"
        >
          Tags{{ selectedTags.length > 0 ? ` (${selectedTags.length})` : '' }}
          {{ tagsOpen ? '▲' : '▼' }}
        </button>
        <div v-if="tagsOpen" class="tag-filter__panel">
          <p v-if="availableTags.length === 0" class="tag-filter__empty">No tags in this deck</p>
          <label v-for="tag in availableTags" :key="tag" class="tag-filter__option">
            <input type="checkbox" :value="tag" v-model="selectedTags" />
            {{ tag }}
          </label>
        </div>
      </div>
    </div>

    <p class="deck-view__count">{{ filteredCards.length }} card{{ filteredCards.length !== 1 ? 's' : '' }}</p>

    <CardGrid v-if="viewMode === 'grid'" :cards="filteredCards" />
    <CardTable v-else :cards="filteredCards" />

    <AddCardModal v-if="showAddModal" v-model="showAddModal" :deck-id="deckId" />
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { useCardsStore } from '../stores/cards'
import { useDecksStore } from '../stores/decks'
import { useUiStore } from '../stores/ui'
import CardGrid from '../components/CardGrid.vue'
import CardTable from '../components/CardTable.vue'
import AddCardModal from '../components/AddCardModal.vue'

const route = useRoute()
const deckId = computed<string>(() => {
  const id = route.params.id
  return Array.isArray(id) ? id[0] : id
})

const decksStore = useDecksStore()
const cardsStore = useCardsStore()
const uiStore = useUiStore()
const { viewMode } = storeToRefs(uiStore)

const deck = computed(() => decksStore.getDeckById(deckId.value))

const deckCards = computed(() =>
  cardsStore.cards.filter(c => c.deckId === deckId.value)
)

const availableTags = computed<string[]>(() => {
  const tagSet = new Set<string>()
  deckCards.value.forEach(c => c.tags.forEach(t => tagSet.add(t)))
  return [...tagSet].sort()
})

const searchText = ref('')
const selectedTags = ref<string[]>([])
const tagsOpen = ref(false)
const showAddModal = ref(false)

function cardMatchesTags(cardTags: string[]): boolean {
  if (selectedTags.value.length === 0) return true
  return selectedTags.value.some(filter =>
    cardTags.some(t => t === filter || t.startsWith(filter + '/'))
  )
}

const filteredCards = computed(() =>
  deckCards.value.filter(card => {
    const matchesText =
      searchText.value === '' ||
      card.word.toLowerCase().includes(searchText.value.toLowerCase())
    return matchesText && cardMatchesTags(card.tags)
  })
)
</script>

<style lang="scss" scoped>
.deck-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-6);
  height: 100%;
  overflow-y: auto;
}

.deck-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.deck-view__title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
}

.deck-view__toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.view-toggle {
  display: flex;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.view-toggle__btn {
  padding: var(--space-2) var(--space-3);
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: var(--font-size-base);
  transition: background-color var(--transition-fast), color var(--transition-fast);

  &:hover {
    background-color: var(--color-surface-2);
    color: var(--color-text);
  }

  &.is-active {
    background-color: var(--color-surface-2);
    color: var(--color-primary);
  }
}

.btn-primary {
  padding: var(--space-2) var(--space-4);
  background-color: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: filter var(--transition-fast);

  &:hover {
    filter: brightness(1.1);
  }
}

.deck-view__filters {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

.search-input {
  flex: 1;
  max-width: 320px;
  padding: var(--space-2) var(--space-3);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  outline: none;
  transition: border-color var(--transition-fast);

  &:focus {
    border-color: var(--color-primary);
  }
}

.tag-filter {
  position: relative;
}

.tag-filter__toggle {
  padding: var(--space-2) var(--space-3);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: border-color var(--transition-fast), color var(--transition-fast);

  &:hover,
  &.has-selection {
    border-color: var(--color-primary);
    color: var(--color-text);
  }
}

.tag-filter__panel {
  position: absolute;
  top: calc(100% + var(--space-1));
  left: 0;
  z-index: 10;
  min-width: 200px;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-2);
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.tag-filter__option {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text);
  cursor: pointer;
  border-radius: var(--radius-sm);

  &:hover {
    background-color: var(--color-surface-2);
  }
}

.tag-filter__empty {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  padding: var(--space-2);
}

.deck-view__count {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}
</style>
