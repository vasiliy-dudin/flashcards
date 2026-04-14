<template>
  <Teleport to="body">
    <div class="modal-overlay" @mousedown="onOverlayMouseDown" @mouseup="onOverlayMouseUp">
      <div class="card-detail" role="dialog" aria-modal="true" aria-labelledby="card-detail-word">
        <header class="card-detail__header">
          <h2 id="card-detail-word" class="card-detail__word">{{ card.word }}</h2>
          <button class="card-detail__close" aria-label="Close" @click="close">✕</button>
        </header>

        <div class="card-detail__body">
          <section class="card-detail__section">
            <h3 class="card-detail__section-title">Translation</h3>
            <p class="card-detail__text">{{ card.definition }}</p>
          </section>

          <section v-if="card.examples.length > 0" class="card-detail__section">
            <h3 class="card-detail__section-title">Examples</h3>
            <ul class="card-detail__list">
              <li v-for="example in card.examples" :key="example">{{ example }}</li>
            </ul>
          </section>

          <section v-if="card.tags.length > 0" class="card-detail__section">
            <h3 class="card-detail__section-title">Tags</h3>
            <div class="card-detail__tags">
              <span v-for="tag in card.tags" :key="tag" class="card-detail__tag">{{ tag }}</span>
            </div>
          </section>

          <div v-if="card.audioUrl" class="card-detail__audio">
            <AppButton variant="ghost-subtle" aria-label="Play pronunciation" @click="playAudio">
              ▶ Play pronunciation
            </AppButton>
          </div>

          <p v-if="card.dictionary.transcription" class="card-detail__transcription">
            {{ card.dictionary.transcription }}
          </p>

          <section v-if="card.dictionary.meanings.length > 0" class="card-detail__section">
            <h3 class="card-detail__section-title">Dictionary</h3>
            <ol class="card-detail__meanings">
              <li v-for="meaning in card.dictionary.meanings" :key="meaning">{{ meaning }}</li>
            </ol>
          </section>

          <section v-if="card.aiExample" class="card-detail__section">
            <h3 class="card-detail__section-title">AI Example</h3>
            <p class="card-detail__ai-example">{{ card.aiExample }}</p>
          </section>
        </div>

        <footer class="card-detail__footer">
          <div class="card-detail__meta">
            <span>Due: {{ formatDate(card.dueDate) }}</span>
            <span>Interval: {{ card.interval }}d</span>
          </div>
          <div class="card-detail__footer-actions">
            <template v-if="showDeleteConfirm">
              <span class="card-detail__confirm-text">Delete this card?</span>
              <AppButton variant="secondary" size="sm" @click="showDeleteConfirm = false">Cancel</AppButton>
              <AppButton variant="danger-subtle" size="sm" :disabled="isDeleting" @click="handleDelete">
                {{ isDeleting ? 'Deleting…' : 'Confirm' }}
              </AppButton>
            </template>
            <template v-else>
              <AppButton variant="ghost-subtle" size="sm" @click="showEditModal = true">Edit</AppButton>
              <div class="card-detail__actions-menu" ref="actionsMenuEl">
                <AppButton variant="ghost-subtle" size="sm" @click="toggleActionsMenu">Actions ▾</AppButton>
                <div v-if="actionsMenuOpen" class="card-detail__actions-dropdown">
                  <button
                    class="card-detail__menu-item"
                    :disabled="isUpdating"
                    @click="onMenuToggleReview"
                  >{{ card.inReview ? 'Remove from review' : 'Send to review' }}</button>
                  <button
                    v-if="card.inReview"
                    class="card-detail__menu-item"
                    :disabled="isUpdating"
                    @click="onMenuResetProgress"
                  >Reset progress</button>
                  <button
                    class="card-detail__menu-item"
                    :disabled="isUpdating"
                    @click="onMenuToggleArchive"
                  >{{ card.archived ? 'Unarchive' : 'Archive' }}</button>
                  <hr class="card-detail__menu-divider" />
                  <button
                    class="card-detail__menu-item card-detail__menu-item--danger"
                    @click="onMenuDelete"
                  >Delete</button>
                </div>
              </div>
            </template>
          </div>
        </footer>

        <CardEditModal
          v-if="showEditModal"
          :card="card"
          @saved="onCardSaved"
          @close="showEditModal = false"
        />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { Card } from '../types'
import { formatDate } from '../utils/formatDate'
import CardEditModal from './CardEditModal.vue'
import AppButton from './AppButton.vue'
import { deleteCard as deleteCardApi, updateCard as updateCardApi } from '../api/cards'
import { useCardsStore } from '../stores/cards'
import { useTagsStore } from '../stores/tags'

const props = defineProps<{ modelValue: boolean; card: Card }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'card-updated': [card: Card]
}>()

const cardsStore = useCardsStore()
const tagsStore = useTagsStore()

const showEditModal = ref(false)
const showDeleteConfirm = ref(false)
const isDeleting = ref(false)
const isUpdating = ref(false)

const actionsMenuOpen = ref(false)
const actionsMenuEl = ref<HTMLElement | null>(null)

function onActionsMenuDocumentClick(e: MouseEvent): void {
  if (actionsMenuEl.value && !actionsMenuEl.value.contains(e.target as Node)) {
    closeActionsMenu()
  }
}

function openActionsMenu(): void {
  actionsMenuOpen.value = true
  setTimeout(() => {
    document.addEventListener('click', onActionsMenuDocumentClick)
  }, 0)
}

function closeActionsMenu(): void {
  actionsMenuOpen.value = false
  document.removeEventListener('click', onActionsMenuDocumentClick)
}

function toggleActionsMenu(): void {
  actionsMenuOpen.value ? closeActionsMenu() : openActionsMenu()
}

function onMenuToggleReview(): void {
  closeActionsMenu()
  toggleReview()
}

function onMenuResetProgress(): void {
  closeActionsMenu()
  resetProgress()
}

function onMenuToggleArchive(): void {
  closeActionsMenu()
  toggleArchive()
}

function onMenuDelete(): void {
  closeActionsMenu()
  showDeleteConfirm.value = true
}

function close(): void {
  emit('update:modelValue', false)
}

let overlayMouseDowned = false

function onOverlayMouseDown(e: MouseEvent): void {
  overlayMouseDowned = e.target === e.currentTarget
}

function onOverlayMouseUp(e: MouseEvent): void {
  if (overlayMouseDowned && e.target === e.currentTarget) close()
  overlayMouseDowned = false
}

async function toggleReview(): Promise<void> {
  if (isUpdating.value) return
  isUpdating.value = true
  try {
    const updated = await updateCardApi(props.card.id, { inReview: !props.card.inReview })
    cardsStore.updateCard(props.card.id, { inReview: updated.inReview })
    emit('card-updated', updated)
  } catch (err) {
    console.error('[CardDetailModal] toggleReview failed:', props.card.id, err)
  } finally {
    isUpdating.value = false
  }
}

async function resetProgress(): Promise<void> {
  if (isUpdating.value) return
  isUpdating.value = true
  const today = new Date().toISOString().slice(0, 10)
  try {
    const updated = await updateCardApi(props.card.id, { interval: 1, dueDate: today })
    cardsStore.updateCard(props.card.id, { interval: 1, dueDate: today })
    emit('card-updated', updated)
  } catch (err) {
    console.error('[CardDetailModal] resetProgress failed:', props.card.id, err)
  } finally {
    isUpdating.value = false
  }
}

async function toggleArchive(): Promise<void> {
  if (isUpdating.value) return
  isUpdating.value = true
  try {
    const updated = await updateCardApi(props.card.id, { archived: !props.card.archived })
    cardsStore.updateCard(props.card.id, { archived: updated.archived })
    emit('card-updated', updated)
  } catch (err) {
    console.error('[CardDetailModal] toggleArchive failed:', props.card.id, err)
  } finally {
    isUpdating.value = false
  }
}

function playAudio(): void {
  if (!props.card.audioUrl) return
  new Audio(props.card.audioUrl).play().catch(err => {
    console.error('[CardDetailModal] Audio playback failed:', props.card.word, err)
  })
}

async function handleDelete(): Promise<void> {
  isDeleting.value = true
  try {
    await deleteCardApi(props.card.id)
    props.card.tags.forEach(tag => tagsStore.decrementTag(tag))
    cardsStore.removeCard(props.card.id)
    close()
  } catch (err) {
    console.error('[CardDetailModal] Delete failed:', props.card.id, err)
  } finally {
    isDeleting.value = false
  }
}

function onCardSaved(updated: Card): void {
  showEditModal.value = false
  emit('card-updated', updated)
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && !showEditModal.value) close()
}

onMounted(() => document.addEventListener('keydown', handleKeydown))
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  closeActionsMenu()
})
</script>

<style lang="scss" scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background-color: var(--color-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
}

.card-detail {
  width: 100%;
  max-width: 540px;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.card-detail__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  background-color: var(--color-surface);
}

.card-detail__word {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
}

.card-detail__close {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  font-size: var(--font-size-base);
  cursor: pointer;
  padding: var(--space-1);
  border-radius: var(--radius-sm);
  transition: color var(--transition-fast);
  &:hover { color: var(--color-text); }
}

.card-detail__body {
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.card-detail__audio {
  display: flex;
}

.card-detail__transcription {
  font-size: var(--font-size-base);
  color: var(--color-text-muted);
  font-style: italic;
}

.card-detail__section-title {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-2);
}

.card-detail__meanings,
.card-detail__list {
  margin: 0;
  padding-left: var(--space-4);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);

  li + li { margin-top: var(--space-1); }
}

.card-detail__text {
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
}

.card-detail__ai-example {
  font-size: var(--font-size-sm);
  font-style: italic;
  color: var(--color-text-muted);
  line-height: var(--line-height-base);
}

.card-detail__footer {
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.card-detail__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.card-detail__tag {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  background-color: var(--color-surface-2);
  padding: 1px var(--space-2);
  border-radius: var(--radius-full);
}

.card-detail__meta {
  display: flex;
  gap: var(--space-3);
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.card-detail__footer-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.card-detail__confirm-text {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.card-detail__actions-menu {
  position: relative;
}

.card-detail__actions-dropdown {
  position: absolute;
  bottom: calc(100% + var(--space-1));
  right: 0;
  z-index: var(--z-index-dropdown);
  min-width: 180px;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-1);
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
}

.card-detail__menu-item {
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

.card-detail__menu-divider {
  margin: var(--space-1) 0;
  border: none;
  border-top: 1px solid var(--color-border);
}
</style>
