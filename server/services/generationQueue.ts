import { getLlmLimits } from '../config/llmLimits.js'
import { createLlmProvider, LlmHttpError } from './llm.js'
import type { LlmProvider, LlmResponse } from './llm.js'
import { rateLimiter } from './rateLimiter.js'
import { incrementAndCheck } from './llmUsageTracker.js'
import { retryWithBackoff } from './retryWithBackoff.js'

const MAX_RETRY_ATTEMPTS = 3
const RATE_LIMIT_STATUS = 429
const SERVER_ERROR_STATUS_THRESHOLD = 500

interface PendingRequest {
  word: string
  customPrompt?: string
  resolve: (value: LlmResponse) => void
  reject: (reason: unknown) => void
}

function isRetryableLlmError(error: unknown): boolean {
  return error instanceof LlmHttpError && (error.status === RATE_LIMIT_STATUS || error.status >= SERVER_ERROR_STATUS_THRESHOLD)
}

function normalizeWordKey(word: string): string {
  return word.trim().toLowerCase()
}

function groupByCustomPrompt(items: PendingRequest[]): PendingRequest[][] {
  const groups = new Map<string, PendingRequest[]>()
  for (const item of items) {
    const key = item.customPrompt ?? ''
    const group = groups.get(key)
    if (group) {
      group.push(item)
    } else {
      groups.set(key, [item])
    }
  }
  return [...groups.values()]
}

export class GenerationQueue {
  private pending: PendingRequest[] = []
  private flushTimer: ReturnType<typeof setTimeout> | null = null

  constructor(private readonly createProvider: () => LlmProvider = createLlmProvider) {}

  async enqueue(word: string, customPrompt?: string): Promise<LlmResponse> {
    return new Promise<LlmResponse>((resolve, reject) => {
      const { batchSize, queueWindowMs } = getLlmLimits()
      this.pending.push({ word, customPrompt, resolve, reject })

      if (this.pending.length >= batchSize) {
        this.triggerFlush()
        return
      }
      if (!this.flushTimer) {
        this.flushTimer = setTimeout(() => this.triggerFlush(), queueWindowMs)
      }
    })
  }

  private triggerFlush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
    const batch = this.pending
    this.pending = []
    void this.flush(batch)
  }

  private async flush(batch: PendingRequest[]): Promise<void> {
    for (const group of groupByCustomPrompt(batch)) {
      await this.flushGroup(group)
    }
  }

  private async flushGroup(group: PendingRequest[]): Promise<void> {
    try {
      await rateLimiter.acquire()
      const { allowed } = incrementAndCheck()
      if (!allowed) {
        throw new Error('Daily generation limit reached')
      }

      const words = group.map((item) => item.word)
      const customPrompt = group[0].customPrompt
      const provider = this.createProvider()
      const results = await retryWithBackoff(
        () => provider.generateCardContentBatch(words, customPrompt),
        { maxAttempts: MAX_RETRY_ATTEMPTS, isRetryable: isRetryableLlmError },
      )
      const normalizedResults = new Map(
        [...results.entries()].map(([word, response]) => [normalizeWordKey(word), response] as const),
      )

      for (const item of group) {
        const result = normalizedResults.get(normalizeWordKey(item.word))
        if (result) {
          item.resolve(result)
        } else {
          item.reject(new Error(`No content returned for word: ${item.word}`))
        }
      }
    } catch (error) {
      const reason = error instanceof Error ? error : new Error(String(error))
      for (const item of group) item.reject(reason)
    }
  }
}

export const generationQueue = new GenerationQueue()
