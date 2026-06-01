<template>
  <AppSelect
    aria-label="Sort order"
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event as SortValue)"
  >
    <option value="createdAt:desc">Newest first</option>
    <option value="createdAt:asc">Oldest first</option>
    <option value="word:asc">Word A→Z</option>
    <option value="word:desc">Word Z→A</option>
    <option value="dueDate:asc">Due date ↑</option>
    <option value="interval:asc">Interval ↑</option>
  </AppSelect>
</template>

<script setup lang="ts">
import type { SortValue } from '../types'
import AppSelect from './AppSelect.vue'

defineProps<{ modelValue: SortValue }>()
const emit = defineEmits<{ 'update:modelValue': [value: SortValue] }>()
</script>
