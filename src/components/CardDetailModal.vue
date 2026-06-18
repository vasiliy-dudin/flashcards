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
            <div class="card-detail__section-header">
              <h3 class="card-detail__section-title">AI Example</h3>
              <AppButton
                variant="ghost"
                size="icon"
                aria-label="Regenerate AI example"
                :disabled="isRegeneratingExample"
                @click="handleRegenerateExample"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M13.65 4.35A6 6 0 1 0 14 8" />
                  <path d="M14 2v3h-3" />
                </svg>
              </AppButton>
            </div>
            <p class="card-detail__ai-example">
              <template v-for="(part, index) in aiExampleParts" :key="index">
                <strong v-if="part.bold">{{ part.text }}</strong>
                <template v-else>{{ part.text }}</template>
              </template>
            </p>
            <p v-if="regenerateExampleError" class="card-detail__error">{{ regenerateExampleError }}</p>
          </section>

          <section v-else class="card-detail__section">
            <AppButton variant="ghost" :disabled="isRegeneratingExample" @click="handleRegenerateExample">
              {{ isRegeneratingExample ? 'Generating…' : 'Generate AI data' }}
            </AppButton>
            <p v-if="regenerateExampleError" class="card-detail__error">{{ regenerateExampleError }}</p>
          </section>
        </div>

        <footer class="card-detail__footer">
          <div class="card-detail__meta">
            <span>Due: {{ formatDate(card.dueDate) }}</span>
            <span>Interval: {{ card.interval }}d</span>
          </div>
          <div class="card-detail__footer-actions">
            <AppButton variant="ghost" size="sm" @click="showEditModal = true">Edit</AppButton>
            <CardActionMenu
              :card="card"
              :show-edit="false"
              @deleted="close()"
              @updated="emit('card-updated', $event)"
            />
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
import { computed, ref, onMounted, onUnmounted } from 'vue'
import type { Card } from '../types'
import { formatDate } from '../utils/formatDate'
import { splitHighlight } from '../utils/highlightWord'
import { regenerateExample, generateContent } from '../api/cards'
import { useCardsStore } from '../stores/cards'
import { useSettingsStore } from '../stores/settings'
import CardEditModal from './CardEditModal.vue'
import CardActionMenu from './CardActionMenu.vue'
import AppButton from './AppButton.vue'

const props = defineProps<{ modelValue: boolean; card: Card }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'card-updated': [card: Card]
}>()

const cardsStore = useCardsStore()
const settingsStore = useSettingsStore()
const showEditModal = ref(false)
const isRegeneratingExample = ref(false)
const regenerateExampleError = ref('')

const aiExampleParts = computed(() => splitHighlight(props.card.aiExample, props.card.word))

async function handleRegenerateExample(): Promise<void> {
  if (isRegeneratingExample.value) return
  isRegeneratingExample.value = true
  regenerateExampleError.value = ''
  cardsStore.startGenerating(props.card.id)
  const customPrompt = settingsStore.settings.aiPrompt.trim() || undefined
  try {
    const updated = props.card.aiExample
      ? await regenerateExample(props.card.id, customPrompt)
      : await generateContent(props.card.id, customPrompt)
    emit('card-updated', updated)
  } catch (err) {
    regenerateExampleError.value = err instanceof Error ? err.message : 'Failed to regenerate example.'
    console.error('[CardDetailModal] regenerateExample failed:', props.card.id, err)
  } finally {
    cardsStore.stopGenerating(props.card.id)
    isRegeneratingExample.value = false
  }
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

function playAudio(): void {
  if (!props.card.audioUrl) return
  new Audio(props.card.audioUrl).play().catch(err => {
    console.error('[CardDetailModal] Audio playback failed:', props.card.word, err)
  })
}

function onCardSaved(updated: Card): void {
  showEditModal.value = false
  emit('card-updated', updated)
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && !showEditModal.value) close()
}

onMounted(() => document.addEventListener('keydown', handleKeydown))
onUnmounted(() => document.removeEventListener('keydown', handleKeydown))
</script>

<style lang="scss" scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-index-modal);
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

.card-detail__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.card-detail__error {
  font-size: var(--font-size-sm);
  color: var(--color-danger);
  background-color: color-mix(in srgb, var(--color-danger) 10%, transparent);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
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
</style>
