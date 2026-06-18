const BASE_DELAY_MS = 500
const MAX_JITTER_MS = 250

export interface RetryOptions {
  maxAttempts: number
  isRetryable: (error: unknown) => boolean
}

function backoffDelay(attempt: number): number {
  const exponential = BASE_DELAY_MS * 2 ** (attempt - 1)
  const jitter = Math.random() * MAX_JITTER_MS
  return exponential + jitter
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function retryWithBackoff<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const { maxAttempts, isRetryable } = options
  if (maxAttempts < 1) {
    throw new Error('retryWithBackoff: maxAttempts must be at least 1')
  }
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt === maxAttempts || !isRetryable(error)) {
        break
      }
      await delay(backoffDelay(attempt))
    }
  }

  const lastMessage = lastError instanceof Error ? lastError.message : String(lastError)
  throw new Error(`retryWithBackoff: failed after ${maxAttempts} attempts: ${lastMessage}`, { cause: lastError })
}
