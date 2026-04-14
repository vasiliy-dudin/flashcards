<template>
  <Teleport to="body">
    <div class="modal-overlay" @mousedown="onOverlayMouseDown" @mouseup="onOverlayMouseUp">
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
            Translation / Definition
            <input
              v-model="definition"
              class="modal__input"
              type="text"
              placeholder="e.g. lasting a very short time"
              :disabled="isLoading"
              required
            />
          </label>

          <label class="modal__label">
            Examples <span class="modal__hint">(optional, one per line)</span>
            <textarea
              v-model="examples"
              class="modal__input modal__input--textarea"
              placeholder="She kept meticulous records.&#10;It was an ephemeral moment."
              rows="3"
              :disabled="isLoading"
            />
          </label>

          <div class="modal__label">
            Tags
            <TagsInput v-model="tags" :suggestions="tagSuggestions" :disabled="isLoading" />
            <span class="modal__hint">Enter or comma to confirm each tag</span>
          </div>

          <p v-if="error" class="modal__error">{{ error }}</p>

          <div class="modal__footer">
            <AppButton variant="secondary" @click="close">Cancel</AppButton>
            <AppButton variant="primary" type="submit" :disabled="isLoading || !word.trim() || !definition.trim()">
              {{ isLoading ? 'Saving…' : 'Add card' }}
            </AppButton>
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
import { useSettingsStore } from '../stores/settings'
import { createCard } from '../api/cards'
import type { Card, DictionaryEntry } from '../types'
import TagsInput from './TagsInput.vue'
import AppButton from './AppButton.vue'

const props = defineProps<{ modelValue: boolean; deckId: string; initialTags?: string[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const cardsStore = useCardsStore()
const tagsStore = useTagsStore()
const settingsStore = useSettingsStore()

const tagSuggestions = computed((): string[] => tagsStore.tags.map(t => t.name))

const word = ref('')
const definition = ref('')
const examples = ref('')
const tags = ref<string[]>(props.initialTags ? [...props.initialTags] : [])
const isLoading = ref(false)
const error = ref('')

function close(): void {
  if (isLoading.value) return
  word.value = ''
  definition.value = ''
  examples.value = ''
  tags.value = []
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

interface AudioResponse { audioUrl?: string }

function isAudioResponse(v: unknown): v is AudioResponse {
  return typeof v === 'object' && v !== null
}

async function fetchCardContent(term: string): Promise<{ dictionary: DictionaryEntry; aiExample: string }> {
  const degraded: { dictionary: DictionaryEntry; aiExample: string } = {
    dictionary: { transcription: '', meanings: [] },
    aiExample: '',
  }
  try {
    const customPrompt = settingsStore.settings.aiPrompt.trim() || undefined
    const res = await fetch('/api/generate-card-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: term, customPrompt }),
    })
    if (!res.ok) return degraded
    const raw = await res.json() as { dictionary?: { transcription?: string; meanings?: string[] }; aiExample?: string }
    return {
      dictionary: { transcription: raw.dictionary?.transcription ?? '', meanings: raw.dictionary?.meanings ?? [] },
      aiExample: raw.aiExample ?? '',
    }
  } catch {
    return degraded
  }
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
  const trimmedWord = word.value.trim()
  const trimmedDefinition = definition.value.trim()
  if (!trimmedWord || !trimmedDefinition) return
  isLoading.value = true
  error.value = ''
  try {
    const [content, audioUrl] = await Promise.all([fetchCardContent(trimmedWord), fetchAudio(trimmedWord)])
    const today = new Date().toISOString().slice(0, 10)
    const card: Card = {
      id: crypto.randomUUID(),
      word: trimmedWord,
      definition: trimmedDefinition,
      examples: examples.value.split('\n').map(s => s.trim()).filter(Boolean),
      dictionary: content.dictionary,
      aiExample: content.aiExample,
      audioUrl,
      deckId: props.deckId,
      tags: tags.value,
      interval: 1,
      dueDate: today,
      createdAt: today,
      inReview: false,
      archived: false,
    }
    const saved = await createCard(card)
    cardsStore.addCard(saved)
    tags.value.forEach(tag => tagsStore.upsertTag(tag))
    isLoading.value = false
    close()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Something went wrong.'
    console.error('[AddCardModal] Card creation failed:', trimmedWord, err)
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

</style>
