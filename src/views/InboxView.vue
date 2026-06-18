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
        <div class="inbox__card">
          <div class="inbox__card-front">
            <span v-if="!isReverse" class="inbox__word">{{ currentCard.word }}</span>
            <p v-else class="inbox__definition">{{ currentCard.definition }}</p>
          </div>
          <button v-if="!isRevealed" class="inbox__reveal-trigger" @click="revealCard">
            Show answer ▾
          </button>
          <div class="inbox__card-reveal" :class="{ 'is-revealed': isRevealed }">
            <div class="inbox__card-reveal-inner">
              <div class="inbox__reveal-section">
                <span v-if="isReverse" class="inbox__word">{{ currentCard.word }}</span>
                <p v-else class="inbox__reveal-text">{{ currentCard.definition }}</p>
              </div>

              <section v-if="currentCard.examples.length > 0" class="inbox__reveal-section">
                <h3 class="inbox__reveal-label">Examples</h3>
                <ul class="inbox__examples">
                  <li v-for="example in currentCard.examples" :key="example">{{ example }}</li>
                </ul>
              </section>

              <section v-if="currentCard.tags.length > 0" class="inbox__reveal-section">
                <h3 class="inbox__reveal-label">Tags</h3>
                <div class="inbox__reveal-tags">
                  <span v-for="tag in currentCard.tags" :key="tag" class="inbox__reveal-tag">{{ tag }}</span>
                </div>
              </section>

              <p v-if="currentCard.dictionary.transcription" class="inbox__reveal-transcription">
                {{ currentCard.dictionary.transcription }}
              </p>

              <section v-if="currentCard.dictionary.meanings.length > 0" class="inbox__reveal-section">
                <h3 class="inbox__reveal-label">Dictionary</h3>
                <ol class="inbox__reveal-meanings">
                  <li v-for="meaning in currentCard.dictionary.meanings" :key="meaning">{{ meaning }}</li>
                </ol>
              </section>

              <section v-if="currentCard.aiExample" class="inbox__reveal-section">
                <h3 class="inbox__reveal-label">AI Example</h3>
                <p class="inbox__notes">
                  <template v-for="(part, index) in aiExampleParts" :key="index">
                    <strong v-if="part.bold">{{ part.text }}</strong>
                    <template v-else>{{ part.text }}</template>
                  </template>
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>

      <div class="inbox__controls">
        <AppButton
          v-if="currentCard.audioUrl"
          variant="ghost-subtle"
          aria-label="Play pronunciation"
          @click.stop="playAudio"
        >▶ Play</AppButton>
        <CardActionMenu
          :card="(currentCard as Card)"
          size="md"
          @edit="editingCard = currentCard ?? null"
          @deleted="onCardDeleted"
          @updated="onCardUpdated"
        />
      </div>

      <div v-if="isRevealed" class="inbox__actions">
        <AppButton variant="danger" size="lg" class="inbox__action-btn" @click="submitReview(1)">Again</AppButton>
        <AppButton variant="secondary" size="lg" class="inbox__action-btn" @click="submitReview(2)">Hard</AppButton>
        <AppButton variant="success" size="lg" class="inbox__action-btn" @click="submitReview(3)">Good</AppButton>
        <AppButton variant="primary" size="lg" class="inbox__action-btn" @click="submitReview(4)">Easy</AppButton>
      </div>
    </template>
    <CardEditModal
      v-if="editingCard"
      :card="editingCard"
      @saved="onCardEditSaved"
      @close="editingCard = null"
    />
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Card } from '../types'
import AppButton from '../components/AppButton.vue'
import CardActionMenu from '../components/CardActionMenu.vue'
import CardEditModal from '../components/CardEditModal.vue'
import { useCardsStore } from '../stores/cards'
import { useSettingsStore } from '../stores/settings'
import { scheduleCardFsrs, type FsrsGrade } from '../utils/fsrs'
import { buildReviewQueue } from '../utils/buildReviewQueue'
import { splitHighlight } from '../utils/highlightWord'
import { updateCard as updateCardApi } from '../api/cards'
import { useOnline } from '../composables/useOnline'
import { addPendingReview } from '../lib/offline-store'
import { flushPendingReviews, FLUSH_REVIEWS_SYNC_TAG } from '../lib/sync'
import { loadAllData } from '../loadAllData'

const cardsStore = useCardsStore()
const settingsStore = useSettingsStore()
const { isOnline } = useOnline()

const queue = ref<Card[]>([])
const totalCount = ref(0)
const isRevealed = ref(false)
const persistError = ref('')
const editingCard = ref<Card | null>(null)

const currentCard = computed<Card | undefined>(() => queue.value[0])
const reviewedCount = computed<number>(() => totalCount.value - queue.value.length)
const isReverse = computed<boolean>(() => settingsStore.settings.reviewInReverse)
const aiExampleParts = computed(() => splitHighlight(currentCard.value?.aiExample ?? '', currentCard.value?.word ?? ''))

onMounted(async () => {
  if (isOnline.value) {
    try {
      await flushPendingReviews()
      await loadAllData()
    } catch (err) {
      console.error('[InboxView] Flush/reload failed on mount:', err)
    }
  }
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

function revealCard(): void {
  isRevealed.value = true
  if (settingsStore.settings.autoPlayAudio) playAudio()
}

async function registerBackgroundSync(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const sw = await navigator.serviceWorker.ready
  if ('sync' in sw) {
    await (sw.sync as { register: (tag: string) => Promise<void> }).register(FLUSH_REVIEWS_SYNC_TAG)
  }
}

type ReviewPatch = Pick<Card, 'interval' | 'dueDate' | 'stability' | 'difficulty'>

async function persistReview(card: Card, patch: ReviewPatch): Promise<boolean> {
  if (isOnline.value) {
    try {
      await updateCardApi(card.id, patch)
      return true
    } catch (err) {
      persistError.value = 'Could not save your review. Please try again.'
      console.error('[InboxView] Failed to persist card review:', card.id, err)
      return false
    }
  }
  try {
    await addPendingReview({
      cardId: card.id,
      interval: patch.interval,
      dueDate: patch.dueDate,
      reviewedAt: new Date().toISOString(),
      stability: patch.stability,
      difficulty: patch.difficulty,
    })
    await registerBackgroundSync()
    return true
  } catch (err) {
    persistError.value = 'Could not save your review. Please try again.'
    console.error('[InboxView] Failed to queue offline review:', card.id, err)
    return false
  }
}

async function submitReview(grade: FsrsGrade): Promise<void> {
  const card = queue.value[0]
  if (!card) return
  persistError.value = ''
  const patch = scheduleCardFsrs(card, grade, settingsStore.settings)
  if (!await persistReview(card, patch)) return
  cardsStore.updateCard(card.id, patch)
  queue.value = queue.value.slice(1)
  isRevealed.value = false
}

function onCardDeleted(): void {
  queue.value = queue.value.slice(1)
  totalCount.value = Math.max(0, totalCount.value - 1)
  isRevealed.value = false
}

function onCardUpdated(updated: Card): void {
  if (queue.value.length === 0) return
  if (updated.archived || !updated.inReview) {
    onCardDeleted()
  } else {
    queue.value = [updated, ...queue.value.slice(1)]
    isRevealed.value = false
  }
}

function onCardEditSaved(updated: Card): void {
  editingCard.value = null
  if (queue.value.length > 0 && queue.value[0].id === updated.id) {
    queue.value = [updated, ...queue.value.slice(1)]
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
  width: 100%;
  max-width: 640px;
}

.inbox__card {
  width: 100%;
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  overflow: hidden;
}

.inbox__card-front {
  padding: var(--space-6);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 140px;
}

.inbox__reveal-trigger {
  width: 100%;
  padding: var(--space-3) var(--space-6);
  border: none;
  border-top: 1px solid var(--color-border);
  background: none;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  cursor: pointer;
  text-align: center;
  user-select: none;

  &:hover {
    background-color: color-mix(in srgb, var(--color-text-muted) 6%, transparent);
    color: var(--color-text);
  }
}

.inbox__card-reveal {
  overflow: hidden;
  max-height: 0;

  &.is-revealed {
    max-height: 2000px;
    transition: max-height 0.35s ease;
  }
}

.inbox__card-reveal-inner {
  border-top: 1px solid var(--color-border);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.inbox__reveal-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.inbox__reveal-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.inbox__reveal-text {
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
}

.inbox__reveal-transcription {
  font-size: var(--font-size-base);
  color: var(--color-text-muted);
  font-style: italic;
}

.inbox__reveal-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.inbox__reveal-tag {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  background-color: var(--color-surface-2);
  padding: 1px var(--space-2);
  border-radius: var(--radius-full);
}

.inbox__reveal-meanings {
  margin: 0;
  padding-left: var(--space-4);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);

  li + li { margin-top: var(--space-1); }
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
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 36px;
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

@media (max-width: #{$bp-mobile}) {
  .inbox {
    padding: var(--space-4);
    gap: var(--space-4);
  }

  .inbox__header,
  .inbox__stage,
  .inbox__actions,
  .inbox__controls,
  .inbox__persist-error {
    max-width: 100%;
  }

  .inbox__word {
    font-size: var(--font-size-xl);
  }
}
</style>
