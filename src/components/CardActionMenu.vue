<template>
  <div class="card-action-menu" ref="referenceEl">
    <AppButton variant="ghost" :size="size" aria-label="Card actions" @click="toggleMenu">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <circle cx="8" cy="3" r="1.5"/>
        <circle cx="8" cy="8" r="1.5"/>
        <circle cx="8" cy="13" r="1.5"/>
      </svg>
    </AppButton>

    <Teleport to="body">
      <div v-if="menuOpen" class="card-action-menu__dropdown" ref="floatingEl" :style="floatingStyles">
        <template v-if="showDeleteConfirm">
          <span class="card-action-menu__confirm-text">Delete this card?</span>
          <div class="card-action-menu__confirm-actions">
            <button class="card-action-menu__item card-action-menu__item--secondary" @click="showDeleteConfirm = false">Cancel</button>
            <button
              class="card-action-menu__item card-action-menu__item--danger"
              :disabled="isDeleting"
              @click="handleDelete"
            >{{ isDeleting ? '…' : 'Confirm' }}</button>
          </div>
        </template>
        <template v-else>
          <button v-if="showEdit" class="card-action-menu__item" @click="onEdit">Edit</button>
          <hr v-if="showEdit" class="card-action-menu__divider" />
          <button
            class="card-action-menu__item"
            :disabled="isUpdating"
            @click="onToggleReview"
          >{{ card.inReview ? 'Remove from review' : 'Send to review' }}</button>
          <button
            v-if="card.inReview"
            class="card-action-menu__item"
            :disabled="isUpdating"
            @click="onResetProgress"
          >Reset progress</button>
          <button
            class="card-action-menu__item"
            :disabled="isUpdating"
            @click="onToggleArchive"
          >{{ card.archived ? 'Unarchive' : 'Archive' }}</button>
          <hr class="card-action-menu__divider" />
          <button
            class="card-action-menu__item card-action-menu__item--danger"
            :disabled="isUpdating"
            @click="onDelete"
          >Delete</button>
        </template>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useFloating, flip, shift, offset } from '@floating-ui/vue'
import type { Card } from '../types'
import { updateCard as updateCardApi, deleteCard as deleteCardApi } from '../api/cards'
import { useCardsStore } from '../stores/cards'
import { useTagsStore } from '../stores/tags'
import AppButton from './AppButton.vue'

const { card, showEdit = true, size = 'icon' } = defineProps<{
  card: Card
  showEdit?: boolean
  size?: 'sm' | 'md' | 'lg' | 'icon'
}>()
const emit = defineEmits<{
  edit: []
  deleted: []
  updated: [card: Card]
}>()

const cardsStore = useCardsStore()
const tagsStore = useTagsStore()

const menuOpen = ref(false)
const showDeleteConfirm = ref(false)
const isUpdating = ref(false)
const isDeleting = ref(false)
const referenceEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)

const { floatingStyles } = useFloating(referenceEl, floatingEl, {
  placement: 'bottom-end',
  strategy: 'fixed',
  middleware: [offset(4), flip(), shift({ padding: 8 })],
})

function onDocumentClick(e: MouseEvent): void {
  const target = e.target as Node
  const inReference = referenceEl.value?.contains(target) ?? false
  const inFloating = floatingEl.value?.contains(target) ?? false
  if (!inReference && !inFloating) {
    closeMenu()
  }
}

function openMenu(): void {
  menuOpen.value = true
  setTimeout(() => {
    document.addEventListener('click', onDocumentClick)
  }, 0)
}

function closeMenu(): void {
  menuOpen.value = false
  showDeleteConfirm.value = false
  document.removeEventListener('click', onDocumentClick)
}

function toggleMenu(): void {
  menuOpen.value ? closeMenu() : openMenu()
}

function onEdit(): void {
  closeMenu()
  emit('edit')
}

async function onToggleReview(): Promise<void> {
  if (isUpdating.value) return
  isUpdating.value = true
  closeMenu()
  try {
    const updated = await updateCardApi(card.id, { inReview: !card.inReview })
    cardsStore.updateCard(card.id, { inReview: updated.inReview })
    emit('updated', updated)
  } catch (err) {
    console.error('[CardActionMenu] toggleReview failed:', card.id, err)
  } finally {
    isUpdating.value = false
  }
}

async function onResetProgress(): Promise<void> {
  if (isUpdating.value) return
  isUpdating.value = true
  closeMenu()
  const today = new Date().toISOString().slice(0, 10)
  try {
    const updated = await updateCardApi(card.id, { interval: 1, dueDate: today })
    cardsStore.updateCard(card.id, { interval: updated.interval, dueDate: updated.dueDate })
    emit('updated', updated)
  } catch (err) {
    console.error('[CardActionMenu] resetProgress failed:', card.id, err)
  } finally {
    isUpdating.value = false
  }
}

async function onToggleArchive(): Promise<void> {
  if (isUpdating.value) return
  isUpdating.value = true
  closeMenu()
  try {
    const updated = await updateCardApi(card.id, { archived: !card.archived })
    cardsStore.updateCard(card.id, { archived: updated.archived })
    emit('updated', updated)
  } catch (err) {
    console.error('[CardActionMenu] toggleArchive failed:', card.id, err)
  } finally {
    isUpdating.value = false
  }
}

function onDelete(): void {
  showDeleteConfirm.value = true
}

async function handleDelete(): Promise<void> {
  isDeleting.value = true
  try {
    await deleteCardApi(card.id)
    card.tags.forEach(tag => tagsStore.decrementTag(tag))
    cardsStore.removeCard(card.id)
    closeMenu()
    emit('deleted')
  } catch (err) {
    console.error('[CardActionMenu] delete failed:', card.id, err)
  } finally {
    isDeleting.value = false
  }
}

onUnmounted(() => closeMenu())
</script>

<style lang="scss" scoped>
.card-action-menu {
  position: relative;
}

.card-action-menu__dropdown {
  z-index: var(--z-index-dropdown);
  min-width: 170px;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-1);
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
}

.card-action-menu__item {
  width: 100%;
  text-align: left;
  padding: var(--space-2) var(--space-3);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text);
  cursor: pointer;
  transition: background-color var(--transition-fast);

  &:hover:not(:disabled) { background-color: var(--color-surface-2); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }

  &--secondary {
    color: var(--color-text-muted);
  }

  &--danger {
    color: var(--color-danger);
    &:hover:not(:disabled) {
      background-color: color-mix(in srgb, var(--color-danger) 10%, transparent);
    }
  }
}

.card-action-menu__divider {
  margin: var(--space-1) 0;
  border: none;
  border-top: 1px solid var(--color-border);
}

.card-action-menu__confirm-text {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  padding: var(--space-2) var(--space-3) var(--space-1);
}

.card-action-menu__confirm-actions {
  display: flex;
  gap: var(--space-1);
}
</style>
