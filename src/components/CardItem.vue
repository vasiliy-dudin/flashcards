<template>
  <article class="card-item" @click="emit('open', card)">
    <header class="card-item__header">
      <span class="card-item__word">{{ card.word }}</span>
      <span class="card-item__badge" :class="`card-item__badge--${dueBadge.variant}`">
        {{ dueBadge.label }}
      </span>
    </header>

    <p v-if="settingsStore.settings.showTranslation" class="card-item__definition">{{ card.definition }}</p>

    <footer class="card-item__footer">
      <template v-if="showDeleteConfirm">
        <span class="card-item__confirm-text">Delete this card?</span>
        <AppButton variant="secondary" size="sm" @click.stop="showDeleteConfirm = false">Cancel</AppButton>
        <AppButton variant="danger-subtle" size="sm" :disabled="isDeleting" @click.stop="handleDelete">
          {{ isDeleting ? '…' : 'Confirm' }}
        </AppButton>
      </template>
      <template v-else>
        <div class="card-item__tags">
          <span v-for="tag in card.tags" :key="tag" class="card-item__tag">
            {{ leafSegment(tag) }}
          </span>
        </div>
        <div class="card-item__footer-actions" @click.stop>
          <AppButton
            variant="ghost"
            size="icon"
            :disabled="!card.audioUrl"
            aria-label="Play pronunciation"
            @click="playAudio"
          >▶</AppButton>
          <div class="card-item__menu" ref="menuEl">
            <AppButton variant="ghost" size="icon" aria-label="Card actions" @click="toggleMenu">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <circle cx="8" cy="3" r="1.5"/>
                <circle cx="8" cy="8" r="1.5"/>
                <circle cx="8" cy="13" r="1.5"/>
              </svg>
            </AppButton>
            <div v-if="menuOpen" class="card-item__dropdown">
              <button
                class="card-item__dropdown-item"
                :disabled="isUpdating"
                @click="onMenuToggleReview"
              >{{ card.inReview ? 'Remove from review' : 'Send to review' }}</button>
              <button
                v-if="card.inReview"
                class="card-item__dropdown-item"
                :disabled="isUpdating"
                @click="onMenuResetProgress"
              >Reset progress</button>
              <button
                class="card-item__dropdown-item"
                :disabled="isUpdating"
                @click="onMenuToggleArchive"
              >{{ card.archived ? 'Unarchive' : 'Archive' }}</button>
              <hr class="card-item__dropdown-divider" />
              <button
                class="card-item__dropdown-item card-item__dropdown-item--danger"
                @click="onMenuDelete"
              >Delete</button>
            </div>
          </div>
        </div>
      </template>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { computed, ref, onUnmounted } from 'vue'
import type { Card } from '../types'
import { formatDate } from '../utils/formatDate'
import { getCardDueStatus } from '../utils/cardStatus'
import { useSettingsStore } from '../stores/settings'
import { useCardsStore } from '../stores/cards'
import { useTagsStore } from '../stores/tags'
import { updateCard as updateCardApi, deleteCard as deleteCardApi } from '../api/cards'
import AppButton from './AppButton.vue'

interface DueBadge {
  label: string
  variant: 'overdue' | 'due' | 'future'
}

const { card } = defineProps<{ card: Card }>()
const emit = defineEmits<{ open: [card: Card] }>()

const settingsStore = useSettingsStore()
const cardsStore = useCardsStore()
const tagsStore = useTagsStore()

function leafSegment(tagPath: string): string {
  return tagPath.split('/').at(-1) ?? tagPath
}

const dueBadge = computed<DueBadge>(() => {
  const status = getCardDueStatus(card.dueDate)
  if (status === 'overdue') return { label: 'Overdue', variant: 'overdue' }
  if (status === 'due') return { label: 'Due today', variant: 'due' }
  return { label: formatDate(card.dueDate), variant: 'future' }
})

function playAudio(): void {
  if (!card.audioUrl) return
  new Audio(card.audioUrl).play().catch(err => {
    console.error('[CardItem] Audio playback failed:', card.word, err)
  })
}

const menuOpen = ref(false)
const menuEl = ref<HTMLElement | null>(null)
const showDeleteConfirm = ref(false)
const isUpdating = ref(false)
const isDeleting = ref(false)

function onDocumentClick(e: MouseEvent): void {
  if (menuEl.value && !menuEl.value.contains(e.target as Node)) {
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
  document.removeEventListener('click', onDocumentClick)
}

function toggleMenu(): void {
  menuOpen.value ? closeMenu() : openMenu()
}

async function toggleReview(): Promise<void> {
  if (isUpdating.value) return
  isUpdating.value = true
  try {
    const updated = await updateCardApi(card.id, { inReview: !card.inReview })
    cardsStore.updateCard(card.id, { inReview: updated.inReview })
  } catch (err) {
    console.error('[CardItem] toggleReview failed:', card.id, err)
  } finally {
    isUpdating.value = false
  }
}

async function resetProgress(): Promise<void> {
  if (isUpdating.value) return
  isUpdating.value = true
  const today = new Date().toISOString().slice(0, 10)
  try {
    await updateCardApi(card.id, { interval: 1, dueDate: today })
    cardsStore.updateCard(card.id, { interval: 1, dueDate: today })
  } catch (err) {
    console.error('[CardItem] resetProgress failed:', card.id, err)
  } finally {
    isUpdating.value = false
  }
}

async function handleDelete(): Promise<void> {
  isDeleting.value = true
  try {
    await deleteCardApi(card.id)
    card.tags.forEach(tag => tagsStore.decrementTag(tag))
    cardsStore.removeCard(card.id)
  } catch (err) {
    console.error('[CardItem] Delete failed:', card.id, err)
    isDeleting.value = false
  }
}

function onMenuToggleReview(): void {
  closeMenu()
  toggleReview()
}

function onMenuResetProgress(): void {
  closeMenu()
  resetProgress()
}

function onMenuToggleArchive(): void {
  closeMenu()
  toggleArchive()
}

function onMenuDelete(): void {
  closeMenu()
  showDeleteConfirm.value = true
}

async function toggleArchive(): Promise<void> {
  if (isUpdating.value) return
  isUpdating.value = true
  try {
    await updateCardApi(card.id, { archived: !card.archived })
    cardsStore.updateCard(card.id, { archived: !card.archived })
  } catch (err) {
    console.error('[CardItem] toggleArchive failed:', card.id, err)
  } finally {
    isUpdating.value = false
  }
}

onUnmounted(() => closeMenu())
</script>

<style lang="scss" scoped>
.card-item {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  height: 100%;
  transition: border-color var(--transition-fast);
  cursor: pointer;

  &:hover {
    border-color: var(--color-primary);
  }
}

.card-item__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
}

.card-item__word {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-item__badge {
  flex-shrink: 0;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);

  &--overdue {
    background-color: color-mix(in srgb, var(--color-danger) 15%, transparent);
    color: var(--color-danger);
  }

  &--due {
    background-color: color-mix(in srgb, var(--color-warning) 15%, transparent);
    color: var(--color-warning);
  }

  &--future {
    background-color: var(--color-surface-2);
    color: var(--color-text-muted);
  }
}

.card-item__definition {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  line-height: var(--line-height-base);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-item__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-top: auto;
}

.card-item__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  overflow: hidden;
}

.card-item__tag {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  background-color: var(--color-surface-2);
  padding: 1px var(--space-2);
  border-radius: var(--radius-full);
}

.card-item__footer-actions {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  flex-shrink: 0;
}

.card-item__menu {
  position: relative;
}

.card-item__dropdown {
  position: absolute;
  bottom: calc(100% + var(--space-1));
  right: 0;
  z-index: var(--z-index-dropdown);
  min-width: 160px;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-1);
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
}

.card-item__dropdown-item {
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

  &--danger {
    color: var(--color-danger);
    &:hover:not(:disabled) {
      background-color: color-mix(in srgb, var(--color-danger) 10%, transparent);
    }
  }
}

.card-item__dropdown-divider {
  margin: var(--space-1) 0;
  border: none;
  border-top: 1px solid var(--color-border);
}

.card-item__confirm-text {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  flex: 1;
}


</style>
