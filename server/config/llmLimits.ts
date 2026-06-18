export interface LlmLimits {
  rpm: number
  rpd: number
  batchSize: number
  queueWindowMs: number
}

function readPositiveIntEnv(name: string): number {
  const raw = process.env[name]
  if (!raw) {
    throw new Error(`${name} environment variable is not set`)
  }
  const value = Number(raw)
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} environment variable must be a positive integer`)
  }
  return value
}

export function getLlmLimits(): LlmLimits {
  return {
    rpm: readPositiveIntEnv('GEMINI_RPM'),
    rpd: readPositiveIntEnv('GEMINI_RPD'),
    batchSize: readPositiveIntEnv('GEMINI_BATCH_SIZE'),
    queueWindowMs: readPositiveIntEnv('GEMINI_QUEUE_WINDOW_MS'),
  }
}
