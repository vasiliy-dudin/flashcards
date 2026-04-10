<template>
  <main v-if="deck === undefined" class="deck-view deck-view--not-found">
    <p class="deck-view__not-found">Deck not found.</p>
  </main>
  <main v-else class="deck-view">
    <header class="deck-view__header">
      <h2 class="deck-view__title">{{ deck?.name ?? 'Deck' }}</h2>
      <div class="deck-view__toolbar">
        <button
          class="btn-icon"
          :class="{ 'is-active': settingsStore.settings.showTranslation }"
          title="Toggle translation"
          @click="settingsStore.updateSettings({ showTranslation: !settingsStore.settings.showTranslation })"
        >T</button>
        <ViewToggle :model-value="viewMode" @update:model-value="uiStore.setViewMode" />
        <button class="btn-primary" @click="showAddModal = true">+ Add card</button>
      </div>
    </header>

    <div class="deck-view__filters">
      <SearchInput v-model="searchText" placeholder="Search cards…" />
      <button
        class="btn-icon"
        :class="{ 'is-active': showArchived }"
        title="Show archived cards"
        @click="showArchived = !showArchived"
      >Archived</button>
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

    <div v-if="selectedIds.size > 0" class="deck-view__bulk-toolbar">
      <span class="deck-view__bulk-count">{{ selectedIds.size }} selected</span>
      <button class="deck-view__bulk-btn" :disabled="isBulkLoading" @click="bulkSendToReview">Send to review</button>
      <button class="deck-view__bulk-btn" :disabled="isBulkLoading" @click="bulkRemoveFromReview">Remove from review</button>
      <button class="deck-view__bulk-btn" :disabled="isBulkLoading" @click="bulkResetProgress">Reset progress</button>
      <button class="deck-view__bulk-btn deck-view__bulk-btn--danger" :disabled="isBulkLoading" @click="bulkDelete">Delete</button>
      <button class="deck-view__bulk-btn" @click="selectedIds = new Set()">Clear</button>
    </div>

    <CardGrid
      v-if="viewMode === 'grid'"
      :cards="filteredCards"
      v-model:selectedIds="selectedIds"
      @open="selectedCard = $event"
    />
    <CardTable
      v-else
      :cards="filteredCards"
      v-model:selectedIds="selectedIds"
      @open="selectedCard = $event"
    />

    <AddCardModal v-if="showAddModal" v-model="showAddModal" :deck-id="deckId" />
    <CardDetailModal v-if="selectedCard" :model-value="true" :card="selectedCard" @update:model-value="selectedCard = null" @card-updated="selectedCard = $event" />
  </main>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Card } from '../types'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { useCardsStore } from '../stores/cards'
import { useDecksStore } from '../stores/decks'
import { useTagsStore } from '../stores/tags'
import { useUiStore } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import { updateCard as updateCardApi, deleteCard as deleteCardApi } from '../api/cards'
import CardGrid from '../components/CardGrid.vue'
import CardTable from '../components/CardTable.vue'
import AddCardModal from '../components/AddCardModal.vue'
import CardDetailModal from '../components/CardDetailModal.vue'
import ViewToggle from '../components/ViewToggle.vue'
import SearchInput from '../components/SearchInput.vue'

const route = useRoute()
const deckId = computed<string>(() => {
  const id = route.params.id
  return Array.isArray(id) ? id[0] : id
})

const decksStore = useDecksStore()
const cardsStore = useCardsStore()
const tagsStore = useTagsStore()
const uiStore = useUiStore()
const settingsStore = useSettingsStore()
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
const showArchived = ref(false)
const showAddModal = ref(false)
const selectedCard = ref<Card | null>(null)
const selectedIds = ref<Set<string>>(new Set())
const isBulkLoading = ref(false)

async function bulkUpdate(patch: Partial<Card>): Promise<void> {
  if (isBulkLoading.value) return
  isBulkLoading.value = true
  const ids = [...selectedIds.value]
  try {
    await Promise.all(ids.map(id => updateCardApi(id, patch)))
    ids.forEach(id => cardsStore.updateCard(id, patch))
    selectedIds.value = new Set()
  } catch (err) {
    console.error('[DeckView] Bulk update failed:', err)
  } finally {
    isBulkLoading.value = false
  }
}

async function bulkDelete(): Promise<void> {
  if (isBulkLoading.value) return
  isBulkLoading.value = true
  const ids = [...selectedIds.value]
  const toDelete = ids.map(id => cardsStore.getCardById(id)).filter((c): c is Card => c !== undefined)
  try {
    await Promise.all(ids.map(id => deleteCardApi(id)))
    toDelete.forEach(card => {
      card.tags.forEach(tag => tagsStore.decrementTag(tag))
      cardsStore.removeCard(card.id)
    })
    selectedIds.value = new Set()
  } catch (err) {
    console.error('[DeckView] Bulk delete failed:', err)
  } finally {
    isBulkLoading.value = false
  }
}

function bulkSendToReview(): Promise<void> {
  return bulkUpdate({ inReview: true })
}

function bulkRemoveFromReview(): Promise<void> {
  return bulkUpdate({ inReview: false })
}

function bulkResetProgress(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)
  return bulkUpdate({ interval: 1, dueDate: today })
}

function cardMatchesTags(cardTags: string[]): boolean {
  if (selectedTags.value.length === 0) return true
  return selectedTags.value.some(filter =>
    cardTags.some(t => t === filter || t.startsWith(filter + '/'))
  )
}

const filteredCards = computed(() =>
  deckCards.value.filter(card => {
    if (card.archived !== showArchived.value) return false
    const matchesText =
      searchText.value === '' ||
      card.word.toLowerCase().includes(searchText.value.toLowerCase())
    return matchesText && cardMatchesTags(card.tags)
  })
)

watch(filteredCards, () => { selectedIds.value = new Set() })
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

.btn-icon {
  padding: var(--space-2) var(--space-3);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: border-color var(--transition-fast), color var(--transition-fast);

  &:hover {
    border-color: var(--color-primary);
    color: var(--color-text);
  }

  &.is-active {
    border-color: var(--color-primary);
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
  z-index: var(--z-index-dropdown);
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

.deck-view--not-found {
  padding: var(--space-6);
}

.deck-view__not-found {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  font-style: italic;
}

.deck-view__bulk-toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  padding: var(--space-2) var(--space-3);
  background-color: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.deck-view__bulk-count {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  margin-right: var(--space-2);
}

.deck-view__bulk-btn {
  padding: var(--space-1) var(--space-3);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: color var(--transition-fast), border-color var(--transition-fast);

  &:hover:not(:disabled) {
    color: var(--color-primary);
    border-color: var(--color-primary);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &--danger {
    &:hover:not(:disabled) {
      color: var(--color-danger);
      border-color: var(--color-danger);
    }
  }
}
</style>
