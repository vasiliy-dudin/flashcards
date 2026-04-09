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

      <div class="settings-row settings-row--inputs">
        <label class="settings-field">
          <span class="settings-field__label">
            Remember multiplier
            <span class="settings-field__hint">Interval is multiplied by this on "Remember"</span>
          </span>
          <input
            class="settings-input settings-input--narrow"
            type="number"
            min="1"
            max="10"
            step="0.1"
            :value="settings.rememberMultiplier"
            @change="onRememberMultiplierChange(($event.target as HTMLInputElement).value)"
          />
        </label>

        <label class="settings-field">
          <span class="settings-field__label">
            Forgot multiplier
            <span class="settings-field__hint">Interval is multiplied by this on "Forget"</span>
          </span>
          <input
            class="settings-input settings-input--narrow"
            type="number"
            min="0.1"
            max="1"
            step="0.1"
            :value="settings.forgetMultiplier"
            @change="onForgetMultiplierChange(($event.target as HTMLInputElement).value)"
          />
        </label>

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
        <button class="settings-import-btn" @click="showImportModal = true">Import…</button>
      </div>
    </section>
  </main>

  <ImportMochiModal
    v-if="showImportModal"
    v-model="showImportModal"
    @imported="onImported"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '../stores/settings'
import { useCardsStore } from '../stores/cards'
import { useDecksStore } from '../stores/decks'
import { useTagsStore } from '../stores/tags'
import { fetchAllCards } from '../api/cards'
import { fetchAllDecks } from '../api/decks'
import { fetchAllTags } from '../api/tags'
import type { SettingsConfig } from '../types'
import type { MochiImportResult } from '../api/import'
import ImportMochiModal from '../components/ImportMochiModal.vue'

const settingsStore = useSettingsStore()
const cardsStore = useCardsStore()
const decksStore = useDecksStore()
const tagsStore = useTagsStore()
const { settings } = storeToRefs(settingsStore)

const showImportModal = ref(false)

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

function onRememberMultiplierChange(raw: string): void {
  const v = parseFloat(raw)
  if (!isNaN(v)) update('rememberMultiplier', v)
}

function onForgetMultiplierChange(raw: string): void {
  const v = parseFloat(raw)
  if (!isNaN(v)) update('forgetMultiplier', v)
}

function onMaxIntervalChange(raw: string): void {
  const v = parseInt(raw, 10)
  if (!isNaN(v)) update('maxIntervalDays', v)
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

.settings-import-btn {
  padding: var(--space-2) var(--space-4);
  background-color: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  white-space: nowrap;
  transition: border-color var(--transition-fast), color var(--transition-fast);
  flex-shrink: 0;

  &:hover {
    border-color: var(--color-primary);
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
