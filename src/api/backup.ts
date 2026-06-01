import { type SettingsConfig, DEFAULT_SETTINGS } from '../types'
import { apiFetch } from './fetch'

export async function downloadBackup(settings: SettingsConfig): Promise<void> {
  const res = await apiFetch('/api/backup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings }),
  })
  if (!res.ok) {
    const message = await res.json().then((b: { error?: string }) => b.error, () => null)
    throw new Error(message ?? `Backup failed: ${res.status}`)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'flashcards-backup.zip'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export async function restoreFromBackup(file: File): Promise<SettingsConfig> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await apiFetch('/api/restore', { method: 'POST', body: formData })
  if (!res.ok) {
    const message = await res.json().then((b: { error?: string }) => b.error, () => null)
    throw new Error(message ?? `Restore failed: ${res.status}`)
  }
  const { settings } = await res.json() as { settings: Partial<SettingsConfig> }
  // Merge with defaults so new fields added after the backup was taken always have a value
  return { ...DEFAULT_SETTINGS, ...settings }
}
