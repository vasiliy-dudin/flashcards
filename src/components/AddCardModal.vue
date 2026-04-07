<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="close">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header class="modal__header">
          <h3 id="modal-title" class="modal__title">Add card</h3>
          <button class="modal__close" aria-label="Close" @click="close">✕</button>
        </header>

        <form class="modal__body" @submit.prevent="handleSubmit">
          <label class="modal__label">
            Word or phrase
            <input
              v-model="word"
              class="modal__input"
              type="text"
              placeholder="e.g. ephemeral"
              :disabled="isLoading"
              required
              autofocus
            />
          </label>

          <label class="modal__label">
            Tags
            <TagsInput v-model="tags" :disabled="isLoading" />
            <span class="modal__hint">Enter or comma to confirm each tag</span>
          </label>

          <button
            type="button"
            class="modal__toggle"
            :disabled="isLoading"
            @click="showManual = !showManual"
          >
            {{ showManual ? '▲ Hide manual fields' : '▼ Fill in manually (skip AI)' }}
          </button>

          <template v-if="showManual">
            <label class="modal__label">
              Definition
              <textarea
                v-model="manualDefinition"
                class="modal__input modal__input--textarea"
                placeholder="Enter a definition…"
                rows="3"
                :disabled="isLoading"
              />
            </label>

            <label class="modal__label">
              Examples <span class="modal__hint">(one per line)</span>
              <textarea
                v-model="manualExamples"
                class="modal__input modal__input--textarea"
                placeholder="She kept meticulous records.&#10;It was an ephemeral moment."
                rows="3"
                :disabled="isLoading"
              />
            </label>
          </template>

          <p v-if="error" class="modal__error">{{ error }}</p>

          <div class="modal__footer">
            <button type="button" class="modal__btn modal__btn--cancel" @click="close">
              Cancel
            </button>
            <button
              type="submit"
              class="modal__btn modal__btn--submit"
              :disabled="isLoading || !word.trim()"
            >
              {{ isLoading ? 'Saving…' : 'Add card' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useCardsStore } from '../stores/cards'
import { useTagsStore } from '../stores/tags'
import { createCard } from '../api/cards'
import type { Card } from '../types'
import TagsInput from './TagsInput.vue'

const props = defineProps<{ modelValue: boolean; deckId: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const cardsStore = useCardsStore()
const tagsStore = useTagsStore()

const word = ref('')
const tags = ref<string[]>([])
const showManual = ref(false)
const manualDefinition = ref('')
const manualExamples = ref('')
const isLoading = ref(false)
const error = ref('')

function close(): void {
  if (isLoading.value) return
  word.value = ''
  tags.value = []
  showManual.value = false
  manualDefinition.value = ''
  manualExamples.value = ''
  error.value = ''
  emit('update:modelValue', false)
}

interface ExamplesResponse { definition?: string; examples?: string[]; usageNotes?: string }
interface AudioResponse { audioUrl?: string }

function isExamplesResponse(v: unknown): v is ExamplesResponse {
  return typeof v === 'object' && v !== null
}
function isAudioResponse(v: unknown): v is AudioResponse {
  return typeof v === 'object' && v !== null
}

interface ExamplesData { definition: string; examples: string[]; usageNotes: string }

function getManualData(): ExamplesData | null {
  const definition = manualDefinition.value.trim()
  if (!definition) return null
  const examples = manualExamples.value.split('\n').map(s => s.trim()).filter(Boolean)
  return { definition, examples, usageNotes: '' }
}

async function fetchGeneratedData(term: string): Promise<ExamplesData> {
  const res = await fetch('/api/generate-examples', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word: term }),
  })
  if (!res.ok) throw new Error('Content generation is unavailable. Please try again later.')
  const raw: unknown = await res.json()
  if (!isExamplesResponse(raw)) throw new Error('Unexpected response from content generation service.')
  return { definition: raw.definition ?? '', examples: raw.examples ?? [], usageNotes: raw.usageNotes ?? '' }
}

async function fetchAudio(term: string): Promise<string | null> {
  try {
    const res = await fetch('/api/generate-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: term }),
    })
    if (!res.ok) return null
    const raw: unknown = await res.json()
    return isAudioResponse(raw) ? (raw.audioUrl ?? null) : null
  } catch {
    return null
  }
}

async function handleSubmit(): Promise<void> {
  const trimmed = word.value.trim()
  if (!trimmed) return
  isLoading.value = true
  error.value = ''
  try {
    const data = getManualData() ?? await fetchGeneratedData(trimmed)
    const audioUrl = await fetchAudio(trimmed)
    const today = new Date().toISOString().slice(0, 10)
    const card: Card = {
      id: crypto.randomUUID(), word: trimmed, ...data,
      audioUrl, deckId: props.deckId, tags: tags.value,
      interval: 1, dueDate: today, createdAt: today,
    }
    const saved = await createCard(card)
    cardsStore.addCard(saved)
    tags.value.forEach(tag => tagsStore.upsertTag(tag))
    close()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Something went wrong.'
    console.error('[AddCardModal] Card creation failed:', trimmed, err)
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

.modal__toggle {
  background: transparent;
  border: none;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  padding: 0;
  text-align: left;
  &:hover { text-decoration: underline; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
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
