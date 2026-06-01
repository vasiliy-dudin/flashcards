import { router } from '../router/index'
import { useAuthStore } from '../stores/auth'

export class SessionExpiredError extends Error {
  constructor() { super('Session expired') }
}

/** Fetch wrapper that intercepts 401 responses, clears auth state, and redirects to /login. */
export async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(url, options)
  if (res.status === 401) {
    useAuthStore().clearAuthState()
    router.push('/login').catch(() => undefined)
    throw new SessionExpiredError()
  }
  return res
}
