import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { llmUsage } from '../db/schema.js'
import { getLlmLimits } from '../config/llmLimits.js'

export interface UsageCheckResult {
  allowed: boolean
  remaining: number
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function incrementAndCheck(): UsageCheckResult {
  const { rpd } = getLlmLimits()
  const date = todayDate()

  // Read-then-write is safe only because better-sqlite3 is synchronous: no `await` separates
  // this select from the write below, so no other call can interleave and race it.
  const existingRow = db.select().from(llmUsage).where(eq(llmUsage.date, date)).get()
  const currentCount = existingRow?.requestCount ?? 0

  if (currentCount >= rpd) {
    return { allowed: false, remaining: 0 }
  }

  const newCount = currentCount + 1
  if (existingRow) {
    db.update(llmUsage).set({ requestCount: newCount }).where(eq(llmUsage.date, date)).run()
  } else {
    db.insert(llmUsage).values({ date, requestCount: newCount }).run()
  }

  return { allowed: true, remaining: rpd - newCount }
}
