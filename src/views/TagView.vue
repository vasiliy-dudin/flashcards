<template>
  <main class="tag-view">
    <header class="tag-view__header">
      <h2 class="tag-view__title">{{ tagName }}</h2>
      <div class="tag-view__toolbar">
        <button
          class="btn-icon"
          :class="{ 'is-active': settingsStore.settings.showTranslation }"
          title="Toggle translation"
          @click="settingsStore.updateSettings({ showTranslation: !settingsStore.settings.showTranslation })"
        >T</button>
        <ViewToggle :model-value="viewMode" @update:model-value="uiStore.setViewMode" />
      </div>
    </header>

    <div class="tag-view__filters">
      <SearchInput v-model="searchText" placeholder="Search cards…" />
    </div>

    <p class="tag-view__count">
      {{ filteredCards.length }} card{{ filteredCards.length !== 1 ? 's' : '' }}
    </p>

    <CardGrid v-if="viewMode === 'grid'" :cards="filteredCards" @open="selectedCard = $event" />
    <CardTable v-else :cards="filteredCards" @open="selectedCard = $event" />
    <CardDetailModal v-if="selectedCard" :model-value="true" :card="selectedCard" @update:model-value="selectedCard = null" @card-updated="selectedCard = $event" />
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Card } from '../types'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { useCardsStore } from '../stores/cards'
import { useUiStore } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import CardGrid from '../components/CardGrid.vue'
import CardTable from '../components/CardTable.vue'
import CardDetailModal from '../components/CardDetailModal.vue'
import ViewToggle from '../components/ViewToggle.vue'
import SearchInput from '../components/SearchInput.vue'

const route = useRoute()
const tagName = computed<string>(() => {
  const name = route.params.name
  const raw = Array.isArray(name) ? name[0] : name
  return decodeURIComponent(raw)
})

const cardsStore = useCardsStore()
const uiStore = useUiStore()
const settingsStore = useSettingsStore()
const { viewMode } = storeToRefs(uiStore)

const searchText = ref('')
const selectedCard = ref<Card | null>(null)

const tagCards = computed(() =>
  cardsStore.cards.filter(card =>
    card.tags.some(t => t === tagName.value || t.startsWith(tagName.value + '/'))
  )
)

const filteredCards = computed(() => {
  if (searchText.value === '') return tagCards.value
  const q = searchText.value.toLowerCase()
  return tagCards.value.filter(c => c.word.toLowerCase().includes(q))
})
</script>

<style lang="scss" scoped>
.tag-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-6);
  height: 100%;
  overflow-y: auto;
}

.tag-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.tag-view__title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
}

.tag-view__toolbar {
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

.tag-view__filters {
  display: flex;
}

.tag-view__count {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}
</style>
