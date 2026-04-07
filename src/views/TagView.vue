<template>
  <main class="tag-view">
    <header class="tag-view__header">
      <h2 class="tag-view__title">{{ tagName }}</h2>
      <ViewToggle :model-value="viewMode" @update:model-value="uiStore.setViewMode" />
    </header>

    <div class="tag-view__filters">
      <SearchInput v-model="searchText" placeholder="Search cards…" />
    </div>

    <p class="tag-view__count">
      {{ filteredCards.length }} card{{ filteredCards.length !== 1 ? 's' : '' }}
    </p>

    <CardGrid v-if="viewMode === 'grid'" :cards="filteredCards" />
    <CardTable v-else :cards="filteredCards" />
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { useCardsStore } from '../stores/cards'
import { useUiStore } from '../stores/ui'
import CardGrid from '../components/CardGrid.vue'
import CardTable from '../components/CardTable.vue'
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
const { viewMode } = storeToRefs(uiStore)

const searchText = ref('')

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

.tag-view__filters {
  display: flex;
}

.tag-view__count {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}
</style>
