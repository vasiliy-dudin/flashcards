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
      <router-link to="/" class="sidebar__nav-item">Inbox</router-link>
    </section>

    <section class="sidebar__section">
      <div class="sidebar__section-header">
        <p class="sidebar__section-title">Decks</p>
        <button class="sidebar__add-btn" aria-label="New deck" @click="showCreateDeckModal = true">+</button>
      </div>
      <ul class="sidebar__list">
        <li v-for="deck in decks" :key="deck.id">
          <router-link :to="`/deck/${deck.id}`" class="sidebar__nav-item">
            {{ deck.name }}
          </router-link>
        </li>
        <li v-if="decks.length === 0">
          <button class="sidebar__cta" @click="showCreateDeckModal = true">+ Create your first deck</button>
        </li>
      </ul>
    </section>

    <CreateDeckModal v-if="showCreateDeckModal" v-model="showCreateDeckModal" />

    <section class="sidebar__section">
      <p class="sidebar__section-title">Tags</p>
      <ul class="sidebar__list">
        <li v-for="node in tagTreeNodes" :key="node.path">
          <router-link
            :to="`/tag/${encodeURIComponent(node.path)}`"
            class="sidebar__nav-item sidebar__tag-item"
            :style="{ paddingLeft: `calc(var(--space-4) * ${BASE_INDENT_LEVELS + node.depth})` }"
          >
            <span>{{ node.label }}</span>
            <span class="sidebar__count">{{ node.cardCount }}</span>
          </router-link>
        </li>
        <li v-if="tagTreeNodes.length === 0" class="sidebar__empty">No tags yet</li>
      </ul>
    </section>

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
import { storeToRefs } from 'pinia'
import { useDecksStore } from '../stores/decks'
import { useTagsStore } from '../stores/tags'
import { useCardsStore } from '../stores/cards'
import type { Card } from '../types'
import CreateDeckModal from './CreateDeckModal.vue'
import SearchInput from './SearchInput.vue'
import CardDetailModal from './CardDetailModal.vue'

interface TagTreeNode {
  path: string
  label: string
  depth: number
  cardCount: number
}

const BASE_INDENT_LEVELS = 1
const MAX_SEARCH_RESULTS = 10

const showCreateDeckModal = ref(false)
const searchQuery = ref('')
const selectedCard = ref<Card | null>(null)

const { decks } = storeToRefs(useDecksStore())
const { tags } = storeToRefs(useTagsStore())
const { cards } = storeToRefs(useCardsStore())

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

function onSearchFocusOut(e: FocusEvent): void {
  const container = e.currentTarget as HTMLElement
  const related = e.relatedTarget as Node | null
  if (!related || !container.contains(related)) {
    searchQuery.value = ''
  }
}
</script>

<style lang="scss" scoped>
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
  justify-content: space-between;
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
</style>
