import { describe, expect, it, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSettingsStore } from './settings'
import { DEFAULT_SETTINGS } from '../types'

const STORAGE_KEY = 'flashcards:settings'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('useSettingsStore', () => {
  it('initialises with DEFAULT_SETTINGS when localStorage is empty', () => {
    const store = useSettingsStore()
    expect(store.settings).toEqual(DEFAULT_SETTINGS)
  })

  it('updateSettings merges a partial patch', () => {
    const store = useSettingsStore()
    store.updateSettings({ fsrsTargetRetention: 0.85 })
    expect(store.settings.fsrsTargetRetention).toBe(0.85)
    // other fields unchanged
    expect(store.settings.applyFuzzing).toBe(DEFAULT_SETTINGS.applyFuzzing)
  })

  it('updateSettings writes to localStorage', () => {
    const store = useSettingsStore()
    store.updateSettings({ maxIntervalDays: 180 })
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, unknown>
    expect(saved.maxIntervalDays).toBe(180)
  })

  it('restores saved settings from localStorage on init', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ fsrsTargetRetention: 0.95, applyFuzzing: false }))
    setActivePinia(createPinia())
    const store = useSettingsStore()
    expect(store.settings.fsrsTargetRetention).toBe(0.95)
    expect(store.settings.applyFuzzing).toBe(false)
    // fields not in storage fall back to defaults
    expect(store.settings.maxIntervalDays).toBe(DEFAULT_SETTINGS.maxIntervalDays)
  })

  it('falls back to DEFAULT_SETTINGS when localStorage contains invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not valid json{{')
    setActivePinia(createPinia())
    const store = useSettingsStore()
    expect(store.settings).toEqual(DEFAULT_SETTINGS)
  })

  it('autoPlayAudio defaults to false', () => {
    const store = useSettingsStore()
    expect(store.settings.autoPlayAudio).toBe(false)
  })

  it('autoPlayAudio can be toggled via updateSettings', () => {
    const store = useSettingsStore()
    store.updateSettings({ autoPlayAudio: true })
    expect(store.settings.autoPlayAudio).toBe(true)
    store.updateSettings({ autoPlayAudio: false })
    expect(store.settings.autoPlayAudio).toBe(false)
  })

  it('new fields added to DEFAULT_SETTINGS get their default value even if absent in stored JSON', () => {
    // Simulate an old stored object missing a new field
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ maxIntervalDays: 180 }))
    setActivePinia(createPinia())
    const store = useSettingsStore()
    // aiPrompt exists in DEFAULT_SETTINGS but not in the stored object
    expect(store.settings.aiPrompt).toBe(DEFAULT_SETTINGS.aiPrompt)
  })
})
