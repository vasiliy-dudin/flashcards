// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { vi } from 'vitest'
import { RateLimiter } from './rateLimiter.js'

const REQUIRED_ENV_VARS = ['GEMINI_RPM', 'GEMINI_RPD', 'GEMINI_BATCH_SIZE', 'GEMINI_QUEUE_WINDOW_MS'] as const

function setEnv(rpm: number): void {
  process.env.GEMINI_RPM = String(rpm)
  process.env.GEMINI_RPD = '1500'
  process.env.GEMINI_BATCH_SIZE = '6'
  process.env.GEMINI_QUEUE_WINDOW_MS = '2000'
}

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    for (const name of REQUIRED_ENV_VARS) delete process.env[name]
  })

  it('resolves immediately for calls under the RPM cap in the trailing 60s', async () => {
    setEnv(2)
    const limiter = new RateLimiter()

    await limiter.acquire()
    await limiter.acquire()
    // Reaching here without advancing fake timers proves both resolved immediately.
  })

  it('blocks the call that would exceed RPM until the oldest timestamp ages out of the 60s window', async () => {
    setEnv(2)
    const limiter = new RateLimiter()

    await limiter.acquire()
    await limiter.acquire()

    let resolved = false
    limiter.acquire().then(() => { resolved = true })

    await vi.advanceTimersByTimeAsync(59_000)
    expect(resolved).toBe(false)

    await vi.advanceTimersByTimeAsync(2_000)
    expect(resolved).toBe(true)
  })

  it('keeps separate windows per instance', async () => {
    setEnv(1)
    const limiterA = new RateLimiter()
    const limiterB = new RateLimiter()

    await limiterA.acquire()

    let resolvedB = false
    limiterB.acquire().then(() => { resolvedB = true })
    await vi.advanceTimersByTimeAsync(0)
    expect(resolvedB).toBe(true)
  })
})
