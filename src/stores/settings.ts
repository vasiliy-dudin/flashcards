import { defineStore } from 'pinia'
import { ref } from 'vue'
import { type SettingsConfig, DEFAULT_SETTINGS } from '../types'

const STORAGE_KEY = 'flashcards:settings'

function loadFromStorage(): SettingsConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    // Merge with defaults so new fields added later always have a value
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<SettingsConfig>) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<SettingsConfig>(loadFromStorage())

  function updateSettings(patch: Partial<SettingsConfig>): void {
    settings.value = { ...settings.value, ...patch }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value))
  }

  return { settings, updateSettings }
})
