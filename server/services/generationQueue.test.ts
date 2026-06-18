// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { llmUsage } from '../db/schema.js'
import { GenerationQueue } from './generationQueue.js'
import { LlmHttpError } from './llm.js'
import type { LlmProvider, LlmResponse } from './llm.js'

const TEST_DATE = '2099-02-02'
const REQUIRED_ENV_VARS = ['GEMINI_RPM', 'GEMINI_RPD', 'GEMINI_BATCH_SIZE', 'GEMINI_QUEUE_WINDOW_MS'] as const

function setEnv(overrides: Partial<Record<(typeof REQUIRED_ENV_VARS)[number], string>> = {}): void {
  process.env.GEMINI_RPM = overrides.GEMINI_RPM ?? '1000'
  process.env.GEMINI_RPD = overrides.GEMINI_RPD ?? '1500'
  process.env.GEMINI_BATCH_SIZE = overrides.GEMINI_BATCH_SIZE ?? '5'
  process.env.GEMINI_QUEUE_WINDOW_MS = overrides.GEMINI_QUEUE_WINDOW_MS ?? '2000'
}

function makeResponse(word: string): LlmResponse {
  return {
    dictionary: { transcription: `/${word}/`, meanings: [`meaning of ${word}`] },
    aiExample: `Example sentence with ${word}.`,
  }
}

function makeFakeProvider(batchMock: LlmProvider['generateCardContentBatch']): LlmProvider {
  return { generateCardContent: vi.fn(), generateCardContentBatch: batchMock }
}

describe('GenerationQueue', () => {
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

  it('batches enqueue() calls within the window into a single provider call', async () => {
    setEnv()
    const words = ['alpha', 'beta', 'gamma']
    const batchMock = vi.fn(async (requestedWords: string[]) =>
      new Map(requestedWords.map((word) => [word, makeResponse(word)])),
    )
    const queue = new GenerationQueue(() => makeFakeProvider(batchMock))

    const promises = words.map((word) => queue.enqueue(word))
    await vi.advanceTimersByTimeAsync(2000)
    const results = await Promise.all(promises)

    expect(batchMock).toHaveBeenCalledTimes(1)
    expect(batchMock).toHaveBeenCalledWith(words, undefined)
    expect(results).toEqual(words.map((word) => makeResponse(word)))
  })

  it('flushes immediately once GEMINI_BATCH_SIZE is reached, without waiting for the window', async () => {
    setEnv({ GEMINI_BATCH_SIZE: '2' })
    const batchMock = vi.fn(async (requestedWords: string[]) =>
      new Map(requestedWords.map((word) => [word, makeResponse(word)])),
    )
    const queue = new GenerationQueue(() => makeFakeProvider(batchMock))

    const p1 = queue.enqueue('alpha')
    const p2 = queue.enqueue('beta')
    const [r1, r2] = await Promise.all([p1, p2])

    expect(batchMock).toHaveBeenCalledTimes(1)
    expect(r1).toEqual(makeResponse('alpha'))
    expect(r2).toEqual(makeResponse('beta'))
  })

  it('rejects all pending requests with a clear error when the daily cap is reached, without calling the provider', async () => {
    setEnv({ GEMINI_RPD: '1' })
    db.insert(llmUsage).values({ date: TEST_DATE, requestCount: 1 }).run()
    const batchMock = vi.fn()
    const queue = new GenerationQueue(() => makeFakeProvider(batchMock))

    const promise = queue.enqueue('alpha')
    const assertion = expect(promise).rejects.toThrow('Daily generation limit reached')
    await vi.advanceTimersByTimeAsync(2000)
    await assertion

    expect(batchMock).not.toHaveBeenCalled()
  })

  it('does not leak a pending entry into a later flush when getLlmLimits() throws during enqueue', async () => {
    // No env vars set yet — getLlmLimits() throws synchronously inside the Promise executor.
    const batchMock = vi.fn(async (requestedWords: string[]) =>
      new Map(requestedWords.map((word) => [word, makeResponse(word)])),
    )
    const queue = new GenerationQueue(() => makeFakeProvider(batchMock))

    await expect(queue.enqueue('orphan')).rejects.toThrow('environment variable is not set')

    setEnv()
    const promise = queue.enqueue('alpha')
    await vi.advanceTimersByTimeAsync(2000)
    await promise

    expect(batchMock).toHaveBeenCalledTimes(1)
    expect(batchMock).toHaveBeenCalledWith(['alpha'], undefined)
  })

  it('retries when the provider throws a retryable LlmHttpError (429), then resolves', async () => {
    setEnv()
    let attempts = 0
    const batchMock = vi.fn(async (requestedWords: string[]) => {
      attempts++
      if (attempts < 2) throw new LlmHttpError(429, 'Too Many Requests')
      return new Map(requestedWords.map((word) => [word, makeResponse(word)]))
    })
    const queue = new GenerationQueue(() => makeFakeProvider(batchMock))

    const promise = queue.enqueue('alpha')
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result).toEqual(makeResponse('alpha'))
    expect(attempts).toBe(2)
  })

  it('does not retry a non-retryable LlmHttpError (400) and rejects after a single attempt', async () => {
    setEnv()
    const batchMock = vi.fn(async () => {
      throw new LlmHttpError(400, 'Bad Request')
    })
    const queue = new GenerationQueue(() => makeFakeProvider(batchMock))

    const promise = queue.enqueue('alpha')
    const assertion = expect(promise).rejects.toThrow('failed after 3 attempts')
    await vi.runAllTimersAsync()
    await assertion

    expect(batchMock).toHaveBeenCalledTimes(1)
  })

  it('matches batch results back to pending requests even if the model changes case/whitespace on the returned word', async () => {
    setEnv()
    const batchMock = vi.fn(async (requestedWords: string[]) =>
      new Map(requestedWords.map((word) => [` ${word.toUpperCase()} `, makeResponse(word)])),
    )
    const queue = new GenerationQueue(() => makeFakeProvider(batchMock))

    const promise = queue.enqueue('alpha')
    const assertion = expect(promise).resolves.toEqual(makeResponse('alpha'))
    await vi.advanceTimersByTimeAsync(2000)
    await assertion
  })
})
