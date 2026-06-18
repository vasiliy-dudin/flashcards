// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { retryWithBackoff } from './retryWithBackoff.js'

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('retries a failing operation and resolves once it succeeds', async () => {
    let attempts = 0
    const operation = async (): Promise<string> => {
      attempts++
      if (attempts < 3) throw new Error('fail')
      return 'success'
    }

    const promise = retryWithBackoff(operation, { maxAttempts: 5, isRetryable: () => true })
    await vi.runAllTimersAsync()

    await expect(promise).resolves.toBe('success')
    expect(attempts).toBe(3)
  })

  it('rejects with an error naming the attempt count once attempts are exhausted', async () => {
    let attempts = 0
    const operation = async (): Promise<never> => {
      attempts++
      throw new Error('persistent failure')
    }

    const promise = retryWithBackoff(operation, { maxAttempts: 3, isRetryable: () => true })
    const assertion = expect(promise).rejects.toThrow('3 attempts')
    await vi.runAllTimersAsync()
    await assertion

    expect(attempts).toBe(3)
  })

  it('fails fast without retrying when the error is not retryable', async () => {
    let attempts = 0
    const operation = async (): Promise<never> => {
      attempts++
      throw new Error('not retryable')
    }

    await expect(
      retryWithBackoff(operation, { maxAttempts: 5, isRetryable: () => false }),
    ).rejects.toThrow('not retryable')
    expect(attempts).toBe(1)
  })

  it('rejects immediately with a clear error when maxAttempts is less than 1, without calling fn', async () => {
    const operation = vi.fn()

    await expect(
      retryWithBackoff(operation, { maxAttempts: 0, isRetryable: () => true }),
    ).rejects.toThrow('maxAttempts must be at least 1')
    expect(operation).not.toHaveBeenCalled()
  })
})
