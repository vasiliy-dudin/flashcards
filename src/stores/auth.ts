import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'flashcards:authenticated'

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref<boolean>(localStorage.getItem(STORAGE_KEY) === 'true')

  async function login(password: string): Promise<void> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.status === 401) throw new Error('Invalid password')
    if (!res.ok) throw new Error(`Login failed: ${res.status}`)

    isAuthenticated.value = true
    localStorage.setItem(STORAGE_KEY, 'true')
  }

  function clearAuthState(): void {
    isAuthenticated.value = false
    localStorage.removeItem(STORAGE_KEY)
  }

  function logout(): void {
    clearAuthState()
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
  }

  async function initialize(): Promise<void> {
    if (!isAuthenticated.value || !navigator.onLine) return
    try {
      const res = await fetch('/api/auth/check')
      if (!res.ok) return
      const data = await res.json() as { authenticated: boolean }
      if (!data.authenticated) {
        clearAuthState()
      }
    } catch {
      // Network error — keep current state; subsequent API calls will surface 401 if needed
    }
  }

  return { isAuthenticated, login, logout, initialize, clearAuthState }
})
