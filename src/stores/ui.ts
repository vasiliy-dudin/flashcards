import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ViewMode = 'grid' | 'table'

export const useUiStore = defineStore('ui', () => {
  const viewMode = ref<ViewMode>('grid')

  function setViewMode(mode: ViewMode): void {
    viewMode.value = mode
  }

  return { viewMode, setViewMode }
})
