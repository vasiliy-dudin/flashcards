<template>
  <nav class="sidebar">
    <div class="sidebar__search" @focusout="onSearchFocusOut">
      <SearchInput v-model="searchQuery" placeholder="Search cards…" />
      <ul v-if="searchResults.length > 0" class="sidebar__search-results">
        <li v-for="card in searchResults" :key="card.id">
          <button class="sidebar__search-result" @click="selectResult(card)">
            <span class="sidebar__search-result-word">{{ card.word }}</span>
            <span class="sidebar__search-result-deck">{{ deckNameById.get(card.deckId) ?? '' }}</span>
          </button>
        </li>
      </ul>
    </div>

    <section class="sidebar__section">
      <router-link to="/" class="sidebar__nav-item">
        <IconReview />Review
        <span v-if="inboxTotalCount > 0" class="sidebar__count">
          {{ inboxDueCount }} of {{ inboxTotalCount }}
        </span>
      </router-link>
    </section>

    <section class="sidebar__section">
      <div class="sidebar__section-header">
        <p class="sidebar__section-title">Decks</p>
        <button class="sidebar__add-btn" aria-label="New deck" @click="showCreateDeckModal = true">+</button>
      </div>
      <ul class="sidebar__list">
        <DeckItem
          v-for="deck in decks"
          :key="deck.id"
          :deck="deck"
          @rename="onRenameDeck(deck.id)"
          @delete="onDeleteDeck(deck.id)"
        />
        <li v-if="decks.length === 0">
          <button class="sidebar__cta" @click="showCreateDeckModal = true">+ Create your first deck</button>
        </li>
      </ul>
      <p v-if="renameError" class="sidebar__error">{{ renameError }}</p>
      <div v-if="deletingDeckId !== null" class="sidebar__delete-confirm">
        <span>Delete "{{ decksStore.getDeckById(deletingDeckId)?.name }}"?</span>
        <div class="sidebar__delete-confirm-actions">
          <AppButton variant="secondary" size="sm" @click="deletingDeckId = null">Cancel</AppButton>
          <AppButton variant="danger-subtle" size="sm" @click="handleDeleteConfirm">Yes</AppButton>
        </div>
      </div>
      <p v-if="deleteError" class="sidebar__error">{{ deleteError }}</p>
    </section>

    <CreateDeckModal v-if="showCreateDeckModal" v-model="showCreateDeckModal" />
    <RenameDeckModal
      v-if="renamingDeckId !== null"
      :current-name="decksStore.getDeckById(renamingDeckId)?.name ?? ''"
      @confirm="handleRenameConfirm"
      @cancel="renamingDeckId = null"
    />

    <section class="sidebar__section">
      <p class="sidebar__section-title">Tags</p>
      <ul class="sidebar__list">
        <li v-for="node in tagTreeNodes" :key="node.path">
          <router-link
            :to="`/tag/${encodeURIComponent(node.path)}`"
            class="sidebar__nav-item sidebar__tag-item"
            :style="{ paddingLeft: `calc(var(--space-4) * ${BASE_INDENT_LEVELS + node.depth})` }"
          >
            <IconTags class="sidebar__icon" /><span>{{ node.label }}</span>
            <span class="sidebar__count">{{ node.cardCount }}</span>
          </router-link>
        </li>
        <li v-if="tagTreeNodes.length === 0" class="sidebar__empty">No tags yet</li>
      </ul>
    </section>

    <div class="sidebar__footer">
      <router-link to="/settings" class="sidebar__nav-item"><IconSettings />Settings</router-link>
    </div>

    <CardDetailModal
      v-if="selectedCard"
      :model-value="true"
      :card="selectedCard"
      @update:model-value="selectedCard = null"
      @card-updated="selectedCard = $event"
    />
  </nav>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useDecksStore } from '../stores/decks'
import { useTagsStore } from '../stores/tags'
import { useCardsStore } from '../stores/cards'
import { useSettingsStore } from '../stores/settings'
import type { Card } from '../types'
import { renameDeck, deleteDeck } from '../api/decks'
import { buildReviewQueue } from '../utils/buildReviewQueue'
import CreateDeckModal from './CreateDeckModal.vue'
import DeckItem from './DeckItem.vue'
import RenameDeckModal from './RenameDeckModal.vue'
import SearchInput from './SearchInput.vue'
import CardDetailModal from './CardDetailModal.vue'
import IconReview from './icons/IconReview.vue'
import IconTags from './icons/IconTags.vue'
import IconSettings from './icons/IconSettings.vue'
import AppButton from './AppButton.vue'

interface TagTreeNode {
  path: string
  label: string
  depth: number
  cardCount: number
}

const BASE_INDENT_LEVELS = 1
const MAX_SEARCH_RESULTS = 10

const showCreateDeckModal = ref(false)
const renamingDeckId = ref<string | null>(null)
const renameError = ref('')
const deletingDeckId = ref<string | null>(null)
const deleteError = ref('')
const searchQuery = ref('')
const selectedCard = ref<Card | null>(null)

const route = useRoute()
const router = useRouter()

const decksStore = useDecksStore()
const cardsStore = useCardsStore()
const { decks } = storeToRefs(decksStore)
const { tags } = storeToRefs(useTagsStore())
const { cards } = storeToRefs(cardsStore)
const { settings } = storeToRefs(useSettingsStore())

const inboxDueCount = computed(() =>
  buildReviewQueue(cards.value, new Date().toISOString().slice(0, 10), settings.value).length
)
const inboxTotalCount = computed(() =>
  cards.value.filter(c => c.inReview).length
)

const deckNameById = computed(() => new Map(decks.value.map(d => [d.id, d.name])))

const tagTreeNodes = computed<TagTreeNode[]>(() =>
  [...tags.value]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(tag => ({
      path: tag.name,
      label: tag.name.split('/').at(-1) ?? tag.name,
      depth: tag.name.split('/').length - 1,
      cardCount: tag.cardCount,
    }))
)

const searchResults = computed<Card[]>(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return []
  return cards.value
    .filter(c => c.word.toLowerCase().includes(q) || c.definition.toLowerCase().includes(q))
    .slice(0, MAX_SEARCH_RESULTS)
})

function selectResult(card: Card): void {
  selectedCard.value = card
  searchQuery.value = ''
}

function onRenameDeck(id: string): void {
  renameError.value = ''
  deleteError.value = ''
  deletingDeckId.value = null
  renamingDeckId.value = id
}

async function handleRenameConfirm(newName: string): Promise<void> {
  const id = renamingDeckId.value
  if (!id) return
  try {
    await renameDeck(id, newName)
    decksStore.updateDeck(id, { name: newName })
    renamingDeckId.value = null
  } catch (err) {
    renameError.value = err instanceof Error ? err.message : 'Failed to rename deck.'
    renamingDeckId.value = null
    console.error('[AppSidebar] Deck rename failed:', id, err)
  }
}

function onDeleteDeck(id: string): void {
  deleteError.value = ''
  renameError.value = ''
  renamingDeckId.value = null
  deletingDeckId.value = id
}

async function handleDeleteConfirm(): Promise<void> {
  const id = deletingDeckId.value
  if (!id) return
  deletingDeckId.value = null
  try {
    await deleteDeck(id)
    cardsStore.setCards(cards.value.filter(c => c.deckId !== id))
    decksStore.removeDeck(id)
    if (route.path === `/deck/${id}`) {
      await router.push('/')
    }
  } catch (err) {
    deleteError.value = err instanceof Error ? err.message : 'Failed to delete deck.'
    console.error('[AppSidebar] Deck delete failed:', id, err)
  }
}

function onSearchFocusOut(e: FocusEvent): void {
  const container = e.currentTarget as HTMLElement
  const related = e.relatedTarget as Node | null
  if (!related || !container.contains(related)) {
    searchQuery.value = ''
  }
}
</script>

<style lang="scss" scoped>
nav {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.sidebar__footer {
  margin-top: auto;
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-2);
  padding-bottom: var(--space-2);
}

.sidebar__search {
  position: relative;
  padding: var(--space-3) var(--space-3) var(--space-2);
}

.sidebar__search-results {
  position: absolute;
  top: 100%;
  left: var(--space-3);
  right: var(--space-3);
  z-index: var(--z-index-dropdown);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  list-style: none;
  max-height: 280px;
  overflow-y: auto;
}

.sidebar__search-result {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  text-align: left;
  padding: var(--space-2) var(--space-3);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background-color var(--transition-fast);
  &:hover { background-color: var(--color-surface-2); }
}

.sidebar__search-result-word {
  font-size: var(--font-size-sm);
  color: var(--color-text);
}

.sidebar__search-result-deck {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.sidebar__section {
  margin-top: var(--space-4);
}

.sidebar__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: var(--space-2);
}

.sidebar__section-title {
  padding: var(--space-2) var(--space-4);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
}

.sidebar__add-btn {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  font-size: var(--font-size-base);
  line-height: 1;
  cursor: pointer;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  transition: color var(--transition-fast), background-color var(--transition-fast);
  &:hover {
    color: var(--color-text);
    background-color: var(--color-surface-2);
  }
}

.sidebar__cta {
  display: block;
  width: 100%;
  text-align: left;
  padding: var(--space-2) var(--space-4);
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background-color var(--transition-fast);
  &:hover { background-color: var(--color-surface-2); }
}

.sidebar__list {
  list-style: none;
}

.sidebar__nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  font-size: var(--font-size-sm);
  color: var(--color-text);
  text-decoration: none;
  transition: background-color var(--transition-fast);

  &:hover {
    background-color: var(--color-surface-2);
  }

  &.router-link-exact-active {
    background-color: var(--color-surface-2);
    color: var(--color-primary);
  }
}

.sidebar__count {
  margin-left: auto;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  background-color: var(--color-surface-2);
  padding: 1px var(--space-2);
  border-radius: var(--radius-full);
  min-width: 18px;
  text-align: center;
}

.sidebar__empty {
  padding: var(--space-2) var(--space-4);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  font-style: italic;
}

.sidebar__error {
  padding: var(--space-2) var(--space-4);
  font-size: var(--font-size-xs);
  color: var(--color-danger);
}

.sidebar__delete-confirm {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.sidebar__delete-confirm-actions {
  display: flex;
  gap: var(--space-2);
}


</style>
