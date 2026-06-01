<template>
  <div class="sort-select-wrap">
    <select
      class="sort-select"
      aria-label="Sort order"
      :value="modelValue"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value as SortValue)"
    >
      <option value="createdAt:desc">Newest first</option>
      <option value="createdAt:asc">Oldest first</option>
      <option value="word:asc">Word A→Z</option>
      <option value="word:desc">Word Z→A</option>
      <option value="dueDate:asc">Due date ↑</option>
      <option value="interval:asc">Interval ↑</option>
    </select>
  </div>
</template>

<script setup lang="ts">
import type { SortValue } from '../types'
defineProps<{ modelValue: SortValue }>()
const emit = defineEmits<{ 'update:modelValue': [value: SortValue] }>()
</script>

<style lang="scss" scoped>
.sort-select-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  color: var(--color-text-muted);
  transition: color var(--transition-fast);

  &:has(.sort-select:hover),
  &:has(.sort-select:focus-visible) {
    color: var(--color-text);
  }

  &::after {
    content: '';
    position: absolute;
    right: var(--space-3);
    width: 0;
    height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 5px solid currentColor;
    pointer-events: none;
  }
}

.sort-select {
  appearance: none;
  padding: var(--space-2) var(--space-5) var(--space-2) var(--space-3);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: inherit;
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: border-color var(--transition-fast);

  &:hover,
  &:focus-visible {
    border-color: var(--color-primary);
    outline: none;
  }
}
</style>
