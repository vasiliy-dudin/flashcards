<template>
  <Teleport to="body">
    <div class="modal-overlay" @mousedown="onOverlayMouseDown" @mouseup="onOverlayMouseUp">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header class="modal__header">
          <h3 id="modal-title" class="modal__title">Rename deck</h3>
          <button class="modal__close" aria-label="Close" @click="cancel">✕</button>
        </header>

        <form class="modal__body" @submit.prevent="handleSubmit">
          <label class="modal__label">
            Deck name
            <input
              v-model="name"
              class="modal__input"
              type="text"
              placeholder="e.g. Phrasal Verbs"
              required
              autofocus
            />
          </label>

          <div class="modal__footer">
            <AppButton variant="secondary" @click="cancel">Cancel</AppButton>
            <AppButton variant="primary" type="submit" :disabled="!name.trim() || name.trim() === currentName">
              Rename
            </AppButton>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import AppButton from './AppButton.vue'

const props = defineProps<{ currentName: string }>()
const emit = defineEmits<{
  confirm: [newName: string]
  cancel: []
}>()

const name = ref(props.currentName)

let overlayMouseDowned = false

function onOverlayMouseDown(e: MouseEvent): void {
  overlayMouseDowned = e.target === e.currentTarget
}

function onOverlayMouseUp(e: MouseEvent): void {
  if (overlayMouseDowned && e.target === e.currentTarget) cancel()
  overlayMouseDowned = false
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') cancel()
}

onMounted(() => document.addEventListener('keydown', handleKeydown))
onUnmounted(() => document.removeEventListener('keydown', handleKeydown))

function handleSubmit(): void {
  const trimmed = name.value.trim()
  if (!trimmed || trimmed === props.currentName) return
  emit('confirm', trimmed)
}

function cancel(): void {
  emit('cancel')
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
}

.modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}

</style>
