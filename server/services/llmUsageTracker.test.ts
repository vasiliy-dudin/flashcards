// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { llmUsage } from '../db/schema.js'
import { incrementAndCheck } from './llmUsageTracker.js'

const TEST_DATE = '2099-01-01'
const REQUIRED_ENV_VARS = ['GEMINI_RPM', 'GEMINI_RPD', 'GEMINI_BATCH_SIZE', 'GEMINI_QUEUE_WINDOW_MS'] as const

function setEnv(rpd: number): void {
  process.env.GEMINI_RPM = '15'
  process.env.GEMINI_RPD = String(rpd)
  process.env.GEMINI_BATCH_SIZE = '6'
  process.env.GEMINI_QUEUE_WINDOW_MS = '2000'
}

function readTodayRow(): { date: string; requestCount: number } | undefined {
  return db.select().from(llmUsage).where(eq(llmUsage.date, TEST_DATE)).get()
}

describe('incrementAndCheck', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(TEST_DATE))
    db.delete(llmUsage).where(eq(llmUsage.date, TEST_DATE)).run()
  })

  afterEach(() => {
    db.delete(llmUsage).where(eq(llmUsage.date, TEST_DATE)).run()
    vi.useRealTimers()
    for (const name of REQUIRED_ENV_VARS) delete process.env[name]
  })

  it('allows requests and decrements remaining while under the daily cap', () => {
    setEnv(3)

    expect(incrementAndCheck()).toEqual({ allowed: true, remaining: 2 })
    expect(incrementAndCheck()).toEqual({ allowed: true, remaining: 1 })
    expect(incrementAndCheck()).toEqual({ allowed: true, remaining: 0 })
  })

  it('rejects once the daily cap is reached, without writing past it', () => {
    setEnv(2)

    incrementAndCheck()
    incrementAndCheck()
    expect(incrementAndCheck()).toEqual({ allowed: false, remaining: 0 })
    expect(readTodayRow()?.requestCount).toBe(2)
  })

  it('persists the count through the database row, not in-process state', () => {
    setEnv(5)

    incrementAndCheck()
    incrementAndCheck()

    expect(readTodayRow()?.requestCount).toBe(2)
  })
})
