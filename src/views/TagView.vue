<template>
  <main class="tag-view">
    <header class="tag-view__header">
      <h2 class="tag-view__title">{{ tagName }}</h2>
      <div class="tag-view__toolbar">
        <AppButton
          variant="ghost"
          :active="settingsStore.settings.showTranslation"
          title="Toggle translation"
          @click="settingsStore.updateSettings({ showTranslation: !settingsStore.settings.showTranslation })"
        >T</AppButton>
        <ViewToggle :model-value="viewMode" @update:model-value="uiStore.setViewMode" />
        <AppButton variant="primary" @click="showAddModal = true">+ Add card</AppButton>
      </div>
    </header>

    <div class="tag-view__filters">
      <SearchInput v-model="searchText" placeholder="Search cards…" />
      <AppButton
        variant="ghost"
        :active="showArchived"
        title="Show archived cards"
        @click="showArchived = !showArchived"
      >Archived</AppButton>
    </div>

    <p class="tag-view__count">
      {{ filteredCards.length }} card{{ filteredCards.length !== 1 ? 's' : '' }}
    </p>

    <div v-if="selectedIds.size > 0" class="tag-view__bulk-toolbar">
      <span class="tag-view__bulk-count">{{ selectedIds.size }} selected</span>
      <AppButton variant="ghost" size="sm" :disabled="isBulkLoading" @click="bulkSendToReview">Send to review</AppButton>
      <AppButton variant="ghost" size="sm" :disabled="isBulkLoading" @click="bulkRemoveFromReview">Remove from review</AppButton>
      <AppButton variant="ghost" size="sm" :disabled="isBulkLoading" @click="bulkResetProgress">Reset progress</AppButton>
      <AppButton variant="ghost-danger" size="sm" :disabled="isBulkLoading" @click="bulkDelete">Delete</AppButton>
      <AppButton variant="ghost" size="sm" @click="selectedIds = new Set()">Clear</AppButton>
    </div>

    <CardGrid v-if="viewMode === 'grid'" :cards="filteredCards" v-model:selectedIds="selectedIds" @open="selectedCard = $event" />
    <CardTable v-else :cards="filteredCards" v-model:selectedIds="selectedIds" @open="selectedCard = $event" />
    <CardDetailModal v-if="selectedCard" :model-value="true" :card="selectedCard" @update:model-value="selectedCard = null" @card-updated="selectedCard = $event" />
    <AddCardModal v-if="showAddModal" v-model="showAddModal" deck-id="" :initial-tags="[tagName]" />
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Card } from '../types'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { useCardsStore } from '../stores/cards'
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
import AppButton from '../components/AppButton.vue'

const route = useRoute()
const tagName = computed<string>(() => {
  const name = route.params.name
  const raw = Array.isArray(name) ? name[0] : name
  return decodeURIComponent(raw)
})

const cardsStore = useCardsStore()
const tagsStore = useTagsStore()
const uiStore = useUiStore()
const settingsStore = useSettingsStore()
const { viewMode } = storeToRefs(uiStore)

const searchText = ref('')
const showAddModal = ref(false)
const showArchived = ref(false)
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
    console.error('[TagView] Bulk update failed:', err)
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
    console.error('[TagView] Bulk delete failed:', err)
  } finally {
    isBulkLoading.value = false
  }
}

function bulkSendToReview(): Promise<void> { return bulkUpdate({ inReview: true }) }
function bulkRemoveFromReview(): Promise<void> { return bulkUpdate({ inReview: false }) }
function bulkResetProgress(): Promise<void> {
  return bulkUpdate({ interval: 1, dueDate: new Date().toISOString().slice(0, 10) })
}

const tagCards = computed(() =>
  cardsStore.cards.filter(card =>
    card.tags.some(t => t === tagName.value || t.startsWith(tagName.value + '/'))
  )
)

const filteredCards = computed(() => {
  const q = searchText.value.toLowerCase()
  return tagCards.value.filter(c => {
    if (c.archived !== showArchived.value) return false
    return q === '' || c.word.toLowerCase().includes(q)
  })
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

.tag-view__filters {
  display: flex;
}

.tag-view__count {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.tag-view__bulk-count {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  margin-right: var(--space-2);
}

.tag-view__bulk-toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  padding: var(--space-2) var(--space-3);
  background-color: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
</style>
