import { getLlmLimits } from '../config/llmLimits.js'

const WINDOW_MS = 60_000

export class RateLimiter {
  private acquireTimestamps: number[] = []

  async acquire(): Promise<void> {
    const { rpm } = getLlmLimits()
    const now = Date.now()
    this.acquireTimestamps = this.acquireTimestamps.filter((timestamp) => now - timestamp < WINDOW_MS)

    if (this.acquireTimestamps.length < rpm) {
      this.acquireTimestamps.push(now)
      return
    }

    const oldestTimestamp = this.acquireTimestamps[0]
    const waitMs = oldestTimestamp + WINDOW_MS - now
    await new Promise((resolve) => setTimeout(resolve, waitMs))
    return this.acquire()
  }
}

export const rateLimiter = new RateLimiter()
