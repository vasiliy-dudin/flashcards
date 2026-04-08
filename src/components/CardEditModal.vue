<template>
  <Teleport to="body">
    <div class="modal-overlay" @mousedown="onOverlayMouseDown" @mouseup="onOverlayMouseUp">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header class="modal__header">
          <h3 id="modal-title" class="modal__title">Edit card</h3>
          <button class="modal__close" aria-label="Close" @click="close">✕</button>
        </header>

        <form class="modal__body" @submit.prevent="handleSubmit">
          <label class="modal__label">
            Word or phrase
            <input v-model="word" class="modal__input" type="text" :disabled="isSaving" required autofocus />
          </label>

          <label class="modal__label">
            Translation / Definition
            <input v-model="definition" class="modal__input" type="text" :disabled="isSaving" required />
          </label>

          <label class="modal__label">
            Examples <span class="modal__hint">(optional, one per line)</span>
            <textarea v-model="examples" class="modal__input modal__input--textarea" rows="3" :disabled="isSaving" />
          </label>

          <label class="modal__label">
            Tags
            <TagsInput v-model="tags" :suggestions="tagSuggestions" :disabled="isSaving" />
            <span class="modal__hint">Enter or comma to confirm each tag</span>
          </label>

          <p v-if="error" class="modal__error">{{ error }}</p>

          <div class="modal__footer">
            <button type="button" class="modal__btn modal__btn--cancel" :disabled="isSaving" @click="close">
              Cancel
            </button>
            <button
              type="submit"
              class="modal__btn modal__btn--submit"
              :disabled="isSaving || !word.trim() || !definition.trim()"
            >
              {{ isSaving ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useCardsStore } from '../stores/cards'
import { useTagsStore } from '../stores/tags'
import { updateCard as updateCardApi } from '../api/cards'
import type { Card } from '../types'
import TagsInput from './TagsInput.vue'

const props = defineProps<{ card: Card }>()
const emit = defineEmits<{
  saved: [card: Card]
  close: []
}>()

const cardsStore = useCardsStore()
const tagsStore = useTagsStore()

const tagSuggestions = computed((): string[] => tagsStore.tags.map(t => t.name))

const word = ref(props.card.word)
const definition = ref(props.card.definition)
const examples = ref(props.card.examples.join('\n'))
const tags = ref<string[]>([...props.card.tags])
const isSaving = ref(false)
const error = ref('')

function close(): void {
  if (isSaving.value) return
  emit('close')
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
  const trimmedWord = word.value.trim()
  const trimmedDefinition = definition.value.trim()
  if (!trimmedWord || !trimmedDefinition) return
  isSaving.value = true
  error.value = ''
  try {
    const updated = await updateCardApi(props.card.id, {
      word: trimmedWord,
      definition: trimmedDefinition,
      examples: examples.value.split('\n').map(s => s.trim()).filter(Boolean),
      tags: tags.value,
    })
    cardsStore.updateCard(props.card.id, updated)
    const added = tags.value.filter(t => !props.card.tags.includes(t))
    const removed = props.card.tags.filter(t => !tags.value.includes(t))
    added.forEach(t => tagsStore.upsertTag(t))
    removed.forEach(t => tagsStore.decrementTag(t))
    emit('saved', updated)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Something went wrong.'
    console.error('[CardEditModal] Card update failed:', props.card.id, err)
  } finally {
    isSaving.value = false
  }
}
</script>

<style lang="scss" scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 101;
  background-color: var(--color-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
}

.modal {
  width: 100%;
  max-width: 480px;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  max-height: 90vh;
  overflow-y: auto;
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

.modal__hint {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-normal);
  color: var(--color-text-muted);
  opacity: 0.7;
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

.modal__input--textarea {
  resize: vertical;
  font-family: inherit;
  line-height: var(--line-height-base);
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
