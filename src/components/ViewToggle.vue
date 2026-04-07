<template>
  <div class="view-toggle">
    <button
      class="view-toggle__btn"
      :class="{ 'is-active': modelValue === 'grid' }"
      title="Grid view"
      @click="emit('update:modelValue', 'grid')"
    >▦</button>
    <button
      class="view-toggle__btn"
      :class="{ 'is-active': modelValue === 'table' }"
      title="Table view"
      @click="emit('update:modelValue', 'table')"
    >☰</button>
  </div>
</template>

<script setup lang="ts">
import type { ViewMode } from '../stores/ui'

defineProps<{ modelValue: ViewMode }>()
const emit = defineEmits<{ 'update:modelValue': [value: ViewMode] }>()
</script>

<style lang="scss" scoped>
.view-toggle {
  display: flex;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.view-toggle__btn {
  padding: var(--space-2) var(--space-3);
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: var(--font-size-base);
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
</style>
