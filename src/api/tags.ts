import type { Tag } from '../types'

export async function fetchAllTags(): Promise<Tag[]> {
  const res = await fetch('/api/tags')
  if (!res.ok) throw new Error(`Failed to fetch tags: ${res.status}`)
  return res.json() as Promise<Tag[]>
}
