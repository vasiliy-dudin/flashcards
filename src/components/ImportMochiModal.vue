<template>
  <Teleport to="body">
    <div class="modal-overlay" @mousedown="onOverlayMouseDown" @mouseup="onOverlayMouseUp">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header class="modal__header">
          <h3 id="modal-title" class="modal__title">Import from Mochi Cards</h3>
          <button class="modal__close" aria-label="Close" :disabled="isLoading" @click="close">✕</button>
        </header>

        <div class="modal__body">
          <template v-if="result === null">
            <p class="modal__hint">Select a <strong>.zip</strong> or <strong>.mochi</strong> export file from Mochi Cards.</p>

            <label class="modal__file-label">
              <input
                type="file"
                accept=".zip,.mochi"
                class="modal__file-input"
                :disabled="isLoading"
                @change="onFileChange"
              />
              <span class="modal__file-btn" :class="{ 'is-disabled': isLoading }">
                {{ selectedFile ? selectedFile.name : 'Choose file…' }}
              </span>
            </label>

            <p v-if="error" class="modal__error">{{ error }}</p>

            <div class="modal__footer">
              <AppButton variant="secondary" :disabled="isLoading" @click="close">Cancel</AppButton>
              <AppButton variant="primary" :disabled="isLoading || selectedFile === null" @click="handleImport">
                {{ isLoading ? 'Importing…' : 'Import' }}
              </AppButton>
            </div>
          </template>

          <template v-else>
            <div class="modal__result">
              <p class="modal__result-row">
                <span class="modal__result-count modal__result-count--imported">{{ result.imported }}</span>
                cards imported
              </p>
              <p class="modal__result-row">
                <span class="modal__result-count modal__result-count--skipped">{{ result.skipped }}</span>
                cards skipped (already exist)
              </p>
            </div>

            <div class="modal__footer">
              <AppButton variant="primary" @click="close">Done</AppButton>
            </div>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { importMochiFile } from '../api/import'
import type { MochiImportResult } from '../api/import'
import AppButton from './AppButton.vue'

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'imported': [result: MochiImportResult]
}>()

const selectedFile = ref<File | null>(null)
const isLoading = ref(false)
const error = ref('')
const result = ref<MochiImportResult | null>(null)

function close(): void {
  if (isLoading.value) return
  emit('update:modelValue', false)
}

function onFileChange(e: Event): void {
  const input = e.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
  error.value = ''
}

async function handleImport(): Promise<void> {
  if (!selectedFile.value) return
  isLoading.value = true
  error.value = ''
  try {
    const importResult = await importMochiFile(selectedFile.value)
    result.value = importResult
    emit('imported', importResult)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Import failed.'
    console.error('[ImportMochiModal] Import failed:', err)
  } finally {
    isLoading.value = false
  }
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
  max-width: 420px;
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
  &:hover:not(:disabled) { color: var(--color-text); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
}

.modal__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5);
}

.modal__hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.modal__file-label {
  display: block;
}

.modal__file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.modal__file-btn {
  display: block;
  padding: var(--space-3);
  background-color: var(--color-surface-2);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  cursor: pointer;
  text-align: center;
  transition: border-color var(--transition-fast), color var(--transition-fast);

  &:hover:not(.is-disabled) {
    border-color: var(--color-primary);
    color: var(--color-text);
  }

  &.is-disabled {
    opacity: 0.5;
    cursor: not-allowed;
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


.modal__result {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.modal__result-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.modal__result-count {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  min-width: 2ch;
  text-align: right;

  &--imported { color: var(--color-primary); }
  &--skipped  { color: var(--color-text-muted); }
}
</style>
