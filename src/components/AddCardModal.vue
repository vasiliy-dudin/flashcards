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
              {{ isLoading ? 'Generating…' : 'Add card' }}
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
import { saveCard } from '../db/index'
import type { Card } from '../types'

const props = defineProps<{ modelValue: boolean; deckId: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const cardsStore = useCardsStore()

const word = ref('')
const isLoading = ref(false)
const error = ref('')

function close(): void {
  if (isLoading.value) return
  word.value = ''
  error.value = ''
  emit('update:modelValue', false)
}

interface ExamplesResponse {
  definition?: string
  examples?: string[]
  usageNotes?: string
}

interface AudioResponse {
  audioUrl?: string
}

function isExamplesResponse(value: unknown): value is ExamplesResponse {
  return typeof value === 'object' && value !== null
}

function isAudioResponse(value: unknown): value is AudioResponse {
  return typeof value === 'object' && value !== null
}

/** Fetches audio URL; returns null on any failure (degraded mode). */
async function fetchAudio(term: string): Promise<string | null> {
  try {
    const res = await fetch('/api/generate-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: term }),
    })
    if (!res.ok) {
      console.warn('[AddCardModal] Audio generation unavailable for:', term)
      return null
    }
    const raw: unknown = await res.json()
    return isAudioResponse(raw) ? (raw.audioUrl ?? null) : null
  } catch (err) {
    console.warn('[AddCardModal] Audio fetch failed:', term, err)
    return null
  }
}

async function handleSubmit(): Promise<void> {
  const trimmed = word.value.trim()
  if (!trimmed) return

  isLoading.value = true
  error.value = ''

  try {
    const examplesRes = await fetch('/api/generate-examples', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: trimmed }),
    })

    if (!examplesRes.ok) {
      throw new Error('Content generation is unavailable. Please try again later.')
    }

    const rawExamples: unknown = await examplesRes.json()
    if (!isExamplesResponse(rawExamples)) {
      throw new Error('Unexpected response from content generation service.')
    }
    const examples = rawExamples
    // Audio is optional — failure produces a card without audio (graceful degradation)
    const audioUrl = await fetchAudio(trimmed)

    const today = new Date().toISOString().slice(0, 10)
    const card: Card = {
      id: crypto.randomUUID(),
      word: trimmed,
      definition: examples.definition ?? '',
      examples: examples.examples ?? [],
      usageNotes: examples.usageNotes ?? '',
      audioUrl,
      deckId: props.deckId,
      tags: [],
      interval: 1,
      dueDate: today,
      createdAt: today,
    }

    cardsStore.addCard(card)
    await saveCard(card)

    if (audioUrl === null) {
      // Card saved — keep modal open so user sees the degradation notice
      word.value = ''
      error.value = 'Card saved without audio (audio service unavailable).'
    } else {
      close()
    }
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

  &:hover {
    color: var(--color-text);
  }
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
  padding: var(--space-3) var(--space-3);
  background-color: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: var(--font-size-base);
  outline: none;
  transition: border-color var(--transition-fast);

  &:focus {
    border-color: var(--color-primary);
  }

  &:disabled {
    opacity: 0.5;
  }
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

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &--cancel {
    background-color: var(--color-surface-2);
    color: var(--color-text-muted);

    &:hover:not(:disabled) {
      filter: brightness(1.2);
    }
  }

  &--submit {
    background-color: var(--color-primary);
    color: #fff;

    &:hover:not(:disabled) {
      filter: brightness(1.1);
    }
  }
}
</style>
