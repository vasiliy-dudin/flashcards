<template>
  <main class="settings-view">
    <h2 class="settings-view__title">Settings</h2>

    <section class="settings-section">
      <h3 class="settings-section__title">Appearance</h3>

      <div class="settings-field">
        <span class="settings-field__label">Theme</span>
        <div class="segmented-control">
          <button
            class="segmented-control__btn"
            :class="{ 'is-active': settings.theme === 'dark' }"
            @click="update('theme', 'dark')"
          >Dark</button>
          <button
            class="segmented-control__btn"
            :class="{ 'is-active': settings.theme === 'light' }"
            @click="update('theme', 'light')"
          >Light</button>
        </div>
      </div>
    </section>

    <section class="settings-section">
      <h3 class="settings-section__title">Algorithm</h3>

      <label class="settings-field settings-field--stacked">
        <span class="settings-field__label">
          Target retention rate
          <span class="settings-field__hint">Probability of recall at each review (0.5–0.99). Higher = more frequent reviews.</span>
        </span>
        <input
          class="settings-input settings-input--narrow"
          type="number"
          min="0.5"
          max="0.99"
          step="0.01"
          :value="settings.fsrsTargetRetention"
          @change="onFsrsRetentionChange(($event.target as HTMLInputElement).value)"
        />
      </label>

      <label class="settings-field settings-field--stacked">
        <span class="settings-field__label">
          Parameters
          <span class="settings-field__hint">21 space-separated values. Changing these affects how intervals are calculated.</span>
        </span>
        <textarea
          class="settings-input settings-input--textarea"
          rows="3"
          :value="settings.fsrsParameters.join(' ')"
          @change="onFsrsParametersChange(($event.target as HTMLInputElement).value)"
        />
        <p v-if="fsrsParametersError" class="settings-sync-meta settings-sync-meta--error">{{ fsrsParametersError }}</p>
      </label>

      <div class="settings-row settings-row--inputs">
        <label class="settings-field">
          <span class="settings-field__label">
            Max interval
            <span class="settings-field__hint">Maximum days between reviews</span>
          </span>
          <div class="settings-input-suffix">
            <input
              class="settings-input settings-input--narrow"
              type="number"
              min="1"
              max="3650"
              step="1"
              :value="settings.maxIntervalDays"
              @change="onMaxIntervalChange(($event.target as HTMLInputElement).value)"
            />
            <span class="settings-input-suffix__label">days</span>
          </div>
        </label>
      </div>

      <div class="settings-row settings-row--toggle">
        <div class="settings-toggle-field">
          <div>
            <p class="settings-toggle-field__name">Apply fuzzing</p>
            <p class="settings-toggle-field__desc">When enabled, this adds some random variation to due dates to prevent cards from sticking together.</p>
          </div>
          <label class="toggle">
            <input
              type="checkbox"
              class="toggle__input"
              :checked="settings.applyFuzzing"
              @change="update('applyFuzzing', ($event.target as HTMLInputElement).checked)"
            />
            <span class="toggle__track" />
          </label>
        </div>
      </div>
    </section>

    <section class="settings-section">
      <h3 class="settings-section__title">Review</h3>

      <div class="settings-toggle-field">
        <div>
          <p class="settings-toggle-field__name">Retire cards</p>
          <p class="settings-toggle-field__desc">When this is enabled, a card that is remembered at or above the max interval will no longer be scheduled for review.</p>
        </div>
        <label class="toggle">
          <input
            type="checkbox"
            class="toggle__input"
            :checked="settings.retireCards"
            @change="update('retireCards', ($event.target as HTMLInputElement).checked)"
          />
          <span class="toggle__track" />
        </label>
      </div>

      <div class="settings-toggle-field">
        <div>
          <p class="settings-toggle-field__name">Review cards in reverse</p>
          <p class="settings-toggle-field__desc">When this setting is on, cards will be reviewed from definition to word instead of word to definition.</p>
        </div>
        <label class="toggle">
          <input
            type="checkbox"
            class="toggle__input"
            :checked="settings.reviewInReverse"
            @change="update('reviewInReverse', ($event.target as HTMLInputElement).checked)"
          />
          <span class="toggle__track" />
        </label>
      </div>

      <label class="settings-field settings-field--stacked">
        <span class="settings-field__label">
          Limit new cards per day
          <span class="settings-field__hint">Leave empty to review all due cards. Only applies to cards with interval = 1.</span>
        </span>
        <input
          class="settings-input"
          type="number"
          min="1"
          step="1"
          placeholder="Unlimited"
          :value="settings.limitNewCardsPerDay ?? ''"
          @change="onLimitChange(($event.target as HTMLInputElement).value)"
        />
      </label>
    </section>

    <section class="settings-section">
      <h3 class="settings-section__title">AI generation</h3>

      <label class="settings-field settings-field--stacked">
        <span class="settings-field__label">
          Custom prompt
          <span class="settings-field__hint">Additional instructions appended to the AI prompt when generating card content. Leave blank to use the default.</span>
        </span>
        <textarea
          class="settings-input settings-input--textarea"
          rows="5"
          placeholder="e.g. Focus on formal British English usage. Avoid slang."
          :value="settings.aiPrompt"
          @input="update('aiPrompt', ($event.target as HTMLInputElement).value)"
        />
      </label>
    </section>

    <section class="settings-section">
      <h3 class="settings-section__title">Import</h3>

      <div class="settings-field">
        <div>
          <p class="settings-toggle-field__name">Mochi Cards</p>
          <p class="settings-toggle-field__desc">Import decks and cards from a Mochi Cards <code>.zip</code> or <code>.mochi</code> export file.</p>
        </div>
        <AppButton variant="ghost" class="settings__import-btn" @click="showImportModal = true">Import…</AppButton>
      </div>
    </section>

    <section class="settings-section">
      <h3 class="settings-section__title">Data</h3>

      <div class="settings-field">
        <div>
          <p class="settings-toggle-field__name">Export backup</p>
          <p class="settings-toggle-field__desc">Download a ZIP file containing all cards, decks, audio files, and settings.</p>
        </div>
        <AppButton variant="ghost" class="settings__import-btn" :disabled="backupInProgress" @click="handleExportBackup">
          {{ backupInProgress ? 'Exporting…' : 'Export…' }}
        </AppButton>
      </div>
      <p v-if="backupError" class="settings-sync-meta settings-sync-meta--error">{{ backupError }}</p>

      <div class="settings-field">
        <div>
          <p class="settings-toggle-field__name">Restore from backup</p>
          <p class="settings-toggle-field__desc">Replace all data with the contents of a previously exported backup ZIP. This cannot be undone.</p>
        </div>
        <input
          ref="restoreFileInput"
          type="file"
          accept=".zip"
          class="settings-file-input"
          @change="handleRestoreFileSelected"
        />
        <AppButton variant="ghost" class="settings__import-btn" :disabled="restoreInProgress" @click="restoreFileInput?.click()">
          {{ restoreInProgress ? 'Restoring…' : 'Restore…' }}
        </AppButton>
      </div>
      <p v-if="restoreError" class="settings-sync-meta settings-sync-meta--error">{{ restoreError }}</p>
    </section>

    <section class="settings-section">
      <h3 class="settings-section__title">Offline</h3>

      <div class="settings-field">
        <div>
          <p class="settings-toggle-field__name">Download for offline</p>
          <p class="settings-toggle-field__desc">Saves all cards, decks, and audio to your device so the app works without an internet connection.</p>
        </div>
        <AppButton
          variant="ghost"
          class="settings__import-btn"
          :disabled="syncInProgress || !isOnline"
          @click="startSync"
        >{{ syncButtonLabel }}</AppButton>
      </div>

      <p v-if="lastSynced" class="settings-sync-meta">
        Last synced: {{ formatSyncDate(lastSynced) }}
      </p>
      <p v-if="pendingCount > 0" class="settings-sync-meta settings-sync-meta--pending">
        {{ pendingCount }} pending review{{ pendingCount === 1 ? '' : 's' }} queued for upload
      </p>
      <p v-if="syncAudioMissed > 0" class="settings-sync-meta settings-sync-meta--pending">
        {{ syncAudioMissed }} audio file{{ syncAudioMissed === 1 ? '' : 's' }} could not be downloaded
      </p>
      <p v-if="syncError" class="settings-sync-meta settings-sync-meta--error">{{ syncError }}</p>
    </section>
  </main>

  <ImportMochiModal
    v-if="showImportModal"
    v-model="showImportModal"
    @imported="onImported"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '../stores/settings'
import { useCardsStore } from '../stores/cards'
import { useDecksStore } from '../stores/decks'
import { useTagsStore } from '../stores/tags'
import { fetchAllCards } from '../api/cards'
import { fetchAllDecks } from '../api/decks'
import { fetchAllTags } from '../api/tags'
import type { SettingsConfig } from '../types'
import { DEFAULT_SETTINGS } from '../types'
import type { MochiImportResult } from '../api/import'
import { downloadBackup, restoreFromBackup } from '../api/backup'
import ImportMochiModal from '../components/ImportMochiModal.vue'
import AppButton from '../components/AppButton.vue'
import { useOnline } from '../composables/useOnline'
import { downloadAll, LAST_SYNCED_KEY } from '../lib/sync'
import { loadPendingReviews } from '../lib/offline-store'

const settingsStore = useSettingsStore()
const cardsStore = useCardsStore()
const decksStore = useDecksStore()
const tagsStore = useTagsStore()
const { settings } = storeToRefs(settingsStore)
const { isOnline } = useOnline()

const showImportModal = ref(false)
const backupInProgress = ref(false)
const backupError = ref<string | null>(null)
const restoreInProgress = ref(false)
const restoreError = ref<string | null>(null)
const restoreFileInput = ref<HTMLInputElement | null>(null)
const syncInProgress = ref(false)
const syncAudioDone = ref(0)
const syncAudioTotal = ref(0)
const syncError = ref<string | null>(null)
const syncAudioMissed = ref(0)
const lastSynced = ref<string | null>(localStorage.getItem(LAST_SYNCED_KEY))
const pendingCount = ref(0)

const syncButtonLabel = computed<string>(() => {
  if (!syncInProgress.value) return 'Sync now'
  if (syncAudioTotal.value === 0) return 'Syncing…'
  return `Audio ${syncAudioDone.value} / ${syncAudioTotal.value}`
})

onMounted(async () => {
  const reviews = await loadPendingReviews()
  pendingCount.value = reviews.length
})

async function startSync(): Promise<void> {
  syncInProgress.value = true
  syncAudioDone.value = 0
  syncAudioTotal.value = 0
  syncError.value = null
  syncAudioMissed.value = 0
  try {
    const result = await downloadAll((done, total) => {
      syncAudioDone.value = done
      syncAudioTotal.value = total
    })
    syncAudioMissed.value = result.audioMissed
    lastSynced.value = localStorage.getItem(LAST_SYNCED_KEY)
    pendingCount.value = (await loadPendingReviews()).length
  } catch (err) {
    syncError.value = err instanceof Error ? err.message : 'Sync failed. Please try again.'
    console.error('[SettingsView] Sync failed:', err)
  } finally {
    syncInProgress.value = false
  }
}

async function handleExportBackup(): Promise<void> {
  backupInProgress.value = true
  backupError.value = null
  try {
    await downloadBackup(settings.value)
  } catch (err) {
    backupError.value = err instanceof Error ? err.message : 'Export failed. Please try again.'
    console.error('[SettingsView] Backup export failed:', err)
  } finally {
    backupInProgress.value = false
  }
}

async function handleRestoreFileSelected(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!window.confirm('This will replace all your cards, decks, and audio. This cannot be undone. Continue?')) {
    if (restoreFileInput.value) restoreFileInput.value.value = ''
    return
  }
  restoreInProgress.value = true
  restoreError.value = null
  try {
    const restoredSettings = await restoreFromBackup(file)
    settingsStore.updateSettings(restoredSettings)
    localStorage.removeItem(LAST_SYNCED_KEY)
    await downloadAll()
    lastSynced.value = localStorage.getItem(LAST_SYNCED_KEY)
    const [freshCards, freshDecks, freshTags] = await Promise.all([
      fetchAllCards(), fetchAllDecks(), fetchAllTags(),
    ])
    cardsStore.setCards(freshCards)
    decksStore.setDecks(freshDecks)
    tagsStore.setTags(freshTags)
  } catch (err) {
    restoreError.value = err instanceof Error ? err.message : 'Restore failed. Please try again.'
    console.error('[SettingsView] Restore failed:', err)
  } finally {
    restoreInProgress.value = false
    if (restoreFileInput.value) restoreFileInput.value.value = ''
  }
}

function formatSyncDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

async function onImported(_result: MochiImportResult): Promise<void> {
  const [freshCards, freshDecks, freshTags] = await Promise.all([
    fetchAllCards(), fetchAllDecks(), fetchAllTags(),
  ])
  cardsStore.setCards(freshCards)
  decksStore.setDecks(freshDecks)
  tagsStore.setTags(freshTags)
}

function update<K extends keyof SettingsConfig>(key: K, value: SettingsConfig[K]): void {
  settingsStore.updateSettings({ [key]: value } as Pick<SettingsConfig, K>)
}

function onLimitChange(raw: string): void {
  const parsed = parseInt(raw, 10)
  update('limitNewCardsPerDay', isNaN(parsed) || raw.trim() === '' ? null : Math.max(1, parsed))
}

function onMaxIntervalChange(raw: string): void {
  const v = parseInt(raw, 10)
  if (!isNaN(v)) update('maxIntervalDays', v)
}

const EXPECTED_PARAMETER_COUNT = DEFAULT_SETTINGS.fsrsParameters.length
const fsrsParametersError = ref<string | null>(null)

function onFsrsRetentionChange(raw: string): void {
  const v = parseFloat(raw)
  if (!isNaN(v)) update('fsrsTargetRetention', Math.min(0.99, Math.max(0.5, v)))
}

function onFsrsParametersChange(raw: string): void {
  const parts = raw.trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n))
  if (parts.length === EXPECTED_PARAMETER_COUNT) {
    fsrsParametersError.value = null
    update('fsrsParameters', parts)
  } else {
    fsrsParametersError.value = `Expected ${EXPECTED_PARAMETER_COUNT} values, got ${parts.length}.`
  }
}
</script>

<style lang="scss" scoped>
.settings-view {
  padding: var(--space-6);
  max-width: 640px;
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.settings-view__title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
}

.settings-section__title {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-1);
}

.settings-row--inputs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-5);
}

.settings-row--toggle {
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-4);
}

.settings-field {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  justify-content: space-between;

  &--stacked {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
    border-top: 1px solid var(--color-border);
    padding-top: var(--space-4);
  }
}

.settings-field__label {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.settings-field__hint {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-normal);
  color: var(--color-text-muted);
  max-width: 340px;
}

.settings-input {
  padding: var(--space-2) var(--space-3);
  background-color: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: var(--font-size-base);
  outline: none;
  width: 100%;
  transition: border-color var(--transition-fast);

  &:focus { border-color: var(--color-primary); }

  &--narrow { width: 80px; }

  &--textarea {
    resize: vertical;
    font-family: inherit;
    line-height: var(--line-height-base);
    width: 100%;
  }
}

.settings-input-suffix {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.settings-input-suffix__label {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  white-space: nowrap;
}

.settings-toggle-field {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-5);
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-4);

  &:first-child { border-top: none; padding-top: 0; }
}

.settings-toggle-field__name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  margin-bottom: var(--space-1);
}

.settings-toggle-field__desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  line-height: var(--line-height-base);
  max-width: 460px;
}

.settings__import-btn {
  flex-shrink: 0;
  white-space: nowrap;
}

.settings-file-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 0;
  height: 0;
}

.settings-sync-meta {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);

  &--pending {
    color: var(--color-warning, var(--color-text-muted));
  }

  &--error {
    color: var(--color-danger);
  }
}

// Segmented control
.segmented-control {
  display: flex;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.segmented-control__btn {
  padding: var(--space-2) var(--space-4);
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: background-color var(--transition-fast), color var(--transition-fast);

  &:hover {
    background-color: var(--color-surface-2);
    color: var(--color-text);
  }

  &.is-active {
    background-color: var(--color-surface-2);
    color: var(--color-primary);
  }
}


// Toggle switch
.toggle {
  position: relative;
  flex-shrink: 0;
  cursor: pointer;
}

.toggle__input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle__track {
  display: block;
  width: 40px;
  height: 22px;
  border-radius: var(--radius-full);
  background-color: var(--color-border);
  transition: background-color var(--transition-fast);
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 16px;
    height: 16px;
    border-radius: var(--radius-full);
    background-color: var(--color-text);
    transition: transform var(--transition-fast);
  }
}

.toggle__input:checked + .toggle__track {
  background-color: var(--color-primary);

  &::after {
    transform: translateX(18px);
  }
}
</style>
