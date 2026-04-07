<template>
  <nav class="app-sidebar">
    <section class="sidebar__section">
      <router-link to="/" class="sidebar__nav-item">Inbox</router-link>
    </section>

    <section class="sidebar__section">
      <p class="sidebar__section-title">Decks</p>
      <ul class="sidebar__list">
        <li v-for="deck in decks" :key="deck.id">
          <router-link :to="`/deck/${deck.id}`" class="sidebar__nav-item">
            {{ deck.name }}
          </router-link>
        </li>
        <li v-if="decks.length === 0" class="sidebar__empty">No decks yet</li>
      </ul>
    </section>

    <section class="sidebar__section">
      <p class="sidebar__section-title">Tags</p>
      <ul class="sidebar__list">
        <li v-for="node in tagTreeNodes" :key="node.path">
          <router-link
            :to="`/tag/${encodeURIComponent(node.path)}`"
            class="sidebar__nav-item sidebar__tag-item"
            :style="{ paddingLeft: `calc(var(--space-4) * ${1 + node.depth})` }"
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
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useDecksStore } from '../stores/decks'
import { useTagsStore } from '../stores/tags'

interface TagTreeNode {
  path: string
  label: string
  depth: number
  cardCount: number
}

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

.sidebar__section-title {
  padding: var(--space-2) var(--space-4);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
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
