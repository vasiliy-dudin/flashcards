import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ViewMode = 'grid' | 'table'

export const useUiStore = defineStore('ui', () => {
  const viewMode = ref<ViewMode>('grid')
  const sidebarOpen = ref(false)

  function setViewMode(mode: ViewMode): void {
    viewMode.value = mode
  }

  function closeSidebar(): void {
    sidebarOpen.value = false
  }

  function toggleSidebar(): void {
    sidebarOpen.value = !sidebarOpen.value
  }

  return { viewMode, setViewMode, sidebarOpen, closeSidebar, toggleSidebar }
})
