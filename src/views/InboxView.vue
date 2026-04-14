<template>
  <main class="inbox">
    <header class="inbox__header">
      <h2 class="inbox__title">Inbox</h2>
      <span v-if="totalCount > 0" class="inbox__progress">
        {{ reviewedCount }} / {{ totalCount }}
      </span>
      <label class="inbox__autoplay-toggle">
        <input
          type="checkbox"
          :checked="settingsStore.settings.autoPlayAudio"
          @change="toggleAutoPlay"
        />
        Auto-play
      </label>
    </header>

    <p v-if="persistError" class="inbox__persist-error">{{ persistError }}</p>

    <div v-if="!currentCard" class="inbox__empty">
      <p class="inbox__empty-text">All done for today!</p>
      <p class="inbox__empty-sub">Come back tomorrow for more cards.</p>
    </div>

    <template v-else>
      <div class="inbox__stage">
        <div
          class="inbox__flipper"
          :class="{ 'is-flipped': isFlipped }"
          @click="flipCard"
        >
          <div class="inbox__face inbox__face--front">
            <span v-if="!isReverse" class="inbox__word">{{ currentCard.word }}</span>
            <p v-else class="inbox__definition">{{ currentCard.definition }}</p>
          </div>
          <div class="inbox__face inbox__face--back">
            <span class="inbox__word">{{ currentCard.word }}</span>
            <p class="inbox__definition">{{ currentCard.definition }}</p>
            <ul v-if="currentCard.examples.length > 0" class="inbox__examples">
              <li v-for="example in currentCard.examples" :key="example">{{ example }}</li>
            </ul>
            <p v-if="currentCard.aiExample" class="inbox__notes">
              {{ currentCard.aiExample }}
            </p>
          </div>
        </div>
      </div>

      <div class="inbox__controls">
        <button
          v-if="currentCard.audioUrl"
          class="inbox__play-btn"
          aria-label="Play pronunciation"
          @click.stop="playAudio"
        >
          ▶ Play
        </button>
      </div>

      <div v-if="isFlipped" class="inbox__actions">
        <AppButton variant="danger" size="lg" class="inbox__action-btn" @click="submitReview('forget')">Forget</AppButton>
        <AppButton variant="success" size="lg" class="inbox__action-btn" @click="submitReview('remember')">Remember</AppButton>
      </div>
      <p v-else class="inbox__hint">Click the card to reveal</p>
    </template>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Card } from '../types'
import AppButton from '../components/AppButton.vue'
import { useCardsStore } from '../stores/cards'
import { useSettingsStore } from '../stores/settings'
import { scheduleCard, type ReviewResult } from '../utils/scheduler'
import { buildReviewQueue } from '../utils/buildReviewQueue'
import { updateCard as updateCardApi } from '../api/cards'

const cardsStore = useCardsStore()
const settingsStore = useSettingsStore()

const queue = ref<Card[]>([])
const totalCount = ref(0)
const isFlipped = ref(false)
const persistError = ref('')

const currentCard = computed<Card | undefined>(() => queue.value[0])
const reviewedCount = computed<number>(() => totalCount.value - queue.value.length)
const isReverse = computed<boolean>(() => settingsStore.settings.reviewInReverse)

onMounted(() => {
  const today = new Date().toISOString().slice(0, 10)
  const due = buildReviewQueue(cardsStore.cards, today, settingsStore.settings)
  queue.value = due
  totalCount.value = due.length
})

function playAudio(): void {
  const url = currentCard.value?.audioUrl
  if (!url) return
  new Audio(url).play().catch(err => {
    console.error('[InboxView] Audio playback failed:', currentCard.value?.word, err)
  })
}

function toggleAutoPlay(): void {
  settingsStore.updateSettings({ autoPlayAudio: !settingsStore.settings.autoPlayAudio })
}

function flipCard(): void {
  if (isFlipped.value) return
  isFlipped.value = true
  if (settingsStore.settings.autoPlayAudio) playAudio()
}

async function submitReview(result: ReviewResult): Promise<void> {
  const card = queue.value[0]
  if (!card) return

  persistError.value = ''
  const patch = scheduleCard(card, result, settingsStore.settings)

  try {
    await updateCardApi(card.id, patch)
    cardsStore.updateCard(card.id, patch)
    queue.value = queue.value.slice(1)
    isFlipped.value = false
  } catch (err) {
    persistError.value = 'Could not save your review. Please try again.'
    console.error('[InboxView] Failed to persist card review:', card.id, err)
  }
}
</script>

<style lang="scss" scoped>
.inbox {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-6);
  gap: var(--space-5);
  height: 100%;
}

.inbox__header {
  width: 100%;
  max-width: 640px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.inbox__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
}

.inbox__progress {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.inbox__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-8);
}

.inbox__empty-text {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-medium);
}

.inbox__empty-sub {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.inbox__stage {
  perspective: 1200px;
  width: 100%;
  max-width: 640px;
}

.inbox__flipper {
  position: relative;
  height: var(--card-flip-height);
  transform-style: preserve-3d;
  transition: transform 0.4s ease;
  cursor: pointer;

  &.is-flipped {
    transform: rotateY(180deg);
  }
}

.inbox__face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  overflow-y: auto;
}

.inbox__face--front {
  align-items: center;
  justify-content: center;
}

.inbox__face--back {
  transform: rotateY(180deg);
}

.inbox__word {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
}

.inbox__definition {
  font-size: var(--font-size-base);
  line-height: var(--line-height-base);
}

.inbox__examples {
  list-style: disc inside;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);

  li {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }
}

.inbox__notes {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  font-style: italic;
}

.inbox__actions {
  display: flex;
  gap: var(--space-4);
  width: 100%;
  max-width: 640px;
}

.inbox__hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.inbox__autoplay-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  cursor: pointer;
  user-select: none;
}

.inbox__controls {
  width: 100%;
  max-width: 640px;
  display: flex;
  justify-content: center;
  min-height: 36px;
}

.inbox__play-btn {
  padding: var(--space-2) var(--space-4);
  background-color: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: color var(--transition-fast), border-color var(--transition-fast);
  &:hover {
    color: var(--color-primary);
    border-color: var(--color-primary);
  }
}

.inbox__persist-error {
  width: 100%;
  max-width: 640px;
  font-size: var(--font-size-sm);
  color: var(--color-danger);
  background-color: color-mix(in srgb, var(--color-danger) 10%, transparent);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
}

.inbox__action-btn {
  flex: 1;
  font-size: var(--font-size-base);
  border-radius: var(--radius-md);
}
</style>
