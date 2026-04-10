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

  function logout(): void {
    isAuthenticated.value = false
    localStorage.removeItem(STORAGE_KEY)
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
  }

  return { isAuthenticated, login, logout }
})
