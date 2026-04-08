<template>
  <li class="deck-item" ref="itemEl">
    <router-link :to="`/deck/${deck.id}`" class="deck-item__link">
      {{ deck.name }}
    </router-link>
    <button
      class="deck-item__actions-btn"
      aria-label="Deck actions"
      @click.stop="toggleMenu"
    >
      ···
    </button>
    <div v-if="menuOpen" class="deck-item__menu">
      <button class="deck-item__menu-item" @click="handleRename">Rename</button>
      <button class="deck-item__menu-item deck-item__menu-item--danger" @click="handleDelete">Delete</button>
    </div>
  </li>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import type { Deck } from '../types'

defineProps<{ deck: Deck }>()
const emit = defineEmits<{
  rename: []
  delete: []
}>()

const menuOpen = ref(false)
const itemEl = ref<HTMLElement | null>(null)

function toggleMenu(): void {
  menuOpen.value ? closeMenu() : openMenu()
}

function openMenu(): void {
  menuOpen.value = true
  document.addEventListener('click', onDocumentClick)
}

function closeMenu(): void {
  menuOpen.value = false
  document.removeEventListener('click', onDocumentClick)
}

function onDocumentClick(e: MouseEvent): void {
  if (!itemEl.value?.contains(e.target as Node)) closeMenu()
}

function handleRename(): void {
  closeMenu()
  emit('rename')
}

function handleDelete(): void {
  closeMenu()
  emit('delete')
}

onUnmounted(() => document.removeEventListener('click', onDocumentClick))
</script>

<style lang="scss" scoped>
.deck-item {
  position: relative;
  display: flex;
  align-items: center;

  &:hover .deck-item__actions-btn {
    opacity: 1;
    pointer-events: auto;
  }
}

.deck-item__link {
  flex: 1;
  display: flex;
  align-items: center;
  padding: var(--space-2) calc(var(--space-2) + 28px) var(--space-2) var(--space-4);
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

.deck-item__actions-btn {
  position: absolute;
  right: var(--space-2);
  opacity: 0;
  pointer-events: none;
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  font-size: var(--font-size-base);
  line-height: 1;
  cursor: pointer;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  transition: color var(--transition-fast), background-color var(--transition-fast), opacity var(--transition-fast);

  &:hover {
    color: var(--color-text);
    background-color: var(--color-surface-2);
  }
}

.deck-item__menu {
  position: absolute;
  top: 100%;
  right: var(--space-2);
  z-index: var(--z-index-dropdown);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  min-width: 120px;
  display: flex;
  flex-direction: column;
  padding: var(--space-1) 0;
}

.deck-item__menu-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: var(--space-2) var(--space-3);
  background: transparent;
  border: none;
  font-size: var(--font-size-sm);
  color: var(--color-text);
  cursor: pointer;
  transition: background-color var(--transition-fast);

  &:hover {
    background-color: var(--color-surface-2);
  }

  &--danger {
    color: var(--color-danger);
  }
}
</style>
