<template>
  <Teleport to="body">
    <div class="modal-overlay" @mousedown="onOverlayMouseDown" @mouseup="onOverlayMouseUp">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header class="modal__header">
          <h3 id="modal-title" class="modal__title">New deck</h3>
          <button class="modal__close" aria-label="Close" @click="close">✕</button>
        </header>

        <form class="modal__body" @submit.prevent="handleSubmit">
          <label class="modal__label">
            Deck name
            <input
              v-model="name"
              class="modal__input"
              type="text"
              placeholder="e.g. Phrasal Verbs"
              :disabled="isLoading"
              required
              autofocus
            />
          </label>

          <p v-if="error" class="modal__error">{{ error }}</p>

          <div class="modal__footer">
            <button type="button" class="modal__btn modal__btn--cancel" @click="close">
              Cancel
            </button>
            <button
              type="submit"
              class="modal__btn modal__btn--submit"
              :disabled="isLoading || !name.trim()"
            >
              {{ isLoading ? 'Creating…' : 'Create deck' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useDecksStore } from '../stores/decks'
import { createDeck } from '../api/decks'

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const decksStore = useDecksStore()

const name = ref('')
const isLoading = ref(false)
const error = ref('')

function close(): void {
  if (isLoading.value) return
  name.value = ''
  error.value = ''
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

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') close()
}

onMounted(() => document.addEventListener('keydown', handleKeydown))
onUnmounted(() => document.removeEventListener('keydown', handleKeydown))

async function handleSubmit(): Promise<void> {
  const trimmedName = name.value.trim()
  if (!trimmedName) return
  isLoading.value = true
  error.value = ''
  try {
    const deck = await createDeck(trimmedName)
    decksStore.addDeck(deck)
    close()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Something went wrong.'
    console.error('[CreateDeckModal] Deck creation failed:', trimmedName, err)
  } finally {
    isLoading.value = false
  }
}
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

.modal {
  width: 100%;
  max-width: 400px;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border);
}

.modal__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
}

.modal__close {
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

.modal__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5);
}

.modal__label {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-muted);
}

.modal__input {
  padding: var(--space-3);
  background-color: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: var(--font-size-base);
  outline: none;
  transition: border-color var(--transition-fast);
  &:focus { border-color: var(--color-primary); }
  &:disabled { opacity: 0.5; }
}

.modal__error {
  font-size: var(--font-size-sm);
  color: var(--color-danger);
  background-color: color-mix(in srgb, var(--color-danger) 10%, transparent);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
}

.modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}

.modal__btn {
  padding: var(--space-2) var(--space-5);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  border: none;
  transition: filter var(--transition-fast), opacity var(--transition-fast);
  &:disabled { opacity: 0.4; cursor: not-allowed; }
  &--cancel {
    background-color: var(--color-surface-2);
    color: var(--color-text-muted);
    &:hover:not(:disabled) { filter: brightness(1.2); }
  }
  &--submit {
    background-color: var(--color-primary);
    color: #fff;
    &:hover:not(:disabled) { filter: brightness(1.1); }
  }
}
</style>
