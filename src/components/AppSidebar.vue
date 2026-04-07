<template>
  <nav class="sidebar">
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
  </nav>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useDecksStore } from '../stores/decks'
import { useTagsStore } from '../stores/tags'
import CreateDeckModal from './CreateDeckModal.vue'

interface TagTreeNode {
  path: string
  label: string
  depth: number
  cardCount: number
}

const BASE_INDENT_LEVELS = 1

const showCreateDeckModal = ref(false)

const { decks } = storeToRefs(useDecksStore())
const { tags } = storeToRefs(useTagsStore())

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
</script>

<style lang="scss" scoped>
.app-sidebar {
  display: flex;
  flex-direction: column;
  padding: var(--space-3) 0;
  gap: var(--space-1);
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
