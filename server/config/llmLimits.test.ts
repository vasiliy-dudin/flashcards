// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getLlmLimits } from './llmLimits.js'

const REQUIRED_ENV_VARS = ['GEMINI_RPM', 'GEMINI_RPD', 'GEMINI_BATCH_SIZE', 'GEMINI_QUEUE_WINDOW_MS'] as const

function setValidEnv(): void {
  process.env.GEMINI_RPM = '15'
  process.env.GEMINI_RPD = '1500'
  process.env.GEMINI_BATCH_SIZE = '6'
  process.env.GEMINI_QUEUE_WINDOW_MS = '2000'
}

describe('getLlmLimits', () => {
  beforeEach(() => {
    for (const name of REQUIRED_ENV_VARS) delete process.env[name]
  })

  afterEach(() => {
    for (const name of REQUIRED_ENV_VARS) delete process.env[name]
  })

  it('returns parsed limits when all env vars are set to valid positive integers', () => {
    setValidEnv()

    expect(getLlmLimits()).toEqual({ rpm: 15, rpd: 1500, batchSize: 6, queueWindowMs: 2000 })
  })

  it.each(REQUIRED_ENV_VARS)('throws when %s is missing', (missingVar) => {
    setValidEnv()
    delete process.env[missingVar]

    expect(() => getLlmLimits()).toThrow(`${missingVar} environment variable is not set`)
  })

  it('throws when an env var is not a positive integer', () => {
    setValidEnv()
    process.env.GEMINI_RPM = '0'

    expect(() => getLlmLimits()).toThrow('GEMINI_RPM environment variable must be a positive integer')
  })

  it('throws when an env var is not a number', () => {
    setValidEnv()
    process.env.GEMINI_BATCH_SIZE = 'abc'

    expect(() => getLlmLimits()).toThrow('GEMINI_BATCH_SIZE environment variable must be a positive integer')
  })
})
