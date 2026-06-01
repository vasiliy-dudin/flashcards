import type { Tag } from '../types'
import { apiFetch } from './fetch'

export async function fetchAllTags(): Promise<Tag[]> {
  const res = await apiFetch('/api/tags')
  if (!res.ok) throw new Error(`Failed to fetch tags: ${res.status}`)
  return res.json() as Promise<Tag[]>
}
